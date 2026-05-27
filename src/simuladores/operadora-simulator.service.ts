import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StatusProposta, TipoProposta } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

const APROVACAO_APOS_MS = 60_000;
const PROB_APROVACAO = 0.9;

const MOTIVOS_RECUSA = [
  'Documentação ilegível ou incompleta',
  'Score de risco elevado',
  'Carência conflitante com plano anterior',
  'Dados do titular divergem da consulta CPF',
  'Idade do titular acima do limite do plano',
];

@Injectable()
export class OperadoraSimulatorService {
  private readonly logger = new Logger(OperadoraSimulatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async processar(): Promise<void> {
    if (process.env.OPERADORA_SIMULADOR === 'false') return;

    const limite = new Date(Date.now() - APROVACAO_APOS_MS);
    const candidatas = await this.prisma.proposta.findMany({
      where: {
        status: StatusProposta.TRANSMITIDA,
        transmitidaEm: { lte: limite },
      },
      include: { titulares: { take: 1 }, empresa: true },
    });

    for (const p of candidatas) {
      const aprovar = Math.random() < PROB_APROVACAO;
      const titularOuEmpresa =
        p.tipo === TipoProposta.PME && p.empresa
          ? p.empresa.razaoSocial
          : p.titulares[0]?.nome ?? '(sem titular)';

      if (aprovar) {
        await this.prisma.proposta.update({
          where: { id: p.id },
          data: { status: StatusProposta.APROVADA, aprovadaEm: new Date() },
        });
        this.logger.log(
          `🤖 Operadora Simulator: Proposta #${p.numero} → APROVADA`,
        );
        try {
          await this.push.sendToUser(p.corretorId, {
            title: '✅ Proposta aprovada',
            body: `#${p.numero} — ${titularOuEmpresa} foi aprovada pela operadora!`,
            data: {
              tipo: 'proposta',
              propostaId: p.id,
              numero: String(p.numero),
              status: 'APROVADA',
            },
          });
        } catch {
          /* push é best-effort */
        }
      } else {
        const motivo =
          MOTIVOS_RECUSA[Math.floor(Math.random() * MOTIVOS_RECUSA.length)]!;
        await this.prisma.proposta.update({
          where: { id: p.id },
          data: {
            status: StatusProposta.RECUSADA,
            recusadaEm: new Date(),
            motivoRecusa: motivo,
          },
        });
        this.logger.log(
          `🤖 Operadora Simulator: Proposta #${p.numero} → RECUSADA (motivo: ${motivo})`,
        );
        try {
          await this.push.sendToUser(p.corretorId, {
            title: '❌ Proposta recusada',
            body: `#${p.numero} — ${titularOuEmpresa}. Motivo: ${motivo}`,
            data: {
              tipo: 'proposta',
              propostaId: p.id,
              numero: String(p.numero),
              status: 'RECUSADA',
            },
          });
        } catch {
          /* */
        }
      }
    }
  }
}
