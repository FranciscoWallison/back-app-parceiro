import { ApiProperty } from '@nestjs/swagger';

export class SpeechTokenResponseDto {
  @ApiProperty({
    description:
      'Token Azure Cognitive Services efêmero (10min). Use com SpeechConfig.fromAuthorizationToken().',
  })
  token!: string;

  @ApiProperty({
    description: 'Região do recurso Azure (ex: eastus, brazilsouth).',
  })
  region!: string;

  @ApiProperty({
    description: 'Endpoint customizado quando recurso é Azure AI Foundry multi-service (null caso contrário).',
    nullable: true,
  })
  endpoint!: string | null;

  @ApiProperty({
    description: 'Instante de expiração do token (ISO 8601). Tipicamente +10 minutos.',
  })
  expiresAt!: string;
}
