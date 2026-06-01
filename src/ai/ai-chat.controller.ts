import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequestUser } from '../auth/types';
import { AiChatService } from './ai-chat.service';
import { ChatInputDto, ChatResponseDto } from './dto/chat-input.dto';

@ApiTags('ai')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiChatController {
  constructor(private readonly service: AiChatService) {}

  @Post('chat')
  @Throttle({ medium: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Conversa com o assistente de IA (Gemini Function Calling)',
    description:
      'Recebe mensagem do corretor, encadeia tools no backend (criar/listar/simular proposta etc.) e retorna texto final + hops executados. Limite: 10 req/min por usuário.',
  })
  @ApiOkResponse({ type: ChatResponseDto })
  async chat(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: ChatInputDto,
  ): Promise<ChatResponseDto> {
    return this.service.chat(user.userId, dto.mensagem, dto.sessionId);
  }
}
