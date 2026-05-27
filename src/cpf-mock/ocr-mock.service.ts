import { Injectable, Logger } from '@nestjs/common';
import { TipoDocumento } from '@prisma/client';
import { createHash } from 'crypto';

export interface DadosExtraidos {
  nome?: string;
  cpf?: string;
  dataNascimento?: string;
  rg?: string;
  cnpj?: string;
  confianca: number;
  extraidoEm: string;
}

const PRIMEIROS = [
  'João', 'Maria', 'Pedro', 'Ana', 'Lucas', 'Beatriz', 'Carlos', 'Fernanda',
  'Rafael', 'Juliana', 'Bruno', 'Camila', 'Felipe', 'Larissa',
];

const SOBRENOMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa',
];

@Injectable()
export class OcrMockService {
  private readonly logger = new Logger(OcrMockService.name);

  /**
   * Simula OCR — gera dados plausíveis a partir do nome do arquivo.
   * Determinístico (mesmo arquivo gera mesma extração).
   */
  extrair(tipo: TipoDocumento, nomeArquivo: string): DadosExtraidos {
    const hash = createHash('sha256').update(`ocr:${tipo}:${nomeArquivo}`).digest();
    const confianca = 75 + (hash[0]! % 25); // 75-99

    const primeiro = PRIMEIROS[hash[1]! % PRIMEIROS.length]!;
    const sobrenome = SOBRENOMES[hash[2]! % SOBRENOMES.length]!;
    const nome = `${primeiro} ${sobrenome}`;

    // CPF aleatório (formatado, não passa validação DV — só para visual)
    const cpfDigits = Array.from(hash.slice(3, 14))
      .map((b) => b % 10)
      .join('')
      .slice(0, 11);
    const cpf = `${cpfDigits.slice(0, 3)}.${cpfDigits.slice(3, 6)}.${cpfDigits.slice(6, 9)}-${cpfDigits.slice(9, 11)}`;

    const ano = 1960 + (hash[14]! % 45);
    const mes = String(1 + (hash[15]! % 12)).padStart(2, '0');
    const dia = String(1 + (hash[16]! % 28)).padStart(2, '0');
    const dataNascimento = `${dia}/${mes}/${ano}`;

    const base: DadosExtraidos = {
      confianca,
      extraidoEm: new Date().toISOString(),
    };

    let result: DadosExtraidos;
    switch (tipo) {
      case TipoDocumento.RG: {
        const rg = `${hash[17]! % 100}.${(hash[18]! % 1000).toString().padStart(3, '0')}.${(hash[19]! % 1000).toString().padStart(3, '0')}-${hash[20]! % 10}`;
        result = { ...base, nome, cpf, dataNascimento, rg };
        break;
      }
      case TipoDocumento.CNH:
        result = { ...base, nome, cpf, dataNascimento };
        break;
      case TipoDocumento.CONTRATO_SOCIAL:
      case TipoDocumento.CARTAO_CNPJ: {
        const cnpjDigits = Array.from(hash.slice(3, 17))
          .map((b) => b % 10)
          .join('')
          .slice(0, 14);
        const cnpj = `${cnpjDigits.slice(0, 2)}.${cnpjDigits.slice(2, 5)}.${cnpjDigits.slice(5, 8)}/${cnpjDigits.slice(8, 12)}-${cnpjDigits.slice(12, 14)}`;
        result = { ...base, cnpj };
        break;
      }
      default:
        result = base;
    }
    this.logger.log(
      `🤖 OCR Mock (${tipo}): "${nomeArquivo}" → confiança ${confianca}%`,
    );
    return result;
  }
}
