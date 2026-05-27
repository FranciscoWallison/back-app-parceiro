import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CorretoraStatus, Prisma, TipoMaterial, TipoPlano } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from './prisma.service';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    if (process.env.RUN_SEED !== 'true') {
      this.logger.log('RUN_SEED != true — pulando seed.');
      return;
    }
    this.logger.log('Rodando seed (idempotente)...');
    const corretoras = await this.seedCorretoras();
    await this.seedUsers(corretoras);
    await this.seedPlanos();
    await this.seedMateriais();
    await this.seedFaq();
    this.logger.log('Seed completo.');
  }

  private async seedCorretoras(): Promise<Map<string, string>> {
    const data: Prisma.CorretoraCreateInput[] = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        cnpj: '11222333000181',
        cnpjFormatado: '11.222.333/0001-81',
        razaoSocial: 'Corretora ACME Seguros Ltda',
        nomeFantasia: 'ACME Seguros',
        status: CorretoraStatus.APROVADA,
        susep: '10.2024.123456-7',
        email: 'contato@acmeseguros.com.br',
        telefone: '(11) 3456-7890',
        cidade: 'São Paulo',
        uf: 'SP',
        dataCadastro: new Date('2024-01-15T10:30:00.000Z'),
        dataAprovacao: new Date('2024-02-01T14:00:00.000Z'),
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        cnpj: '19131243000197',
        cnpjFormatado: '19.131.243/0001-97',
        razaoSocial: 'Corretora Beta Adesão S.A.',
        nomeFantasia: 'Beta Adesão',
        status: CorretoraStatus.APROVADA,
        susep: '10.2023.654321-3',
        email: 'comercial@betaadesao.com.br',
        telefone: '(21) 2233-4455',
        cidade: 'Rio de Janeiro',
        uf: 'RJ',
        dataCadastro: new Date('2023-08-10T09:00:00.000Z'),
        dataAprovacao: new Date('2023-09-01T16:45:00.000Z'),
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        cnpj: '45997418000153',
        cnpjFormatado: '45.997.418/0001-53',
        razaoSocial: 'Corretora Gamma Planos Ltda',
        nomeFantasia: 'Gamma Planos',
        status: CorretoraStatus.PENDENTE,
        susep: '10.2025.987654-1',
        email: 'cadastro@gammaplanos.com.br',
        telefone: '(31) 3344-5566',
        cidade: 'Belo Horizonte',
        uf: 'MG',
        dataCadastro: new Date('2025-03-20T11:15:00.000Z'),
        dataAprovacao: null,
      },
    ];

    const byCnpj = new Map<string, string>();
    for (const c of data) {
      const saved = await this.prisma.corretora.upsert({
        where: { cnpj: c.cnpj },
        update: {},
        create: c,
      });
      byCnpj.set(saved.cnpj, saved.id);
    }
    return byCnpj;
  }

  private async seedUsers(corretoras: Map<string, string>): Promise<void> {
    const senhaHash = await bcrypt.hash('senha123', 10);
    const acmeId = corretoras.get('11222333000181');
    const betaId = corretoras.get('19131243000197');
    if (!acmeId || !betaId) {
      this.logger.warn('Corretoras seedadas não encontradas — pulando users.');
      return;
    }

    const users: Prisma.UserCreateInput[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        cpf: '12345678909',
        nome: 'Carlos da Silva',
        email: 'carlos@acmeseguros.com.br',
        telefone: '(11) 91234-5678',
        senhaHash,
        ativo: true,
        criadoEm: new Date('2024-02-10T09:00:00.000Z'),
        corretora: { connect: { id: acmeId } },
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        cpf: '11144477735',
        nome: 'Maria Souza',
        email: 'maria@betaadesao.com.br',
        telefone: '(21) 98765-4321',
        senhaHash,
        ativo: true,
        criadoEm: new Date('2024-03-05T14:30:00.000Z'),
        corretora: { connect: { id: betaId } },
      },
    ];

    for (const u of users) {
      await this.prisma.user.upsert({
        where: { cpf: u.cpf as string },
        update: {},
        create: u,
      });
    }
  }

  private async seedPlanos(): Promise<void> {
    const planos: Prisma.PlanoCreateInput[] = [
      {
        id: 'aa111111-1111-1111-1111-111111111111',
        codigo: 'ODONTO-ESSENCIAL',
        nome: 'Odonto Essencial',
        tipo: TipoPlano.ODONTO,
        descricao:
          'Cobertura básica para consultas, limpeza e prevenção. Inclui rede credenciada nacional.',
        valorTitularCents: 4990,
        valorDependenteCents: 3990,
        carenciaMeses: 0,
        ativo: true,
      },
      {
        id: 'aa222222-2222-2222-2222-222222222222',
        codigo: 'ODONTO-PLUS',
        nome: 'Odonto Plus',
        tipo: TipoPlano.ODONTO,
        descricao:
          'Cobertura ampliada: tratamentos endodônticos, cirurgia oral menor, urgências 24h.',
        valorTitularCents: 7990,
        valorDependenteCents: 5990,
        carenciaMeses: 3,
        ativo: true,
      },
      {
        id: 'aa333333-3333-3333-3333-333333333333',
        codigo: 'ODONTO-PREMIUM',
        nome: 'Odonto Premium',
        tipo: TipoPlano.ODONTO,
        descricao:
          'Cobertura completa: ortodontia, próteses, implantes (com coparticipação), atendimento internacional.',
        valorTitularCents: 14990,
        valorDependenteCents: 11990,
        carenciaMeses: 6,
        ativo: true,
      },
    ];
    for (const p of planos) {
      await this.prisma.plano.upsert({
        where: { codigo: p.codigo },
        update: {
          nome: p.nome,
          descricao: p.descricao,
          valorTitularCents: p.valorTitularCents,
          valorDependenteCents: p.valorDependenteCents,
        },
        create: p,
      });
    }
  }

  private async seedMateriais(): Promise<void> {
    const items: Prisma.MaterialPromocionalCreateInput[] = [
      {
        id: 'bb111111-1111-1111-1111-111111111111',
        titulo: 'Folder Odonto Essencial',
        descricao: 'Material de divulgação do plano Odonto Essencial — PF e PME.',
        tipo: TipoMaterial.PDF,
        urlMock: '/mock-assets/folder-essencial.pdf',
        thumbnail: null,
        ordem: 1,
      },
      {
        id: 'bb222222-2222-2222-2222-222222222222',
        titulo: 'Comparativo de Planos 2026',
        descricao: 'Tabela comparativa Essencial × Plus × Premium para apresentação ao cliente.',
        tipo: TipoMaterial.PDF,
        urlMock: '/mock-assets/comparativo-2026.pdf',
        thumbnail: null,
        ordem: 2,
      },
      {
        id: 'bb333333-3333-3333-3333-333333333333',
        titulo: 'Banner para Redes Sociais',
        descricao: 'Pacote de imagens 1080×1080 e 1080×1920 para Instagram e Stories.',
        tipo: TipoMaterial.IMAGEM,
        urlMock: '/mock-assets/banner-redes.png',
        thumbnail: null,
        ordem: 3,
      },
    ];
    for (const m of items) {
      await this.prisma.materialPromocional.upsert({
        where: { id: m.id as string },
        update: {},
        create: m,
      });
    }
  }

  private async seedFaq(): Promise<void> {
    const items: Prisma.FaqItemCreateInput[] = [
      {
        id: 'cc111111-1111-1111-1111-111111111111',
        pergunta: 'Como criar uma nova proposta?',
        resposta:
          'Na tela inicial, toque em "Nova proposta" e siga os passos do wizard: dados do titular, dependentes (se houver), plano, declaração de saúde e revisão.',
        categoria: 'Propostas',
        ordem: 1,
      },
      {
        id: 'cc222222-2222-2222-2222-222222222222',
        pergunta: 'Qual a diferença entre os planos Essencial, Plus e Premium?',
        resposta:
          'Essencial cobre consultas e prevenção. Plus inclui endodontia e urgência 24h. Premium acrescenta ortodontia, próteses e implantes (com coparticipação).',
        categoria: 'Planos',
        ordem: 2,
      },
      {
        id: 'cc333333-3333-3333-3333-333333333333',
        pergunta: 'Como habilitar biometria no app?',
        resposta:
          'Após o primeiro login, na tela inicial clique em "Habilitar biometria". O Android pede sua impressão digital ou reconhecimento facial. Nas próximas vezes, basta usar a biometria para entrar.',
        categoria: 'Aplicativo',
        ordem: 3,
      },
      {
        id: 'cc444444-4444-4444-4444-444444444444',
        pergunta: 'Posso editar uma proposta já transmitida?',
        resposta:
          'Não. Propostas com status TRANSMITIDA, APROVADA ou RECUSADA ficam imutáveis. Você pode apenas visualizar ou cancelar (em casos específicos via suporte).',
        categoria: 'Propostas',
        ordem: 4,
      },
      {
        id: 'cc555555-5555-5555-5555-555555555555',
        pergunta: 'Como acompanhar o pagamento de uma proposta?',
        resposta:
          'Abra a proposta na lista e veja a aba "Pagamento". Para PIX, o status atualiza em até 1 minuto após o pagamento. Para boleto, em 1 dia útil.',
        categoria: 'Pagamento',
        ordem: 5,
      },
    ];
    for (const f of items) {
      await this.prisma.faqItem.upsert({
        where: { id: f.id as string },
        update: {},
        create: f,
      });
    }
  }
}
