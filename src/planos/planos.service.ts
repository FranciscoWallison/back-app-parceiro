import { Injectable, NotFoundException } from '@nestjs/common';
import { Plano } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlanoDto } from './dto/plano.dto';

@Injectable()
export class PlanosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<PlanoDto[]> {
    const items = await this.prisma.plano.findMany({
      where: { ativo: true },
      orderBy: { valorTitularCents: 'asc' },
    });
    return items.map(this.toDto);
  }

  async findById(id: string): Promise<Plano> {
    const p = await this.prisma.plano.findUnique({ where: { id } });
    if (!p || !p.ativo) {
      throw new NotFoundException(`Plano ${id} não encontrado.`);
    }
    return p;
  }

  toDto(p: Plano): PlanoDto {
    return {
      id: p.id,
      codigo: p.codigo,
      nome: p.nome,
      tipo: p.tipo,
      descricao: p.descricao,
      valorTitularCents: p.valorTitularCents,
      valorDependenteCents: p.valorDependenteCents,
      carenciaMeses: p.carenciaMeses,
    };
  }
}
