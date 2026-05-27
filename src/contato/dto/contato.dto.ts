import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class EnviarContatoDto {
  @ApiProperty({ example: 'Dúvida sobre proposta PME' })
  @IsString()
  @Length(3, 160)
  assunto!: string;

  @ApiProperty({ example: 'Não consigo adicionar mais de 10 titulares na proposta PME...' })
  @IsString()
  @Length(10, 2000)
  mensagem!: string;
}

export class ContatoCriadoDto {
  @ApiProperty()
  id!: string;
}
