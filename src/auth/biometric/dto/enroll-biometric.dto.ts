import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class EnrollBiometricDto {
  @ApiProperty({
    description: 'Identificador único do device (Capacitor Device.getId().identifier)',
    example: '7c8a4e8e-9d3c-4f78-b5a1-1f2c3d4e5f60',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  deviceId!: string;

  @ApiProperty({
    description: 'Nome amigável do device (ex: "iPhone 15 de Carlos")',
    required: false,
    example: 'iPhone 15 de Carlos',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceName?: string;
}
