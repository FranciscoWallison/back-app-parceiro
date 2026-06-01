import {
  Content,
  FunctionCall,
  GoogleGenAI,
  Part,
} from '@google/genai';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { anonymize, deanonymizeArgs, shouldAnonymize } from './anonymizer';
import { ToolDispatcher } from './dispatcher';
import { buildSystemInstruction } from './system-instruction';
import { TOOLS } from './tools.config';

interface HopRecord {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

const RETRY_BACKOFF_MS = [1000, 2000, 4000];

function isTransient(err: unknown): boolean {
  const msg = (err as Error)?.message ?? '';
  return /\b(429|503|UNAVAILABLE|RESOURCE_EXHAUSTED|deadline)\b/i.test(msg);
}

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);
  private readonly client: GoogleGenAI | null;
  private readonly model: string;
  private readonly maxHops: number;
  private readonly maxOutputTokens: number;

  /**
   * Histórico em memória por sessionId. A Fase 8 substitui por Prisma
   * (`ChatMessage`) para persistir entre reinícios.
   */
  private readonly historico = new Map<string, Content[]>();

  constructor(
    private readonly dispatcher: ToolDispatcher,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = process.env.GEMINI_API_KEY;
    this.client = apiKey ? new GoogleGenAI({ apiKey }) : null;
    this.model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
    this.maxHops = Number(process.env.AI_CHAT_MAX_HOPS ?? 8);
    this.maxOutputTokens = Number(process.env.AI_CHAT_MAX_TOKENS ?? 2000);

    if (!this.client) {
      this.logger.warn(
        'GEMINI_API_KEY não configurada — AiChatService em modo STUB (responde apenas eco).',
      );
    } else {
      this.logger.log(`🤖 AiChat ativo: model=${this.model}, maxHops=${this.maxHops}`);
    }
  }

  async chat(
    corretorId: string,
    mensagem: string,
    sessionId?: string,
  ): Promise<{ sessionId: string; texto: string; hops: HopRecord[] }> {
    const sid = sessionId ?? randomUUID();
    const hops: HopRecord[] = [];

    if (!this.client) {
      return {
        sessionId: sid,
        texto:
          '🤖 (STUB) Backend está sem GEMINI_API_KEY — configure no .env para conversar com a IA real.',
        hops: [],
      };
    }

    // Anonimização: aplica só na primeira mensagem do user; placeholders dela
    // viajam pelo loop como parte do history, e o lookup é mantido para
    // de-anonimizar args antes de chamar tools.
    const { text: msgSanitized, lookup } = shouldAnonymize()
      ? anonymize(mensagem)
      : { text: mensagem, lookup: {} as Record<string, string> };

    const history = this.historico.get(sid) ?? [];
    history.push({ role: 'user', parts: [{ text: msgSanitized }] });

    let textoFinal = '';

    for (let hop = 0; hop < this.maxHops; hop++) {
      const resp = await this.callWithRetry(history);
      const calls = resp.functionCalls ?? [];

      if (calls.length === 0) {
        textoFinal = resp.text ?? '';
        // Salva resposta do model no history
        history.push({ role: 'model', parts: [{ text: textoFinal }] });
        break;
      }

      // O model decidiu chamar tools
      const modelParts: Part[] = calls.map(
        (c: FunctionCall) => ({ functionCall: c }) as Part,
      );
      history.push({ role: 'model', parts: modelParts });

      // Executa cada call (de-anonimizando args) e enfileira as respostas
      const responseParts: Part[] = [];
      for (const call of calls) {
        const args = (call.args ?? {}) as Record<string, unknown>;
        const realArgs = deanonymizeArgs(args, lookup);
        const result = await this.dispatcher.dispatch(call.name ?? '', realArgs, corretorId);
        hops.push({ name: call.name ?? '?', args: realArgs, result });
        responseParts.push({
          functionResponse: {
            name: call.name ?? '',
            response: { value: result } as unknown as Record<string, unknown>,
          },
        } as Part);
      }
      history.push({ role: 'user', parts: responseParts });
    }

    if (!textoFinal) {
      textoFinal =
        'Atingi o limite de etapas internas sem conseguir uma resposta final. Tente reformular a pergunta.';
    }

    // Persiste histórico atualizado (in-memory até Fase 8)
    this.historico.set(sid, history);

    return { sessionId: sid, texto: textoFinal, hops };
  }

  private async callWithRetry(history: Content[]) {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= RETRY_BACKOFF_MS.length; attempt++) {
      try {
        return await this.client!.models.generateContent({
          model: this.model,
          contents: history,
          config: {
            systemInstruction: buildSystemInstruction(),
            tools: [{ functionDeclarations: TOOLS }],
            maxOutputTokens: this.maxOutputTokens,
            temperature: 0.2,
          },
        });
      } catch (err) {
        lastErr = err;
        const isLast = attempt === RETRY_BACKOFF_MS.length;
        if (isLast || !isTransient(err)) break;
        const delay = RETRY_BACKOFF_MS[attempt]!;
        this.logger.warn(
          `Gemini transiente (${(err as Error).message}) — retry em ${delay}ms`,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw new ServiceUnavailableException(
      `Falha ao chamar Gemini: ${(lastErr as Error)?.message ?? 'erro desconhecido'}`,
    );
  }
}
