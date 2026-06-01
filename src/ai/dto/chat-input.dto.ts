import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class ChatInputDto {
  @ApiProperty({ example: 'Crie uma proposta PF para João Silva, CPF 123...' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  mensagem!: string;

  @ApiPropertyOptional({ description: 'Continuar uma sessão de chat existente.' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}

export class ChatHopDto {
  @ApiProperty()
  name!: string;
  @ApiProperty()
  args!: Record<string, unknown>;
  @ApiProperty()
  result!: unknown;
}

export class ChatResponseDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty({ description: 'Resposta final do assistente em PT-BR.' })
  texto!: string;

  @ApiProperty({
    description: 'Cadeia de function calls executadas — útil para debug e UX.',
    type: [ChatHopDto],
  })
  hops!: ChatHopDto[];
}
