import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';

export class DependenteInputDto {
  @ApiProperty({ example: '52998224725' })
  @IsString()
  @Length(11, 14)
  cpf!: string;

  @ApiProperty({ example: 'Lucas da Silva' })
  @IsString()
  @Length(3, 160)
  nome!: string;

  @ApiProperty({ example: '2015-04-22' })
  @IsISO8601()
  dataNascimento!: string;

  @ApiProperty({ example: 'FILHO', description: 'FILHO | CONJUGE | PAI | MAE | OUTRO' })
  @IsString()
  @Length(2, 40)
  parentesco!: string;

  @ApiProperty({
    description: 'Declaração de saúde (objeto livre — checkboxes do app)',
    required: false,
    example: { fumante: false, doencasPreexistentes: [] },
  })
  @IsOptional()
  declaracaoSaude?: Record<string, unknown>;
}

export class TitularInputDto {
  @ApiProperty({ example: '12345678909' })
  @IsString()
  @Length(11, 14)
  cpf!: string;

  @ApiProperty({ example: 'Carlos da Silva' })
  @IsString()
  @Length(3, 160)
  nome!: string;

  @ApiProperty({ example: '1985-07-12' })
  @IsISO8601()
  dataNascimento!: string;

  @ApiProperty({ example: 'carlos@exemplo.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '(11) 98765-4321' })
  @IsString()
  @Length(8, 40)
  telefone!: string;

  @ApiProperty({ example: '01310100' })
  @IsString()
  @Matches(/^\d{8}$/, { message: 'CEP deve ter 8 dígitos' })
  cep!: string;

  @ApiProperty({ example: 'Avenida Paulista' })
  @IsString()
  logradouro!: string;

  @ApiProperty({ example: '1500' })
  @IsString()
  numero!: string;

  @ApiProperty({ example: 'Apto 42', required: false })
  @IsOptional()
  @IsString()
  complemento?: string;

  @ApiProperty({ example: 'Bela Vista' })
  @IsString()
  bairro!: string;

  @ApiProperty({ example: 'São Paulo' })
  @IsString()
  cidade!: string;

  @ApiProperty({ example: 'SP' })
  @IsString()
  @Length(2, 2)
  uf!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  declaracaoSaude?: Record<string, unknown>;

  @ApiProperty({ type: [DependenteInputDto], required: false, default: [] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DependenteInputDto)
  dependentes?: DependenteInputDto[];
}

export class EmpresaInputDto {
  @ApiProperty({ example: '11222333000181' })
  @IsString()
  @Length(14, 18)
  cnpj!: string;

  @ApiProperty({ example: 'ACME Indústria Ltda' })
  @IsString()
  razaoSocial!: string;

  @ApiProperty({ example: 'ACME' })
  @IsString()
  nomeFantasia!: string;

  @ApiProperty({ example: 'rh@acme.com.br' })
  @IsEmail()
  emailContato!: string;

  @ApiProperty({ example: '(11) 3333-4444' })
  @IsString()
  telefone!: string;

  @ApiProperty({ example: '04567000' })
  @IsString()
  @Matches(/^\d{8}$/)
  cep!: string;

  @ApiProperty()
  @IsString()
  logradouro!: string;

  @ApiProperty()
  @IsString()
  numero!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  complemento?: string;

  @ApiProperty()
  @IsString()
  bairro!: string;

  @ApiProperty()
  @IsString()
  cidade!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 2)
  uf!: string;
}
