import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EnviarContatoDto } from './dto/contato.dto';

@Injectable()
export class ContatoService {
  private readonly logger = new Logger(ContatoService.name);

  constructor(private readonly prisma: PrismaService) {}

  async enviar(userId: string, dto: EnviarContatoDto): Promise<{ id: string }> {
    const saved = await this.prisma.mensagemContato.create({
      data: {
        userId,
        assunto: dto.assunto,
        mensagem: dto.mensagem,
      },
    });
    this.logger.log(`📨 Mensagem de contato #${saved.id} de user=${userId}: "${dto.assunto}"`);
    return { id: saved.id };
  }
}
