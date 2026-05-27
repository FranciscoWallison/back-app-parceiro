import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MetodoPagamento,
  Plano,
  Prisma,
  StatusPagamento,
  StatusProposta,
  TipoDocumento,
  TipoProposta,
} from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { AntifraudeMockService } from '../cpf-mock/antifraude-mock.service';
import { CpfMockService } from '../cpf-mock/cpf-mock.service';
import { OcrMockService } from '../cpf-mock/ocr-mock.service';
import { PdfService } from '../pdf/pdf.service';
import { PlanosService } from '../planos/planos.service';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { StorageService } from '../storage/storage.service';
import { GerarPagamentoDto } from './dto/acoes.dto';
import { AssinarDto } from './dto/assinar.dto';
import { CriarPropostaDto } from './dto/criar-proposta.dto';
import { TitularInputDto } from './dto/nested.dto';
import { PropostaDetalheDto, PropostaResumoDto } from './dto/proposta-response.dto';

const TRANSITIONS: Record<StatusProposta, StatusProposta[]> = {
  RASCUNHO: ['SIMULADA', 'CANCELADA'],
  SIMULADA: ['AGUARDANDO_DOCS', 'RASCUNHO', 'CANCELADA'],
  AGUARDANDO_DOCS: ['AGUARDANDO_ASSINATURA', 'CANCELADA'],
  AGUARDANDO_ASSINATURA: ['AGUARDANDO_PAGAMENTO', 'CANCELADA'],
  AGUARDANDO_PAGAMENTO: ['TRANSMITIDA', 'CANCELADA'],
  TRANSMITIDA: ['APROVADA', 'RECUSADA'],
  APROVADA: [],
  RECUSADA: [],
  CANCELADA: [],
};

const FULL_INCLUDE = {
  plano: true,
  empresa: true,
  titulares: { include: { dependentes: true } },
  documentos: true,
  pagamentos: true,
  assinatura: true,
} as const;

type PropostaFull = Prisma.PropostaGetPayload<{ include: typeof FULL_INCLUDE }>;

