import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, MaxLength, MinLength } from 'class-validator';

export class BiometricLoginDto {
  @ApiProperty({
    description: 'credentialId devolvido no /auth/biometric/enroll',
    example: 'b1c2d3e4-f5a6-7890-bcde-f1234567890a',
  })
  @IsString()
  @Length(36, 36)
  credentialId!: string;

  @ApiProperty({
    description:
      'Token opaco devolvido no enroll. Fica no Keystore/Keychain do device, protegido por biometria.',
    example: 'gE5kP_xVqJ8b...44chars...',
  })
  @IsString()
  @MinLength(32)
  @MaxLength(256)
  biometricToken!: string;

  @ApiProperty({
    description:
      'Mesmo deviceId enviado no enroll. Rejeita login se o device for diferente.',
    example: '7c8a4e8e-9d3c-4f78-b5a1-1f2c3d4e5f60',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  deviceId!: string;
}
