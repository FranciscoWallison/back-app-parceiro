import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FaqItemDto } from './dto/faq.dto';

@Injectable()
export class FaqService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(): Promise<FaqItemDto[]> {
    const items = await this.prisma.faqItem.findMany({
      where: { ativo: true },
      orderBy: [{ categoria: 'asc' }, { ordem: 'asc' }],
    });
    return items.map((f) => ({
      id: f.id,
      pergunta: f.pergunta,
      resposta: f.resposta,
      categoria: f.categoria,
      ordem: f.ordem,
    }));
  }
}
