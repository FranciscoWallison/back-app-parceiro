import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MetodoPagamento, StatusProposta, TipoDocumento, TipoProposta } from '@prisma/client';
import { AntifraudeMockService } from '../cpf-mock/antifraude-mock.service';
import { CpfMockService } from '../cpf-mock/cpf-mock.service';
import { PlanosService } from '../planos/planos.service';
import { CriarPropostaDto } from '../propostas/dto/criar-proposta.dto';
import { PropostasService } from '../propostas/propostas.service';
import { TOOL_NAMES } from './tools.config';

interface ViaCepResp {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
}

const onlyDigits = (s: string) => (s ?? '').replace(/\D/g, '');

@Injectable()
export class ToolDispatcher {
  private readonly logger = new Logger(ToolDispatcher.name);

  constructor(
    private readonly planos: PlanosService,
    private readonly cpfMock: CpfMockService,
    private readonly antifraude: AntifraudeMockService,
    private readonly propostas: PropostasService,
  ) {}

  /**
   * Roteia um function call do Gemini para o service interno correto.
   * Erros são SERIALIZADOS no retorno (não jogados) para que o LLM possa
   * incluir a mensagem na resposta ao usuário em vez de derrubar a request.
   */
  async dispatch(
    name: string,
    args: Record<string, unknown>,
    corretorId: string,
  ): Promise<unknown> {
    if (!TOOL_NAMES.has(name)) {
      this.logger.warn(`Tool fora da whitelist tentada: ${name}`);
      return { erro: `Tool '${name}' não está disponível. Operação recusada.` };
    }

    try {
      switch (name) {
        case 'listarPlanos':
          return await this.planos.findAll();

        case 'validarCpf': {
          const cpf = onlyDigits(String(args.cpf ?? ''));
          if (cpf.length !== 11) {
            return { erro: 'CPF inválido: precisa ter 11 dígitos.' };
          }
          const consulta = await this.cpfMock.consultar(cpf);
          const score = await this.antifraude.score(cpf);
          return {
            cpf,
            situacao: consulta.situacao,
            nomeEstimado: consulta.nome,
            dataNascimentoEstimada: consulta.dataNascimento,
            antifraude: {
              score: score.score,
              decisao: score.decisao,
            },
            pronto: consulta.situacao === 'REGULAR' && score.decisao !== 'BLOQUEADO',
          };
        }

        case 'consultarCep': {
          const cep = onlyDigits(String(args.cep ?? ''));
          if (cep.length !== 8) return { erro: 'CEP inválido: precisa ter 8 dígitos.' };
          const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
          if (!resp.ok) return { erro: `ViaCEP retornou HTTP ${resp.status}.` };
          const data = (await resp.json()) as ViaCepResp;
          if (data.erro) return { erro: 'CEP não encontrado.' };
          return {
            cep,
            logradouro: data.logradouro ?? '',
            bairro: data.bairro ?? '',
            cidade: data.localidade ?? '',
            uf: data.uf ?? '',
          };
        }

        case 'criarPropostaPF': {
          const dto = this.normalizarPF(args);
          const proposta = await this.propostas.criar(corretorId, dto);
          return this.resumoProposta(proposta);
        }

        case 'criarPropostaPME': {
          const dto = this.normalizarPME(args);
          const proposta = await this.propostas.criar(corretorId, dto);
          return this.resumoProposta(proposta);
        }

        case 'simularProposta': {
          const id = String(args.propostaId ?? '');
          if (!id) return { erro: 'propostaId obrigatório.' };
          const proposta = await this.propostas.simular(corretorId, id);
          return this.resumoProposta(proposta);
        }

        case 'listarPropostas': {
          const filtro: { status?: StatusProposta; tipo?: TipoProposta } = {};
          if (args.status) filtro.status = String(args.status) as StatusProposta;
          if (args.tipo) filtro.tipo = String(args.tipo) as TipoProposta;
          const lista = await this.propostas.listar(corretorId, filtro);
          return lista.map((p) => ({
            id: p.id,
            numero: p.numero,
            tipo: p.tipo,
            status: p.status,
            titularOuEmpresa: p.titularOuEmpresa,
            planoNome: p.planoNome,
            valorMensalCents: p.valorTotalCents,
            atualizadaEm: p.atualizadaEm,
          }));
        }

        case 'detalheProposta': {
          const id = String(args.propostaId ?? '');
          if (!id) return { erro: 'propostaId obrigatório.' };
          const p = await this.propostas.detalhe(corretorId, id);
          return this.resumoProposta(p);
        }

        case 'gerarPagamento': {
          const id = String(args.propostaId ?? '');
          const metodoStr = String(args.metodo ?? '').toUpperCase();
          if (!id) return { erro: 'propostaId obrigatório.' };
          if (metodoStr !== 'PIX' && metodoStr !== 'BOLETO') {
            return { erro: "metodo deve ser 'PIX' ou 'BOLETO'." };
          }
          const proposta = await this.propostas.gerarPagamento(corretorId, id, {
            metodo: metodoStr as MetodoPagamento,
          });
          const payload = (proposta.payload ?? {}) as {
            pagamentos?: Array<{
              metodo: string;
              copiaColaMock?: string;
              linhaDigitavel?: string;
              valorCents: number;
            }>;
          };
          const pagamentos = payload.pagamentos ?? [];
          const pag = pagamentos[pagamentos.length - 1];
          return {
            propostaId: proposta.id,
            status: proposta.status,
            pagamento: pag
              ? {
                  metodo: pag.metodo,
                  valorCents: pag.valorCents,
                  copiaColaMock: pag.copiaColaMock,
                  linhaDigitavel: pag.linhaDigitavel,
                }
              : null,
            instrucao:
              metodoStr === 'PIX'
                ? 'Mostre o código copia-e-cola ao cliente. PIX confirma sozinho em ~30s.'
                : 'Boleto confirma em ~45s pelo simulador.',
          };
        }

        case 'instruirAnexarDocumento': {
          const id = String(args.propostaId ?? '');
          const tipoStr = String(args.tipoDocumento ?? 'RG').toUpperCase();
          if (!id) return { erro: 'propostaId obrigatório.' };
          return {
            instrucao: `Vou abrir a câmera para você anexar o documento "${tipoStr as TipoDocumento}" na proposta #${id}. O OCR extrai os dados automaticamente.`,
            handoff: { kind: 'OPEN_CAMERA', propostaId: id, tipoDocumento: tipoStr },
          };
        }

        case 'instruirAssinar': {
          const id = String(args.propostaId ?? '');
          if (!id) return { erro: 'propostaId obrigatório.' };
          return {
            instrucao: `Vou abrir a tela de assinatura da proposta #${id}. Assine no canvas com o dedo.`,
            handoff: { kind: 'OPEN_SIGNATURE_MODAL', propostaId: id },
          };
        }

        // -----------------------------------------------------------------
        // Tools de NAVEGAÇÃO E EVENTOS DE UI — retornam handoff descriptor.
        // Frontend ChatHandoffResolver executa a ação (router, toast, etc).
        // -----------------------------------------------------------------
        case 'abrirPropostaPorId': {
          const id = String(args.propostaId ?? '');
          if (!id) return { erro: 'propostaId obrigatório.' };
          return {
            instrucao: `Abrindo a proposta #${id} no app…`,
            handoff: { kind: 'OPEN_PROPOSTA_DETALHE', propostaId: id },
          };
        }

        case 'abrirPropostaPorNumero': {
          const num = Number(args.numero ?? NaN);
          if (!Number.isInteger(num) || num <= 0) {
            return { erro: 'numero inválido — informe o número curto da proposta (inteiro positivo).' };
          }
          const lista = await this.propostas.listar(corretorId, {});
          const achada = lista.find((p) => p.numero === num);
          if (!achada) {
            return { erro: `Não encontrei nenhuma proposta com número ${num} para este corretor.` };
          }
          return {
            instrucao: `Abrindo #${achada.numero} (${achada.titularOuEmpresa})…`,
            handoff: { kind: 'OPEN_PROPOSTA_DETALHE', propostaId: achada.id },
          };
        }

        case 'abrirNovaPropostaPF':
          return {
            instrucao: 'Abrindo o wizard de Pessoa Física…',
            handoff: { kind: 'OPEN_WIZARD_PF' },
          };

        case 'abrirNovaPropostaPME':
          return {
            instrucao: 'Abrindo o wizard de PME…',
            handoff: { kind: 'OPEN_WIZARD_PME' },
          };

        case 'abrirListaPropostas': {
          const filtroStatus = args.filtroStatus ? String(args.filtroStatus) : undefined;
          const filtroTipo = args.filtroTipo ? String(args.filtroTipo) : undefined;
          const partes: string[] = [];
          if (filtroTipo) partes.push(`tipo ${filtroTipo}`);
          if (filtroStatus) partes.push(`status ${filtroStatus}`);
          const filtros = partes.length ? ` (${partes.join(', ')})` : '';
          return {
            instrucao: `Abrindo a lista de propostas${filtros}…`,
            handoff: {
              kind: 'OPEN_LISTA_PROPOSTAS',
              filtroStatus,
              filtroTipo,
            },
          };
        }

        case 'abrirPainelAdmin':
          return {
            instrucao: 'Abrindo o painel administrativo…',
            handoff: { kind: 'OPEN_ADMIN' },
          };

        case 'abrirPerfil': {
          const focar = args.focar ? String(args.focar) : undefined;
          return {
            instrucao: focar
              ? `Abrindo seu perfil na seção "${focar}"…`
              : 'Abrindo seu perfil…',
            handoff: { kind: 'OPEN_PERFIL', focar },
          };
        }

        case 'exibirToast': {
          const mensagem = String(args.mensagem ?? '').trim();
          if (!mensagem) return { erro: 'mensagem obrigatória.' };
          const toneRaw = String(args.tone ?? 'info').toLowerCase();
          const tone = ['success', 'warning', 'danger', 'info'].includes(toneRaw)
            ? toneRaw
            : 'info';
          return {
            instrucao: 'Toast exibido.',
            handoff: { kind: 'SHOW_TOAST', mensagem, tone },
          };
        }

        case 'realizarLogout':
          return {
            instrucao: 'Vou pedir confirmação antes de te deslogar.',
            handoff: { kind: 'DO_LOGOUT' },
          };

        default:
          return { erro: `Tool '${name}' não implementada.` };
      }
    } catch (err) {
      if (err instanceof BadRequestException) {
        return { erro: err.message };
      }
      this.logger.error(`Erro em tool ${name}: ${(err as Error).message}`);
      return { erro: (err as Error).message ?? 'Falha desconhecida na tool.' };
    }
  }

