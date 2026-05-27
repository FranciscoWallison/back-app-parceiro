import { ApiProperty } from '@nestjs/swagger';
import { StatusProposta, TipoProposta } from '@prisma/client';

export class PropostaResumidaCardDto {
  @ApiProperty() id!: string;
  @ApiProperty() numero!: number;
  @ApiProperty({ enum: TipoProposta }) tipo!: TipoProposta;
  @ApiProperty({ enum: StatusProposta }) status!: StatusProposta;
  @ApiProperty() valorTotalCents!: number;
  @ApiProperty() planoNome!: string;
  @ApiProperty() titularOuEmpresa!: string;
  @ApiProperty() atualizadaEm!: string;
}

export class DashboardDto {
  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({
    description: 'Soma dos valores das propostas em estado intermediário (não fechado)',
    example: 489700,
  })
  valorEmAbertoCents!: number;

  @ApiProperty({ description: 'Contagem por status' })
  contadores!: Record<StatusProposta, number>;

  @ApiProperty({ type: [PropostaResumidaCardDto] })
  ultimas!: PropostaResumidaCardDto[];
}
