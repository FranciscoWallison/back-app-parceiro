import { Injectable, NotFoundException } from '@nestjs/common';
import { Corretora, CorretoraStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CorretoraDto } from './dto/corretora.dto';
import { ValidarCorretoraResponseDto } from './dto/validar-corretora-response.dto';

@Injectable()
export class CorretorasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CorretoraDto[]> {
    const items = await this.prisma.corretora.findMany({
      orderBy: { dataCadastro: 'asc' },
    });
    return items.map(this.toDto);
  }

  async findByCnpj(cnpj: string): Promise<CorretoraDto> {
    const digits = cnpj.replace(/\D/g, '');
    const corretora = await this.prisma.corretora.findUnique({
      where: { cnpj: digits },
    });
    if (!corretora) {
      throw new NotFoundException(`Corretora com CNPJ ${cnpj} não encontrada.`);
    }
    return this.toDto(corretora);
  }

  async validar(cnpj: string): Promise<ValidarCorretoraResponseDto> {
    const corretora = await this.findByCnpj(cnpj);
    const aprovada = corretora.status === CorretoraStatus.APROVADA;
    const mensagemPorStatus: Record<CorretoraStatus, string> = {
      APROVADA: 'Corretora apta a emitir propostas.',
      PENDENTE:
        'Cadastro em análise. Aguarde a aprovação para emitir propostas.',
      REJEITADA: 'Cadastro rejeitado. Entre em contato com o suporte.',
    };
    return {
      cnpj: corretora.cnpj,
      aprovada,
      status: corretora.status,
      mensagem: mensagemPorStatus[corretora.status],
    };
  }

  private toDto(c: Corretora): CorretoraDto {
    return {
      id: c.id,
      cnpj: c.cnpj,
      cnpjFormatado: c.cnpjFormatado,
      razaoSocial: c.razaoSocial,
      nomeFantasia: c.nomeFantasia,
      status: c.status,
      susep: c.susep,
      email: c.email,
      telefone: c.telefone,
      cidade: c.cidade,
      uf: c.uf,
      dataCadastro: c.dataCadastro.toISOString(),
      dataAprovacao: c.dataAprovacao?.toISOString() ?? null,
    };
  }
}
