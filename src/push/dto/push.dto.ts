import { ApiProperty } from '@nestjs/swagger';
import { PushPlatform } from '@prisma/client';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class RegistrarTokenDto {
  @ApiProperty({
    description: 'Token FCM obtido pelo @capacitor/push-notifications no device',
    example: 'fG3Hk9q3T5y...:APA91bF...',
  })
  @IsString()
  @Length(20, 500)
  fcmToken!: string;

  @ApiProperty({ example: '7c8a4e8e-9d3c-4f78-b5a1-1f2c3d4e5f60' })
  @IsString()
  @Length(8, 128)
  deviceId!: string;

  @ApiProperty({ required: false, example: 'Infinix X6812B' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  deviceName?: string;

  @ApiProperty({
    enum: PushPlatform,
    required: false,
    default: PushPlatform.ANDROID,
  })
  @IsOptional()
  @IsEnum(PushPlatform)
  platform?: PushPlatform;
}

export class RemoverTokenDto {
  @ApiProperty()
  @IsString()
  @Length(20, 500)
  fcmToken!: string;
}

export class EnviarTestePushDto {
  @ApiProperty({ required: false, example: 'Teste' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  title?: string;

  @ApiProperty({ required: false, example: 'Notificação de teste do App Corretor' })
  @IsOptional()
  @IsString()
  @Length(1, 240)
  body?: string;

  @ApiProperty({ required: false, example: { rota: '/home' } })
  @IsOptional()
  @IsObject()
  data?: Record<string, string>;
}
