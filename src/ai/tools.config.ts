import { FunctionDeclaration, Type } from '@google/genai';

/**
 * Cada FunctionDeclaration descreve uma tool que o Gemini pode chamar.
 *
 * Por que separadas em arquivo dedicado: facilita auditar a whitelist (nada
 * fora desta lista é executável) e testar contratos via snapshot.
 */
export const TOOLS: FunctionDeclaration[] = [
  {
    name: 'listarPlanos',
    description:
      'Lista o catálogo de planos disponíveis (ODONTO e SAÚDE), com valor mensal por titular e por dependente, carência e descrição. Use ANTES de criar uma proposta para obter o planoId correto baseado no nome solicitado pelo usuário.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'validarCpf',
    description:
      'Consulta situação cadastral (mock) e score antifraude (mock) do CPF informado. Retorna nome do titular, data de nascimento estimada, situação (REGULAR/PENDENTE/IRREGULAR) e decisão antifraude (APROVADO/REVISAR/BLOQUEADO). Chame para CADA titular e dependente antes de criar proposta.',
    parameters: {
      type: Type.OBJECT,
      required: ['cpf'],
      properties: {
        cpf: { type: Type.STRING, description: 'CPF com 11 dígitos (com ou sem máscara).' },
      },
    },
  },
  {
    name: 'consultarCep',
    description:
      'Consulta o CEP via ViaCEP e retorna logradouro, bairro, cidade e UF. Use para preencher endereço antes de criar proposta, evitando pedir todos os campos ao usuário.',
    parameters: {
      type: Type.OBJECT,
      required: ['cep'],
      properties: {
        cep: { type: Type.STRING, description: 'CEP com 8 dígitos (com ou sem máscara).' },
      },
    },
  },
  {
    name: 'criarPropostaPF',
    description:
      'Cria uma proposta Pessoa Física no status RASCUNHO. Requer planoId (de listarPlanos), titular completo (cpf, nome, dataNascimento ISO YYYY-MM-DD, email, telefone, endereço completo) e opcionalmente dependentes. Após criar, chame simularProposta para avançar.',
    parameters: {
      type: Type.OBJECT,
      required: ['planoId', 'titular'],
      properties: {
        planoId: { type: Type.STRING, description: 'UUID do plano escolhido.' },
        titular: {
          type: Type.OBJECT,
          required: [
            'cpf', 'nome', 'dataNascimento', 'email', 'telefone',
            'cep', 'logradouro', 'numero', 'bairro', 'cidade', 'uf',
          ],
          properties: {
            cpf: { type: Type.STRING },
            nome: { type: Type.STRING },
            dataNascimento: { type: Type.STRING, description: 'ISO YYYY-MM-DD' },
            email: { type: Type.STRING },
            telefone: { type: Type.STRING },
            cep: { type: Type.STRING },
            logradouro: { type: Type.STRING },
            numero: { type: Type.STRING },
            complemento: { type: Type.STRING },
            bairro: { type: Type.STRING },
            cidade: { type: Type.STRING },
            uf: { type: Type.STRING, description: 'UF com 2 letras' },
          },
        },
        dependentes: {
          type: Type.ARRAY,
          description: 'Lista opcional de dependentes do titular.',
          items: {
            type: Type.OBJECT,
            required: ['cpf', 'nome', 'dataNascimento', 'parentesco'],
            properties: {
              cpf: { type: Type.STRING },
              nome: { type: Type.STRING },
              dataNascimento: { type: Type.STRING, description: 'ISO YYYY-MM-DD' },
              parentesco: {
                type: Type.STRING,
                description: 'CONJUGE | FILHO | PAI | MAE | OUTRO',
              },
            },
          },
        },
        observacoes: { type: Type.STRING },
      },
    },
  },
  {
    name: 'criarPropostaPME',
    description:
      'Cria uma proposta para Pequena/Média Empresa em RASCUNHO. Requer planoId, empresa (cnpj, razão social, nome fantasia, contato, endereço) e ao menos 1 titular (funcionário coberto). Após criar, chame simularProposta.',
    parameters: {
      type: Type.OBJECT,
      required: ['planoId', 'empresa', 'titulares'],
      properties: {
        planoId: { type: Type.STRING, description: 'UUID do plano.' },
        empresa: {
          type: Type.OBJECT,
          required: [
            'cnpj', 'razaoSocial', 'nomeFantasia', 'emailContato', 'telefone',
            'cep', 'logradouro', 'numero', 'bairro', 'cidade', 'uf',
          ],
          properties: {
            cnpj: { type: Type.STRING },
            razaoSocial: { type: Type.STRING },
            nomeFantasia: { type: Type.STRING },
            emailContato: { type: Type.STRING },
            telefone: { type: Type.STRING },
            cep: { type: Type.STRING },
            logradouro: { type: Type.STRING },
            numero: { type: Type.STRING },
            complemento: { type: Type.STRING },
            bairro: { type: Type.STRING },
            cidade: { type: Type.STRING },
            uf: { type: Type.STRING },
          },
        },
        titulares: {
          type: Type.ARRAY,
          minItems: '1',
          items: {
            type: Type.OBJECT,
            required: ['cpf', 'nome', 'dataNascimento', 'email', 'telefone'],
            properties: {
              cpf: { type: Type.STRING },
              nome: { type: Type.STRING },
              dataNascimento: { type: Type.STRING, description: 'ISO YYYY-MM-DD' },
              email: { type: Type.STRING },
              telefone: { type: Type.STRING },
            },
          },
        },
        observacoes: { type: Type.STRING },
      },
    },
  },
  {
    name: 'simularProposta',
    description:
      'Avança a proposta de RASCUNHO para SIMULADA (cálculo de valor mensal definitivo). Chame imediatamente após criarPropostaPF ou criarPropostaPME.',
    parameters: {
      type: Type.OBJECT,
      required: ['propostaId'],
      properties: {
        propostaId: { type: Type.STRING, description: 'UUID da proposta criada.' },
      },
    },
  },
  {
    name: 'listarPropostas',
    description:
      'Lista as propostas do corretor autenticado, com filtros opcionais por status e tipo. Retorna número, titular/empresa, plano, valor mensal e status.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: {
          type: Type.STRING,
          description:
            'RASCUNHO | SIMULADA | AGUARDANDO_DOCS | AGUARDANDO_ASSINATURA | AGUARDANDO_PAGAMENTO | TRANSMITIDA | APROVADA | RECUSADA | CANCELADA',
        },
        tipo: { type: Type.STRING, description: 'PF | PME' },
      },
    },
  },
  {
    name: 'detalheProposta',
    description:
      'Retorna o detalhe completo de uma proposta (status, plano, valor, titulares, empresa, documentos, pagamentos, assinatura).',
    parameters: {
      type: Type.OBJECT,
      required: ['propostaId'],
      properties: {
        propostaId: { type: Type.STRING, description: 'UUID da proposta.' },
      },
    },
  },
  {
    name: 'gerarPagamento',
    description:
      'Gera um pagamento PIX ou BOLETO para uma proposta que esteja em AGUARDANDO_PAGAMENTO. Retorna copia-e-cola PIX ou linha digitável do boleto. PIX confirma sozinho em ~30s (simulador), BOLETO em ~45s.',
    parameters: {
      type: Type.OBJECT,
      required: ['propostaId', 'metodo'],
      properties: {
        propostaId: { type: Type.STRING },
        metodo: { type: Type.STRING, description: 'PIX | BOLETO' },
      },
    },
  },
  {
    name: 'instruirAnexarDocumento',
    description:
      'Retorna instruções de como anexar uma foto de documento (RG, CNH, comprovante etc) — esta ação não é automatizável pelo chat porque exige a câmera e gesto do usuário. Use quando o usuário pedir para anexar documento.',
    parameters: {
      type: Type.OBJECT,
      required: ['propostaId'],
      properties: {
        propostaId: { type: Type.STRING },
        tipoDocumento: {
          type: Type.STRING,
          description: 'RG | CNH | COMPROVANTE_RESIDENCIA | CONTRATO_SOCIAL | CARTAO_CNPJ | OUTRO',
        },
      },
    },
  },
  {
    name: 'instruirAssinar',
    description:
      'Retorna instruções para o usuário assinar o contrato eletronicamente na tela do detalhe — exige gesto manual em canvas. Use quando o usuário pedir para assinar.',
    parameters: {
      type: Type.OBJECT,
      required: ['propostaId'],
      properties: {
        propostaId: { type: Type.STRING },
      },
    },
  },

  // ===========================================================================
  // Tools de NAVEGAÇÃO E EVENTOS DE UI (handoffs).
  // Estas tools NÃO mudam estado de negócio — só retornam um descriptor
  // { handoff: { kind, ... } } que o frontend (ChatHandoffResolver) executa.
  // ===========================================================================
  {
    name: 'abrirPropostaPorId',
    description:
      'Abre o detalhe de uma proposta no app, dado seu UUID. Prefira esta tool sobre detalheProposta quando o usuário quiser VER no app (não apenas listar dados).',
    parameters: {
      type: Type.OBJECT,
      required: ['propostaId'],
      properties: {
        propostaId: { type: Type.STRING, description: 'UUID da proposta.' },
      },
    },
  },
  {
    name: 'abrirPropostaPorNumero',
    description:
      'Abre o detalhe de uma proposta pelo seu número curto (ex: 1024). Use quando o usuário disser "abre a #1024" ou "mostra a proposta 1024".',
    parameters: {
      type: Type.OBJECT,
      required: ['numero'],
      properties: {
        numero: { type: Type.INTEGER, description: 'Número curto da proposta (campo "numero" na DB).' },
      },
    },
  },
  {
    name: 'abrirNovaPropostaPF',
    description:
      'Navega o app para o wizard de criar proposta Pessoa Física (5 passos). Use quando o usuário quiser PREENCHER manualmente em vez de pedir pra IA criar pela conversa.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'abrirNovaPropostaPME',
    description:
      'Navega o app para o wizard de criar proposta PME (4 passos). Idem: use quando o usuário quiser preencher manualmente.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'abrirListaPropostas',
    description:
      'Navega o app para a lista de propostas, opcionalmente com filtros pré-aplicados de status ou tipo. Use quando o usuário pedir "mostra minhas propostas aguardando documentos", "ver tudo PF", etc.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        filtroStatus: {
          type: Type.STRING,
          description:
            'Status do filtro: RASCUNHO | SIMULADA | AGUARDANDO_DOCS | AGUARDANDO_ASSINATURA | AGUARDANDO_PAGAMENTO | TRANSMITIDA | APROVADA | RECUSADA | CANCELADA',
        },
        filtroTipo: { type: Type.STRING, description: 'PF | PME' },
      },
    },
  },
  {
    name: 'abrirPainelAdmin',
    description:
      'Navega o app para o painel administrativo (lista de propostas TRANSMITIDAs aguardando aprovação manual).',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'abrirPerfil',
    description:
      'Navega o app para a tela de perfil. Pode focar em uma seção específica passando "focar".',
    parameters: {
      type: Type.OBJECT,
      properties: {
        focar: {
          type: Type.STRING,
          description: 'Seção do perfil para rolar até: biometria | push',
        },
      },
    },
  },
  {
    name: 'exibirToast',
    description:
      'Mostra um toast nativo na parte de baixo do app com uma mensagem curta. Use para feedback rápido — NÃO use para informações longas ou confirmações.',
    parameters: {
      type: Type.OBJECT,
      required: ['mensagem'],
      properties: {
        mensagem: { type: Type.STRING, description: 'Texto do toast (máx ~80 chars).' },
        tone: {
          type: Type.STRING,
          description: 'Cor do toast: success | warning | danger | info (default: info).',
        },
      },
    },
  },
  {
    name: 'realizarLogout',
    description:
      'Encerra a sessão do corretor e volta para a tela de login. Ação DESTRUTIVA — confirme em texto com o usuário antes de chamar ("Posso te deslogar?").',
    parameters: { type: Type.OBJECT, properties: {} },
  },
];

/** Whitelist de nomes — qualquer functionCall com nome fora disto é REJEITADA. */
export const TOOL_NAMES = new Set(TOOLS.map((t) => t.name as string));
