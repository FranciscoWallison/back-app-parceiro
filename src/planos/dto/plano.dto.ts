import { ApiProperty } from '@nestjs/swagger';
import { TipoPlano } from '@prisma/client';

export class PlanoDto {
  @ApiProperty({ example: 'aa111111-1111-1111-1111-111111111111' })
  id!: string;

  @ApiProperty({ example: 'ODONTO-ESSENCIAL' })
  codigo!: string;

  @ApiProperty({ example: 'Odonto Essencial' })
  nome!: string;

  @ApiProperty({ enum: TipoPlano, example: TipoPlano.ODONTO })
  tipo!: TipoPlano;

  @ApiProperty({ example: 'Cobertura básica para consultas...' })
  descricao!: string;

  @ApiProperty({ description: 'Valor mensal do titular em centavos', example: 4990 })
  valorTitularCents!: number;

  @ApiProperty({ description: 'Valor mensal de cada dependente em centavos', example: 3990 })
  valorDependenteCents!: number;

  @ApiProperty({ example: 0 })
  carenciaMeses!: number;
}
