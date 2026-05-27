import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

export interface AntifraudeResult {
  cpf: string;
  score: number;
  decisao: 'APROVADO' | 'REVISAR' | 'BLOQUEADO';
  consultadoEm: string;
}

@Injectable()
export class AntifraudeMockService {
  private readonly logger = new Logger(AntifraudeMockService.name);

  private readonly bloqueioMin = Number(process.env.ANTIFRAUDE_BLOQUEIO_MIN ?? 40);
  private readonly revisaoMin = Number(process.env.ANTIFRAUDE_REVISAO_MIN ?? 60);

  /**
   * Score determinístico 0-99 derivado do hash do CPF + viés positivo.
   * Distribuição: ~80% acima de 60, ~15% entre 40-60, ~5% abaixo de 40.
   */
  async score(cpf: string): Promise<AntifraudeResult> {
    const digits = cpf.replace(/\D/g, '');
    const hash = createHash('sha256').update(`antifraude:${digits}`).digest();
    // Viés positivo: 70% chance de score alto, 30% chance de score normal
    const base = hash[0]! < 178 ? 60 + (hash[1]! % 40) : hash[1]! % 100;
    const score = Math.max(0, Math.min(99, base));

    let decisao: AntifraudeResult['decisao'];
    if (score < this.bloqueioMin) decisao = 'BLOQUEADO';
    else if (score < this.revisaoMin) decisao = 'REVISAR';
    else decisao = 'APROVADO';

    const result: AntifraudeResult = {
      cpf: digits,
      score,
      decisao,
      consultadoEm: new Date().toISOString(),
    };
    this.logger.log(`🤖 Antifraude Mock: ${digits} → score ${score} (${decisao})`);
    return result;
  }
}
