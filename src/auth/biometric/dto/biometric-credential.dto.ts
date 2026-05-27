import { ApiProperty } from '@nestjs/swagger';

export class BiometricCredentialDto {
  @ApiProperty({
    description: 'Identificador da credencial (público, fica salvo no device)',
    example: 'b1c2d3e4-f5a6-7890-bcde-f1234567890a',
  })
  credentialId!: string;

  @ApiProperty({ example: '7c8a4e8e-9d3c-4f78-b5a1-1f2c3d4e5f60' })
  deviceId!: string;

  @ApiProperty({ example: 'iPhone 15 de Carlos', nullable: true })
  deviceName!: string | null;

  @ApiProperty({ example: '2026-05-21T18:00:00.000Z' })
  criadoEm!: string;

  @ApiProperty({
    description: 'Último uso bem-sucedido em login biométrico',
    example: '2026-05-22T08:15:00.000Z',
    nullable: true,
  })
  ultimoUso!: string | null;
}

export class EnrollBiometricResponseDto {
  @ApiProperty({ example: 'b1c2d3e4-f5a6-7890-bcde-f1234567890a' })
  credentialId!: string;

  @ApiProperty({
    description:
      'Token opaco. Salve no Keystore/Keychain protegido por biometria. ' +
      'O backend só guarda o hash bcrypt — este valor não é recuperável depois.',
    example: 'gE5kP_xVqJ8b...44chars...',
  })
  biometricToken!: string;
}
