import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

export type SituacaoCpf = 'REGULAR' | 'IRREGULAR' | 'PENDENTE';

export interface ConsultaCpfResult {
  cpf: string;
  nome: string;
  dataNascimento: string;
  situacao: SituacaoCpf;
  consultadoEm: string;
}

const PRIMEIROS = [
  'João', 'Maria', 'Pedro', 'Ana', 'Lucas', 'Beatriz', 'Carlos', 'Fernanda',
  'Rafael', 'Juliana', 'Bruno', 'Camila', 'Felipe', 'Larissa', 'Diego', 'Patrícia',
  'Gustavo', 'Aline', 'Tiago', 'Mariana', 'Eduardo', 'Letícia', 'Ricardo', 'Carolina',
];

const SOBRENOMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Rodrigues',
  'Almeida', 'Nascimento', 'Carvalho', 'Gomes', 'Martins', 'Araújo', 'Ferreira', 'Ribeiro',
];

@Injectable()
export class CpfMockService {
  private readonly logger = new Logger(CpfMockService.name);

  /**
   * Consulta determinística baseada no hash do CPF — mesmo CPF gera mesma resposta.
   * Útil para demos previsíveis.
   *
   * Regras de mock:
   * - bytes[0] % 100 < 90 → REGULAR (90%)
   * - bytes[0] % 100 < 95 → PENDENTE (5%)
   * - resto → IRREGULAR (5%)
   */
  async consultar(cpf: string): Promise<ConsultaCpfResult> {
    const digits = cpf.replace(/\D/g, '');
    const hash = createHash('sha256').update(digits).digest();
    const r = hash[0]!;

    let situacao: SituacaoCpf;
    if (r % 100 < 90) situacao = 'REGULAR';
    else if (r % 100 < 95) situacao = 'PENDENTE';
    else situacao = 'IRREGULAR';

    const primeiro = PRIMEIROS[hash[1]! % PRIMEIROS.length]!;
    const sobrenome1 = SOBRENOMES[hash[2]! % SOBRENOMES.length]!;
    const sobrenome2 = SOBRENOMES[hash[3]! % SOBRENOMES.length]!;
    const nome = `${primeiro} ${sobrenome1} ${sobrenome2}`;

    // Data de nascimento entre 1960-2005 (idade 20-65)
    const ano = 1960 + (hash[4]! % 45);
    const mes = String(1 + (hash[5]! % 12)).padStart(2, '0');
    const dia = String(1 + (hash[6]! % 28)).padStart(2, '0');

    const result: ConsultaCpfResult = {
      cpf: digits,
      nome,
      dataNascimento: `${ano}-${mes}-${dia}`,
      situacao,
      consultadoEm: new Date().toISOString(),
    };
    this.logger.log(
      `🤖 CPF Mock: ${digits} → ${situacao} (${nome}, ${result.dataNascimento})`,
    );
    return result;
  }
}
