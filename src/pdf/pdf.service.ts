import { Injectable } from '@nestjs/common';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';

export interface PropostaPdfInput {
  numero: number;
  tipo: 'PF' | 'PME';
  planoNome: string;
  valorTotalCents: number;
  titularOuEmpresa: string;
  documentoTitular?: string;
  emailTitular?: string;
  assinaturaPngBase64: string;
  hashAssinatura: string;
  timestampISO: string;
}

@Injectable()
export class PdfService {
  async gerarPropostaAssinada(input: PropostaPdfInput): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595.28, 841.89]); // A4
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const margin = 50;
    let y = 800;

    // Cabeçalho
    page.drawText('APP CORRETOR', {
      x: margin,
      y,
      size: 18,
      font: fontBold,
      color: rgb(0.2, 0.4, 0.9),
    });
    y -= 24;
    page.drawText(`Proposta de Adesão nº ${input.numero}`, {
      x: margin,
      y,
      size: 14,
      font: fontBold,
    });
    y -= 36;

    // Bloco de dados
    const linha = (label: string, value: string) => {
      page.drawText(`${label}:`, { x: margin, y, size: 10, font: fontBold });
      page.drawText(value, { x: margin + 130, y, size: 10, font });
      y -= 18;
    };

    linha('Tipo', input.tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica');
    linha('Titular/Empresa', input.titularOuEmpresa);
    if (input.documentoTitular) linha('CPF/CNPJ', input.documentoTitular);
    if (input.emailTitular) linha('E-mail', input.emailTitular);
    linha('Plano contratado', input.planoNome);
    linha(
      'Valor mensal',
      `R$ ${(input.valorTotalCents / 100).toFixed(2).replace('.', ',')}`,
    );

    y -= 12;
    page.drawLine({
      start: { x: margin, y },
      end: { x: 545, y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 24;

    // Termos
    this.drawWrappedText(
      page,
      font,
      9,
      'O titular declara estar ciente das condições gerais do plano contratado, ' +
        'da carência aplicável conforme o regulamento, e autoriza o débito ' +
        'das mensalidades pelo método de pagamento selecionado.',
      margin,
      y,
      495,
    );
    y -= 70;

    // Assinatura
    page.drawText('Assinatura do titular:', {
      x: margin,
      y,
      size: 10,
      font: fontBold,
    });
    y -= 8;

    try {
      const cleanBase64 = input.assinaturaPngBase64.replace(/^data:image\/\w+;base64,/, '');
      const png = await doc.embedPng(Buffer.from(cleanBase64, 'base64'));
      const maxW = 250;
      const ratio = Math.min(maxW / png.width, 100 / png.height);
      const w = png.width * ratio;
      const h = png.height * ratio;
      page.drawImage(png, { x: margin, y: y - h, width: w, height: h });
      y -= h + 8;
    } catch {
      page.drawText('[assinatura indisponível]', {
        x: margin,
        y: y - 30,
        size: 9,
        font,
        color: rgb(0.6, 0.2, 0.2),
      });
      y -= 50;
    }

    page.drawLine({
      start: { x: margin, y },
      end: { x: margin + 300, y },
      thickness: 0.5,
    });
    y -= 14;
    page.drawText(input.titularOuEmpresa, { x: margin, y, size: 9, font });
    y -= 24;

    // Rodapé com hash
    page.drawText(`Hash SHA-256: ${input.hashAssinatura}`, {
      x: margin,
      y: 60,
      size: 7,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    page.drawText(`Assinado em: ${input.timestampISO}`, {
      x: margin,
      y: 50,
      size: 7,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    page.drawText('Documento gerado eletronicamente pelo App Corretor.', {
      x: margin,
      y: 40,
      size: 7,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    return doc.save();
  }

  private drawWrappedText(
    page: PDFPage,
    font: PDFFont,
    size: number,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
  ): void {
    const words = text.split(' ');
    let line = '';
    let cursorY = y;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      const w = font.widthOfTextAtSize(test, size);
      if (w > maxWidth && line) {
        page.drawText(line, { x, y: cursorY, size, font });
        line = word;
        cursorY -= size + 3;
      } else {
        line = test;
      }
    }
    if (line) page.drawText(line, { x, y: cursorY, size, font });
  }
}
