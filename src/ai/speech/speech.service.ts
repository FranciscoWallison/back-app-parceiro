import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SpeechTokenResponseDto } from './dto/speech-token.dto';

/**
 * Cliente do Azure Cognitive Services Speech.
 *
 * Por que token efêmero em vez de devolver a chave: a chave Azure tem
 * validade ilimitada — se vazasse num APK desempacotado, atacante poderia
 * consumir nossos créditos por horas. O issueToken devolve um JWT de **10
 * minutos** que o frontend usa com `SpeechConfig.fromAuthorizationToken`.
 * Se o token vazar, expira sozinho.
 *
 * Cache em memória: o issueToken é gratuito, mas evitar chamá-lo a cada
 * toque no microfone reduz latência. Token vive 10min — guardamos por 9min
 * (margem de segurança).
 */
@Injectable()
export class SpeechService {
  private readonly logger = new Logger(SpeechService.name);
  private readonly key = process.env.AZURE_SPEECH_KEY ?? '';
  private readonly region = process.env.AZURE_SPEECH_REGION ?? 'eastus';
  private readonly endpoint = process.env.AZURE_SPEECH_ENDPOINT ?? '';

  /** Cache: token serializado + instante de validade. */
  private cached: { token: string; expiresAt: number } | null = null;

  constructor() {
    if (!this.key) {
      this.logger.warn(
        'AZURE_SPEECH_KEY não configurada — endpoint /ai/speech/token retornará 503.',
      );
    } else {
      this.logger.log(`🎤 Speech ativo: region=${this.region}`);
    }
  }

  async emitirToken(userId: string): Promise<SpeechTokenResponseDto> {
    if (!this.key) {
      throw new ServiceUnavailableException(
        'Voz indisponível: AZURE_SPEECH_KEY não configurada no servidor.',
      );
    }

    const now = Date.now();
    if (this.cached && this.cached.expiresAt > now + 60_000) {
      // Token ainda válido por mais de 1 minuto — reutiliza.
      this.logger.log(`🎤 Speech token reutilizado para userId=${userId}`);
      return this.respond(this.cached.token, this.cached.expiresAt);
    }

    const url = `https://${this.region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.key,
        'Content-Length': '0',
      },
    });

    if (!resp.ok) {
      const body = await resp.text();
      this.logger.error(`Azure issueToken falhou ${resp.status}: ${body}`);
      throw new ServiceUnavailableException(
        `Falha ao obter token Azure (HTTP ${resp.status}).`,
      );
    }

    const token = (await resp.text()).trim();
    // Tokens Azure Cognitive duram 10 minutos. Cacheamos por 9.
    const expiresAt = now + 9 * 60 * 1000;
    this.cached = { token, expiresAt };

    this.logger.log(`🎤 Speech token emitido para userId=${userId}`);
    return this.respond(token, expiresAt);
  }

  private respond(token: string, expiresAtMs: number): SpeechTokenResponseDto {
    return {
      token,
      region: this.region,
      endpoint: this.endpoint || null,
      expiresAt: new Date(expiresAtMs).toISOString(),
    };
  }
}
