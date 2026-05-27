import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ required: false, example: 'Carlos Eduardo da Silva' })
  @IsOptional()
  @IsString()
  @Length(3, 160)
  nome?: string;

  @ApiProperty({ required: false, example: 'carlos.novo@acme.com.br' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, example: '(11) 99876-5432' })
  @IsOptional()
  @IsString()
  @Length(8, 40)
  telefone?: string;
}
