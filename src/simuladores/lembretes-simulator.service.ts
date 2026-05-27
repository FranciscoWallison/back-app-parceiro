import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StatusProposta, TipoProposta } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

const HORAS_ABANDONO = 24;
const DIAS_RENOVACAO = 330;

@Injectable()
export class LembretesSimulatorService {
  private readonly logger = new Logger(LembretesSimulatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  /** Carrinho abandonado — diariamente às 09h. */
  @Cron('0 0 9 * * *')
  async carrinhoAbandonado(): Promise<void> {
    if (process.env.LEMBRETES_SIMULADOR === 'false') return;
    const limite = new Date(Date.now() - HORAS_ABANDONO * 60 * 60 * 1000);

    const rascunhos = await this.prisma.proposta.findMany({
      where: {
        status: { in: [StatusProposta.RASCUNHO, StatusProposta.SIMULADA] },
        atualizadaEm: { lte: limite },
      },
      include: { titulares: { take: 1 }, empresa: true },
    });
    if (rascunhos.length === 0) return;

    let enviados = 0;
    for (const p of rascunhos) {
      const titulo =
        p.tipo === TipoProposta.PME && p.empresa
          ? p.empresa.razaoSocial
          : p.titulares[0]?.nome ?? 'cliente';
      try {
        await this.push.sendToUser(p.corretorId, {
          title: '💡 Proposta não finalizada',
          body: `A proposta de ${titulo} está pronta para continuar.`,
          data: {
            tipo: 'proposta',
            propostaId: p.id,
            numero: String(p.numero),
          },
        });
        enviados++;
      } catch {
        /* */
      }
    }
    this.logger.log(
      `🤖 Lembrete: ${enviados}/${rascunhos.length} rascunhos abandonados → push enviado`,
    );
  }

  /** Renovação — diariamente às 10h. Propostas aprovadas há ~11 meses. */
  @Cron('0 0 10 * * *')
  async renovacao(): Promise<void> {
    if (process.env.LEMBRETES_SIMULADOR === 'false') return;
    const inicio = new Date(Date.now() - (DIAS_RENOVACAO + 1) * 24 * 60 * 60 * 1000);
    const fim = new Date(Date.now() - DIAS_RENOVACAO * 24 * 60 * 60 * 1000);

    const aniversariantes = await this.prisma.proposta.findMany({
      where: {
        status: StatusProposta.APROVADA,
        aprovadaEm: { gte: inicio, lte: fim },
      },
      include: { titulares: { take: 1 }, empresa: true },
    });
    if (aniversariantes.length === 0) return;

    let enviados = 0;
    for (const p of aniversariantes) {
      const titulo =
        p.tipo === TipoProposta.PME && p.empresa
          ? p.empresa.razaoSocial
          : p.titulares[0]?.nome ?? 'cliente';
      try {
        await this.push.sendToUser(p.corretorId, {
          title: '🔁 Hora de renovar',
          body: `A proposta de ${titulo} faz aniversário em breve.`,
          data: {
            tipo: 'proposta',
            propostaId: p.id,
            numero: String(p.numero),
          },
        });
        enviados++;
      } catch {
        /* */
      }
    }
    this.logger.log(
      `🤖 Lembrete renovação: ${enviados}/${aniversariantes.length} propostas → push enviado`,
    );
  }
}
