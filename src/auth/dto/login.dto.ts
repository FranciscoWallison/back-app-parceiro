import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'CPF do corretor (com ou sem máscara)',
    example: '12345678909',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[\d.\-\s]+$/, { message: 'CPF deve conter apenas dígitos e máscara' })
  cpf!: string;

  @ApiProperty({ example: 'senha123', minLength: 6, maxLength: 64 })
  @IsString()
  @Length(6, 64)
  senha!: string;
}
