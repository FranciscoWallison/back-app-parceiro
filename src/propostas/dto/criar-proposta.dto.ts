import { ApiProperty } from '@nestjs/swagger';
import { TipoProposta } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { EmpresaInputDto, TitularInputDto } from './nested.dto';

export class CriarPropostaDto {
  @ApiProperty({ enum: TipoProposta, example: TipoProposta.PF })
  @IsEnum(TipoProposta)
  tipo!: TipoProposta;

  @ApiProperty({ example: 'aa111111-1111-1111-1111-111111111111' })
  @IsString()
  @Length(36, 36)
  planoId!: string;

  @ApiProperty({ required: false, description: 'Observações livres do corretor' })
  @IsOptional()
  @IsString()
  observacoes?: string;

  // PF
  @ApiProperty({
    type: TitularInputDto,
    required: false,
    description: 'Obrigatório quando tipo=PF. 1 titular + N dependentes.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TitularInputDto)
  titular?: TitularInputDto;

  // PME
  @ApiProperty({
    type: EmpresaInputDto,
    required: false,
    description: 'Obrigatório quando tipo=PME.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmpresaInputDto)
  empresa?: EmpresaInputDto;

  @ApiProperty({
    type: [TitularInputDto],
    required: false,
    description: 'Obrigatório quando tipo=PME. Funcionários titulares.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TitularInputDto)
  titulares?: TitularInputDto[];
}
