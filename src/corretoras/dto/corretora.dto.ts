import { ApiProperty } from '@nestjs/swagger';
import { CorretoraStatus } from '@prisma/client';

export { CorretoraStatus };

export class CorretoraDto {
  @ApiProperty({ example: 'c1a2b3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({
    description: 'CNPJ apenas com dígitos (14 chars)',
    example: '11222333000181',
  })
  cnpj!: string;

  @ApiProperty({
    description: 'CNPJ formatado com máscara',
    example: '11.222.333/0001-81',
  })
  cnpjFormatado!: string;

  @ApiProperty({ example: 'Corretora ACME Seguros Ltda' })
  razaoSocial!: string;

  @ApiProperty({ example: 'ACME Seguros' })
  nomeFantasia!: string;

  @ApiProperty({
    enum: CorretoraStatus,
    example: CorretoraStatus.APROVADA,
    description:
      'Status do cadastro. Apenas corretoras APROVADAS podem emitir propostas.',
  })
  status!: CorretoraStatus;

  @ApiProperty({
    description: 'Registro SUSEP da corretora',
    example: '10.2024.123456-7',
  })
  susep!: string;

  @ApiProperty({ example: 'contato@acmeseguros.com.br' })
  email!: string;

  @ApiProperty({ example: '(11) 3456-7890' })
  telefone!: string;

  @ApiProperty({ example: 'São Paulo' })
  cidade!: string;

  @ApiProperty({ example: 'SP' })
  uf!: string;

  @ApiProperty({
    description: 'Data de cadastro em formato ISO 8601',
    example: '2024-01-15T10:30:00.000Z',
  })
  dataCadastro!: string;

  @ApiProperty({
    description: 'Data de aprovação em ISO 8601 (null se ainda não aprovada)',
    example: '2024-02-01T14:00:00.000Z',
    nullable: true,
  })
  dataAprovacao!: string | null;
}
