import { Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { AuthenticatedRequestUser } from '../../auth/types';
import { SpeechTokenResponseDto } from './dto/speech-token.dto';
import { SpeechService } from './speech.service';

@ApiTags('ai')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('ai/speech')
export class SpeechController {
  constructor(private readonly service: SpeechService) {}

  @Post('token')
  @Throttle({ medium: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Emite token Azure Cognitive efêmero (10min) para STT no client',
    description:
      'Frontend usa o token com SpeechConfig.fromAuthorizationToken(token, region) para abrir WebSocket direto com Azure. A chave Azure NUNCA sai do backend. Limite: 30 req/min por usuário.',
  })
  @ApiOkResponse({ type: SpeechTokenResponseDto })
  async emitirToken(
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<SpeechTokenResponseDto> {
    return this.service.emitirToken(user.userId);
  }
}
