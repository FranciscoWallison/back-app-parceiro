import { Module } from '@nestjs/common';
import { PlanosModule } from '../planos/planos.module';
import { PropostasModule } from '../propostas/propostas.module';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { ToolDispatcher } from './dispatcher';

/**
 * Módulo do assistente de IA (proxy Gemini Function Calling).
 *
 * Reutiliza PropostasService e PlanosService já existentes. CpfMockService e
 * AntifraudeMockService vêm do CpfMockModule, que é @Global.
 */
@Module({
  imports: [PropostasModule, PlanosModule],
  controllers: [AiChatController],
  providers: [AiChatService, ToolDispatcher],
})
export class AiChatModule {}
