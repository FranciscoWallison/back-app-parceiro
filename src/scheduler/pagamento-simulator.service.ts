import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  MetodoPagamento,
  StatusPagamento,
  StatusProposta,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

const CONFIRMACAO_PIX_MS = 30_000;
const CONFIRMACAO_BOLETO_MS = 45_000;

@Injectable()
export class PagamentoSimulatorService {
  private readonly logger = new Logger(PagamentoSimulatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async confirmarPagamentosPendentes(): Promise<void> {
    if (process.env.PAGAMENTO_SIMULADOR === 'false') return;

    const pendentes = await this.prisma.pagamento.findMany({
      where: { status: StatusPagamento.AGUARDANDO },
      include: { proposta: true },
    });
    const agora = Date.now();

    for (const pag of pendentes) {
      if (pag.proposta.status !== StatusProposta.AGUARDANDO_PAGAMENTO) continue;
      const thresholdMs =
        pag.metodo === MetodoPagamento.PIX
          ? CONFIRMACAO_PIX_MS
          : CONFIRMACAO_BOLETO_MS;
      if (agora - pag.criadoEm.getTime() < thresholdMs) continue;

      await this.prisma.$transaction([
        this.prisma.pagamento.update({
          where: { id: pag.id },
          data: { status: StatusPagamento.PAGO, pagoEm: new Date() },
        }),
        this.prisma.proposta.update({
          where: { id: pag.propostaId },
          data: {
            status: StatusProposta.TRANSMITIDA,
            transmitidaEm: new Date(),
          },
        }),
      ]);
      this.logger.log(
        `🤖 Simulador ${pag.metodo} confirmou pagamento ${pag.id} (proposta #${pag.proposta.numero}) — status → TRANSMITIDA`,
      );
      try {
        await this.push.sendToUser(pag.proposta.corretorId, {
          title: '📤 Pagamento confirmado',
          body: `Proposta #${pag.proposta.numero} (${pag.metodo}) foi transmitida à operadora.`,
          data: {
            tipo: 'proposta',
            propostaId: pag.propostaId,
            numero: String(pag.proposta.numero),
            status: 'TRANSMITIDA',
          },
        });
      } catch {
        // não bloqueia
      }
    }
  }

  /** Job adicional: limpa tokens de refresh revogados expirados. */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async limparTokensExpirados(): Promise<void> {
    const result = await this.prisma.revokedRefreshToken.deleteMany({
      where: { expiraEm: { lt: new Date() } },
    });
    if (result.count > 0) {
      this.logger.log(`🧹 Limpou ${result.count} refresh tokens expirados.`);
    }
  }
}
