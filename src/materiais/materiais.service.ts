import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MaterialDto, MaterialDownloadDto } from './dto/material.dto';

@Injectable()
export class MateriaisService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(): Promise<MaterialDto[]> {
    const items = await this.prisma.materialPromocional.findMany({
      where: { ativo: true },
      orderBy: { ordem: 'asc' },
    });
    return items.map((m) => ({
      id: m.id,
      titulo: m.titulo,
      descricao: m.descricao,
      tipo: m.tipo,
      thumbnail: m.thumbnail,
      ordem: m.ordem,
    }));
  }

  async download(id: string): Promise<MaterialDownloadDto> {
    const m = await this.prisma.materialPromocional.findUnique({ where: { id } });
    if (!m || !m.ativo) {
      throw new NotFoundException(`Material ${id} não encontrado.`);
    }
    return { id: m.id, titulo: m.titulo, url: m.urlMock };
  }
}
