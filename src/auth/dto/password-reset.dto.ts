import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: '12345678909' })
  @IsString()
  @Length(11, 14)
  cpf!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token devolvido pelo /forgot-password (no log do backend, em dev)' })
  @IsString()
  @Length(8, 64)
  token!: string;

  @ApiProperty({ minLength: 6, maxLength: 64 })
  @IsString()
  @Length(6, 64)
  novaSenha!: string;
}