@Injectable()
export class PropostasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planos: PlanosService,
    private readonly storage: StorageService,
    private readonly pdf: PdfService,
    private readonly push: PushService,
    private readonly cpfMock: CpfMockService,
    private readonly antifraude: AntifraudeMockService,
    private readonly ocr: OcrMockService,
  ) {}

  async criar(corretorId: string, dto: CriarPropostaDto): Promise<PropostaDetalheDto> {
    const plano = await this.planos.findById(dto.planoId);
    this.validarPayloadPorTipo(dto);
    await this.validarComMocks(dto);
    const valorTotal = this.calcularValorTotal(plano, dto);
    const created = await this.prisma.proposta.create({
      data: {
        tipo: dto.tipo,
        status: StatusProposta.RASCUNHO,
        corretorId,
        planoId: dto.planoId,
        valorTotalCents: valorTotal,
        observacoes: dto.observacoes,
        empresa:
          dto.tipo === TipoProposta.PME && dto.empresa
            ? { create: this.empresaCreate(dto.empresa) }
            : undefined,
        titulares: { create: this.titularesCreate(dto) },
      },
      include: FULL_INCLUDE,
    });
    return this.toDetalhe(created);
  }

  /** Roda mock de CPF (situação) + antifraude (score) em cada titular. */
  private async validarComMocks(dto: CriarPropostaDto): Promise<void> {
    if (process.env.CPF_SIMULADOR === 'false') return;
    const titulares =
      dto.tipo === TipoProposta.PF
        ? dto.titular
          ? [dto.titular]
          : []
        : dto.titulares ?? [];

    for (const t of titulares) {
      const consulta = await this.cpfMock.consultar(t.cpf);
      if (consulta.situacao !== 'REGULAR') {
        throw new BadRequestException(
          `CPF ${consulta.cpf} consta como ${consulta.situacao} na Receita Federal.`,
        );
      }
      const score = await this.antifraude.score(t.cpf);
      if (score.decisao === 'BLOQUEADO') {
        throw new BadRequestException(
          `CPF ${score.cpf} bloqueado por antifraude (score ${score.score}). Entre em contato com o suporte.`,
        );
      }
    }
  }

  async listar(
    corretorId: string,
    filtro: { status?: StatusProposta; tipo?: TipoProposta },
  ): Promise<PropostaResumoDto[]> {
    const items = await this.prisma.proposta.findMany({
      where: { corretorId, status: filtro.status, tipo: filtro.tipo },
      orderBy: { atualizadaEm: 'desc' },
      include: { plano: true, empresa: true, titulares: { take: 1 } },
    });
    return items.map((p) => this.toResumo(p));
  }

  async detalhe(corretorId: string, id: string): Promise<PropostaDetalheDto> {
    const p = await this.assertOwnership(corretorId, id);
    return this.toDetalhe(p);
  }

  async deletarRascunho(corretorId: string, id: string): Promise<void> {
    const p = await this.assertOwnership(corretorId, id);
    if (p.status !== StatusProposta.RASCUNHO && p.status !== StatusProposta.SIMULADA) {
      throw new BadRequestException(
        `Só é possível apagar propostas em RASCUNHO ou SIMULADA (atual: ${p.status}).`,
      );
    }
    await this.prisma.proposta.delete({ where: { id } });
  }

  async simular(corretorId: string, id: string): Promise<PropostaDetalheDto> {
    return this.transitar(corretorId, id, StatusProposta.SIMULADA, {
      simuladaEm: new Date(),
    });
  }

  async anexarDocumento(
    corretorId: string,
    id: string,
    tipo: TipoDocumento,
    arquivo: { buffer: Buffer; mimetype: string; originalname: string },
  ): Promise<PropostaDetalheDto> {
    const p = await this.assertOwnership(corretorId, id);
    if (
      p.status !== StatusProposta.SIMULADA &&
      p.status !== StatusProposta.AGUARDANDO_DOCS
    ) {
      throw new BadRequestException(
        `Documentos só em SIMULADA ou AGUARDANDO_DOCS (atual: ${p.status}).`,
      );
    }
    const safeName = arquivo.originalname.replace(/[^\w.\-]/g, '_');
    const key = `propostas/${id}/docs/${randomUUID()}-${safeName}`;
    const { size } = await this.storage.upload(key, arquivo.buffer, arquivo.mimetype);
    const ocrAtivo = process.env.OCR_SIMULADOR !== 'false';
    const dadosExtraidos = ocrAtivo
      ? (this.ocr.extrair(tipo, arquivo.originalname) as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull;
    await this.prisma.documentoProposta.create({
      data: {
        propostaId: id,
        tipo,
        nomeArquivo: arquivo.originalname,
        tamanhoBytes: size,
        urlMock: key,
        dadosExtraidos,
      },
    });
    if (p.status === StatusProposta.SIMULADA) {
      return this.transitar(corretorId, id, StatusProposta.AGUARDANDO_DOCS, {});
    }
    return this.detalhe(corretorId, id);
  }

  async urlDocumento(
    corretorId: string,
    propostaId: string,
    docId: string,
  ): Promise<{ url: string }> {
    await this.assertOwnership(corretorId, propostaId);
    const doc = await this.prisma.documentoProposta.findUnique({
      where: { id: docId },
    });
    if (!doc || doc.propostaId !== propostaId) {
      throw new NotFoundException('Documento não encontrado.');
    }
    const url = await this.storage.getPresignedDownloadUrl(doc.urlMock, 300);
    return { url };
  }

  async marcarDocsConcluidos(corretorId: string, id: string): Promise<PropostaDetalheDto> {
    return this.transitar(corretorId, id, StatusProposta.AGUARDANDO_ASSINATURA, {});
  }

  async assinar(
    corretorId: string,
    id: string,
    dto: AssinarDto,
  ): Promise<PropostaDetalheDto> {
    const p = await this.assertOwnership(corretorId, id);
    if (p.status !== StatusProposta.AGUARDANDO_ASSINATURA) {
      throw new BadRequestException(
        `Assinatura só em AGUARDANDO_ASSINATURA (atual: ${p.status}).`,
      );
    }
    const titular = p.titulares[0];
    const titularOuEmpresa =
      p.tipo === TipoProposta.PME && p.empresa
        ? p.empresa.razaoSocial
        : titular?.nome ?? '(sem titular)';

    const hash = createHash('sha256')
      .update(`${id}:${Date.now()}:${dto.assinaturaPngBase64.slice(0, 64)}`)
      .digest('hex');
    const timestampISO = new Date().toISOString();

    const pdfBytes = await this.pdf.gerarPropostaAssinada({
      numero: p.numero,
      tipo: p.tipo,
      planoNome: p.plano.nome,
      valorTotalCents: p.valorTotalCents,
      titularOuEmpresa,
      documentoTitular:
        p.tipo === TipoProposta.PME ? p.empresa?.cnpj : titular?.cpf,
      emailTitular: titular?.email,
      assinaturaPngBase64: dto.assinaturaPngBase64,
      hashAssinatura: hash,
      timestampISO,
    });

    const pdfKey = `propostas/${id}/contrato-assinado.pdf`;
    await this.storage.upload(pdfKey, Buffer.from(pdfBytes), 'application/pdf');

    await this.prisma.assinatura.upsert({
      where: { propostaId: id },
      create: { propostaId: id, hash, pdfKey, ipMock: '127.0.0.1' },
      update: { hash, pdfKey, assinadoEm: new Date() },
    });
    return this.transitar(corretorId, id, StatusProposta.AGUARDANDO_PAGAMENTO, {});
  }

  async urlAssinatura(corretorId: string, id: string): Promise<{ url: string }> {
    const p = await this.assertOwnership(corretorId, id);
    if (!p.assinatura?.pdfKey) {
      throw new NotFoundException('Proposta ainda não foi assinada.');
    }
    const url = await this.storage.getPresignedDownloadUrl(p.assinatura.pdfKey, 600);
    return { url };
  }

  async gerarPagamento(
    corretorId: string,
    id: string,
    dto: GerarPagamentoDto,
  ): Promise<PropostaDetalheDto> {
    const p = await this.assertOwnership(corretorId, id);
    if (p.status !== StatusProposta.AGUARDANDO_PAGAMENTO) {
      throw new BadRequestException(
        `Pagamento só em AGUARDANDO_PAGAMENTO (atual: ${p.status}).`,
      );
    }
    const existente = await this.prisma.pagamento.findFirst({
      where: { propostaId: id, status: StatusPagamento.AGUARDANDO },
    });
    if (existente) return this.detalhe(corretorId, id);

    const data =
      dto.metodo === MetodoPagamento.PIX
        ? this.gerarPixMock(p.valorTotalCents)
        : this.gerarBoletoMock(p.valorTotalCents);

    await this.prisma.pagamento.create({
      data: {
        propostaId: id,
        metodo: dto.metodo,
        valorCents: p.valorTotalCents,
        status: StatusPagamento.AGUARDANDO,
        vencimento: new Date(Date.now() + 3 * 24 * 3600 * 1000),
        ...data,
      },
    });
    return this.detalhe(corretorId, id);
  }

  async confirmarPagamento(corretorId: string, id: string): Promise<PropostaDetalheDto> {
    const p = await this.assertOwnership(corretorId, id);
    if (p.status !== StatusProposta.AGUARDANDO_PAGAMENTO) {
      throw new BadRequestException(
        `Confirmação só em AGUARDANDO_PAGAMENTO (atual: ${p.status}).`,
      );
    }
    const lastPay = await this.prisma.pagamento.findFirst({
      where: { propostaId: id },
      orderBy: { criadoEm: 'desc' },
    });
    if (lastPay) {
      await this.prisma.pagamento.update({
        where: { id: lastPay.id },
        data: { status: StatusPagamento.PAGO, pagoEm: new Date() },
      });
    }
    return this.transitar(corretorId, id, StatusProposta.TRANSMITIDA, {
      transmitidaEm: new Date(),
    });
  }

  async aprovar(corretorId: string, id: string): Promise<PropostaDetalheDto> {
    return this.transitar(corretorId, id, StatusProposta.APROVADA, {
      aprovadaEm: new Date(),
    });
  }

  async recusar(
    corretorId: string,
    id: string,
    motivo?: string,
  ): Promise<PropostaDetalheDto> {
    return this.transitar(corretorId, id, StatusProposta.RECUSADA, {
      recusadaEm: new Date(),
      motivoRecusa: motivo,
    });
  }

  async cancelar(corretorId: string, id: string): Promise<PropostaDetalheDto> {
    return this.transitar(corretorId, id, StatusProposta.CANCELADA, {});
  }

  // ---- Helpers ----

  private async transitar(
    corretorId: string,
    id: string,
    next: StatusProposta,
    extraData: Prisma.PropostaUpdateInput,
  ): Promise<PropostaDetalheDto> {
    const p = await this.assertOwnership(corretorId, id);
    this.ensureTransition(p.status, next);
    const updated = await this.prisma.proposta.update({
      where: { id },
      data: { status: next, ...extraData },
      include: FULL_INCLUDE,
    });
    void this.notificarMudancaStatus(updated);
    return this.toDetalhe(updated);
  }

  private async notificarMudancaStatus(
    proposta: PropostaFull,
  ): Promise<void> {
    const titulo = proposta.titulares[0]?.nome ?? '(sem titular)';
    const tituloOuEmpresa =
      proposta.tipo === TipoProposta.PME && proposta.empresa
        ? proposta.empresa.razaoSocial
        : titulo;
    const payloadBase = {
      data: {
        tipo: 'proposta',
        propostaId: proposta.id,
        numero: String(proposta.numero),
        status: proposta.status,
      },
    };
    const msgs: Record<string, { title: string; body: string } | null> = {
      TRANSMITIDA: {
        title: '📤 Proposta transmitida',
        body: `#${proposta.numero} — ${tituloOuEmpresa} foi transmitida à operadora.`,
      },
      APROVADA: {
        title: '✅ Proposta aprovada',
        body: `#${proposta.numero} — ${tituloOuEmpresa} foi aprovada!`,
      },
      RECUSADA: {
        title: '❌ Proposta recusada',
        body: `#${proposta.numero} — ${tituloOuEmpresa} foi recusada.${
          proposta.motivoRecusa ? ` Motivo: ${proposta.motivoRecusa}` : ''
        }`,
      },
    };
    const msg = msgs[proposta.status];
    if (!msg) return;
    try {
      await this.push.sendToUser(proposta.corretorId, { ...msg, ...payloadBase });
    } catch {
      // não bloqueia a transição se push falhar
    }
  }

  private ensureTransition(from: StatusProposta, to: StatusProposta): void {
    const allowed = TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Transição inválida: ${from} → ${to}. Permitidas: [${allowed.join(', ')}]`,
      );
    }
  }

  private async assertOwnership(corretorId: string, id: string): Promise<PropostaFull> {
    const p = await this.prisma.proposta.findUnique({
      where: { id },
      include: FULL_INCLUDE,
    });
    if (!p) throw new NotFoundException(`Proposta ${id} não encontrada.`);
    if (p.corretorId !== corretorId) throw new ForbiddenException();
    return p;
  }

  private validarPayloadPorTipo(dto: CriarPropostaDto): void {
    if (dto.tipo === TipoProposta.PF) {
      if (!dto.titular)
        throw new BadRequestException('Proposta PF requer um titular.');
    } else {
      if (!dto.empresa)
        throw new BadRequestException('Proposta PME requer dados de empresa.');
      if (!dto.titulares || dto.titulares.length === 0)
        throw new BadRequestException('Proposta PME requer ao menos 1 titular.');
    }
  }

  private calcularValorTotal(plano: Plano, dto: CriarPropostaDto): number {
    let total = 0;
    const titulares =
      dto.tipo === TipoProposta.PF
        ? dto.titular
          ? [dto.titular]
          : []
        : dto.titulares ?? [];
    for (const t of titulares) {
      total += plano.valorTitularCents;
      total += (t.dependentes?.length ?? 0) * plano.valorDependenteCents;
    }
    return total;
  }

  private empresaCreate(e: NonNullable<CriarPropostaDto['empresa']>) {
    return {
      cnpj: e.cnpj.replace(/\D/g, ''),
      razaoSocial: e.razaoSocial,
      nomeFantasia: e.nomeFantasia,
      emailContato: e.emailContato,
      telefone: e.telefone,
      cep: e.cep,
      logradouro: e.logradouro,
      numero: e.numero,
      complemento: e.complemento,
      bairro: e.bairro,
      cidade: e.cidade,
      uf: e.uf.toUpperCase(),
    };
  }

  private titularesCreate(dto: CriarPropostaDto) {
    const tits =
      dto.tipo === TipoProposta.PF
        ? dto.titular
          ? [dto.titular]
          : []
        : dto.titulares ?? [];
    return tits.map((t) => this.titularCreate(t));
  }

  private titularCreate(t: TitularInputDto) {
    return {
      cpf: t.cpf.replace(/\D/g, ''),
      nome: t.nome,
      dataNascimento: new Date(t.dataNascimento),
      email: t.email,
      telefone: t.telefone,
      cep: t.cep,
      logradouro: t.logradouro,
      numero: t.numero,
      complemento: t.complemento,
      bairro: t.bairro,
      cidade: t.cidade,
      uf: t.uf.toUpperCase(),
      declaracaoSaude: (t.declaracaoSaude as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      dependentes: {
        create:
          t.dependentes?.map((d) => ({
            cpf: d.cpf.replace(/\D/g, ''),
            nome: d.nome,
            dataNascimento: new Date(d.dataNascimento),
            parentesco: d.parentesco,
            declaracaoSaude:
              (d.declaracaoSaude as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          })) ?? [],
      },
    };
  }

  private gerarPixMock(valorCents: number) {
    const txid = randomUUID().replace(/-/g, '').slice(0, 25);
    const _valor = (valorCents / 100).toFixed(2);
    const copiaCola = `00020126360014BR.GOV.BCB.PIX0114${txid}5204000053039865802BR5913AppCorretorDev6009SAO PAULO62070503***6304MOCK`;
    return {
      qrCodeMock: copiaCola,
      copiaColaMock: copiaCola,
      linhaDigitavel: null as string | null,
    };
  }

  private gerarBoletoMock(_valorCents: number) {
    const linha = `34191.79001 ${randomUUID().slice(0, 5)}.${randomUUID().slice(0, 5)} 09999.999999 9 99999999999999`;
    return {
      qrCodeMock: null as string | null,
      copiaColaMock: null as string | null,
      linhaDigitavel: linha,
    };
  }

  private toResumo(p: any): PropostaResumoDto {
    return {
      id: p.id,
      numero: p.numero,
      tipo: p.tipo,
      status: p.status,
      planoNome: p.plano?.nome ?? '',
      valorTotalCents: p.valorTotalCents,
      titularOuEmpresa: this.tituloProposta(p),
      criadaEm: p.criadaEm.toISOString(),
      atualizadaEm: p.atualizadaEm.toISOString(),
    };
  }

  private toDetalhe(p: PropostaFull): PropostaDetalheDto {
    return { ...this.toResumo(p), payload: p };
  }

  private tituloProposta(p: any): string {
    if (p.tipo === TipoProposta.PME && p.empresa) return p.empresa.razaoSocial;
    return p.titulares?.[0]?.nome ?? '(sem titular)';
  }
}