  private normalizarPF(args: Record<string, unknown>): CriarPropostaDto {
    const t = (args.titular ?? {}) as Record<string, string>;
    const deps = Array.isArray(args.dependentes)
      ? (args.dependentes as Array<Record<string, string>>).map((d) => ({
          cpf: onlyDigits(d.cpf ?? ''),
          nome: d.nome ?? '',
          dataNascimento: d.dataNascimento ?? '',
          parentesco: d.parentesco ?? 'OUTRO',
        }))
      : [];
    return {
      tipo: TipoProposta.PF,
      planoId: String(args.planoId ?? ''),
      observacoes: args.observacoes ? String(args.observacoes) : undefined,
      titular: {
        cpf: onlyDigits(t.cpf ?? ''),
        nome: t.nome ?? '',
        dataNascimento: t.dataNascimento ?? '',
        email: t.email ?? '',
        telefone: onlyDigits(t.telefone ?? ''),
        cep: onlyDigits(t.cep ?? ''),
        logradouro: t.logradouro ?? '',
        numero: t.numero ?? '',
        complemento: t.complemento ?? '',
        bairro: t.bairro ?? '',
        cidade: t.cidade ?? '',
        uf: (t.uf ?? '').toUpperCase().slice(0, 2),
        dependentes: deps,
      },
    } as CriarPropostaDto;
  }

