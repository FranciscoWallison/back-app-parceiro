import { ApiProperty } from '@nestjs/swagger';
import { MetodoPagamento, TipoDocumento } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AnexarDocumentoDto {
  @ApiProperty({ enum: TipoDocumento, example: TipoDocumento.RG })
  @IsEnum(TipoDocumento)
  tipo!: TipoDocumento;

  @ApiProperty({ example: 'rg-frente.jpg' })
  @IsString()
  nomeArquivo!: string;

  @ApiProperty({ example: 245000, description: 'Tamanho em bytes (informativo, stub)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  tamanhoBytes?: number;
}

export class GerarPagamentoDto {
  @ApiProperty({ enum: MetodoPagamento, example: MetodoPagamento.PIX })
  @IsEnum(MetodoPagamento)
  metodo!: MetodoPagamento;
}
