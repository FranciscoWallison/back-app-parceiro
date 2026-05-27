import { Injectable } from '@nestjs/common';
import { StatusProposta } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardDto } from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(corretorId: string): Promise<DashboardDto> {
    const grouped = await this.prisma.proposta.groupBy({
      by: ['status'],
      where: { corretorId },
      _count: { _all: true },
      _sum: { valorTotalCents: true },
    });

    const contadores: Record<StatusProposta, number> = {
      RASCUNHO: 0,
      SIMULADA: 0,
      AGUARDANDO_DOCS: 0,
      AGUARDANDO_ASSINATURA: 0,
      AGUARDANDO_PAGAMENTO: 0,
      TRANSMITIDA: 0,
      APROVADA: 0,
      RECUSADA: 0,
      CANCELADA: 0,
    };
    let total = 0;
    let valorEmAberto = 0;
    for (const g of grouped) {
      contadores[g.status] = g._count._all;
      total += g._count._all;
      if (
        g.status === StatusProposta.SIMULADA ||
        g.status === StatusProposta.AGUARDANDO_DOCS ||
        g.status === StatusProposta.AGUARDANDO_ASSINATURA ||
        g.status === StatusProposta.AGUARDANDO_PAGAMENTO ||
        g.status === StatusProposta.TRANSMITIDA
      ) {
        valorEmAberto += g._sum.valorTotalCents ?? 0;
      }
    }

    const ultimas = await this.prisma.proposta.findMany({
      where: { corretorId },
      orderBy: { atualizadaEm: 'desc' },
      take: 5,
      include: { plano: true, empresa: true, titulares: { take: 1 } },
    });

    return {
      total,
      valorEmAbertoCents: valorEmAberto,
      contadores,
      ultimas: ultimas.map((p) => ({
        id: p.id,
        numero: p.numero,
        tipo: p.tipo,
        status: p.status,
        valorTotalCents: p.valorTotalCents,
        planoNome: p.plano.nome,
        titularOuEmpresa:
          p.tipo === 'PME' && p.empresa
            ? p.empresa.razaoSocial
            : p.titulares[0]?.nome ?? '(sem titular)',
        atualizadaEm: p.atualizadaEm.toISOString(),
      })),
    };
  }
}
