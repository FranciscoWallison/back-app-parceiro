import { ApiProperty } from '@nestjs/swagger';
import { StatusProposta, TipoProposta } from '@prisma/client';

export class PropostaResumoDto {
  @ApiProperty()
  id!: string;
  @ApiProperty({ example: 1042 })
  numero!: number;
  @ApiProperty({ enum: TipoProposta })
  tipo!: TipoProposta;
  @ApiProperty({ enum: StatusProposta })
  status!: StatusProposta;
  @ApiProperty({ example: 'Odonto Essencial' })
  planoNome!: string;
  @ApiProperty({ example: 8980, description: 'Valor mensal total em centavos' })
  valorTotalCents!: number;
  @ApiProperty({ example: 'Carlos da Silva ou ACME Indústria Ltda' })
  titularOuEmpresa!: string;
  @ApiProperty()
  criadaEm!: string;
  @ApiProperty()
  atualizadaEm!: string;
}

export class PropostaDetalheDto extends PropostaResumoDto {
  @ApiProperty({ description: 'Snapshot completo da proposta (titulares, empresa, deps, docs)' })
  payload!: unknown;
}
