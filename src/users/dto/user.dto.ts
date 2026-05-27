import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  id!: string;

  @ApiProperty({ example: '12345678909' })
  cpf!: string;

  @ApiProperty({ example: 'Carlos da Silva' })
  nome!: string;

  @ApiProperty({ example: 'carlos@acmeseguros.com.br' })
  email!: string;

  @ApiProperty({
    description: 'CNPJ da corretora à qual o usuário está vinculado',
    example: '11222333000181',
  })
  corretoraCnpj!: string;
}