  private normalizarPME(args: Record<string, unknown>): CriarPropostaDto {
    const e = (args.empresa ?? {}) as Record<string, string>;
    const titulares = Array.isArray(args.titulares)
      ? (args.titulares as Array<Record<string, string>>).map((t) => ({
          cpf: onlyDigits(t.cpf ?? ''),
          nome: t.nome ?? '',
          dataNascimento: t.dataNascimento ?? '',
          email: t.email ?? '',
          telefone: onlyDigits(t.telefone ?? ''),
          cep: onlyDigits(e.cep ?? ''),
          logradouro: e.logradouro ?? '',
          numero: e.numero ?? '',
          complemento: e.complemento ?? '',
          bairro: e.bairro ?? '',
          cidade: e.cidade ?? '',
          uf: (e.uf ?? '').toUpperCase().slice(0, 2),
        }))
      : [];
    return {
      tipo: TipoProposta.PME,
      planoId: String(args.planoId ?? ''),
      observacoes: args.observacoes ? String(args.observacoes) : undefined,
      empresa: {
        cnpj: onlyDigits(e.cnpj ?? ''),
        razaoSocial: e.razaoSocial ?? '',
        nomeFantasia: e.nomeFantasia ?? '',
        emailContato: e.emailContato ?? '',
        telefone: onlyDigits(e.telefone ?? ''),
        cep: onlyDigits(e.cep ?? ''),
        logradouro: e.logradouro ?? '',
        numero: e.numero ?? '',
        complemento: e.complemento ?? '',
        bairro: e.bairro ?? '',
        cidade: e.cidade ?? '',
        uf: (e.uf ?? '').toUpperCase().slice(0, 2),
      },
      titulares,
    } as CriarPropostaDto;
  }

  private resumoProposta(p: {
    id: string;
    numero: number;
    status: string;
    tipo: string;
    valorTotalCents: number;
    planoNome: string;
    titularOuEmpresa: string;
  }): Record<string, unknown> {
    return {
      id: p.id,
      numero: p.numero,
      status: p.status,
      tipo: p.tipo,
      valorMensalCents: p.valorTotalCents,
      planoNome: p.planoNome,
      titularOuEmpresa: p.titularOuEmpresa,
    };
  }
}
