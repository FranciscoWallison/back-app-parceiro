import { Module } from '@nestjs/common';
import { SpeechController } from './speech.controller';
import { SpeechService } from './speech.service';

/**
 * Proxy de tokens Azure Speech para STT no frontend.
 *
 * Por que módulo separado do AiChatModule: o serviço de voz é
 * independente do pipeline Gemini — pode ser ligado/desligado sem afetar
 * o chat texto. Também segue a regra de "uma chave externa = um módulo".
 */
@Module({
  controllers: [SpeechController],
  providers: [SpeechService],
})
export class SpeechModule {}
