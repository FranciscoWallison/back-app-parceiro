import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PushPlatform } from '@prisma/client';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private enabled = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw || raw.trim().length === 0) {
      this.logger.warn(
        'FIREBASE_SERVICE_ACCOUNT não setada — push em modo STUB (apenas loga, sem enviar).',
      );
      return;
    }
    try {
      const credentials = JSON.parse(
        raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'),
      );
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert(credentials as admin.ServiceAccount),
        });
      }
      this.enabled = true;
      this.logger.log(
        `🔔 PushService ativo (projeto: ${(credentials as { project_id?: string }).project_id ?? 'unknown'})`,
      );
    } catch (err) {
      this.logger.error(
        `Falha ao parsear FIREBASE_SERVICE_ACCOUNT — push em modo STUB. ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  /** Registra/atualiza FCM token para um user. Idempotente por fcmToken. */
  async registrarToken(
    userId: string,
    payload: { fcmToken: string; deviceId: string; deviceName?: string; platform?: PushPlatform },
  ): Promise<{ id: string }> {
    const existing = await this.prisma.deviceToken.findUnique({
      where: { fcmToken: payload.fcmToken },
    });
    if (existing) {
      // Token já existia — atualiza dono e marca ativo.
      const updated = await this.prisma.deviceToken.update({
        where: { id: existing.id },
        data: {
          userId,
          deviceId: payload.deviceId,
          deviceName: payload.deviceName,
          platform: payload.platform ?? 'ANDROID',
          ativo: true,
          ultimoUso: new Date(),
        },
      });
      return { id: updated.id };
    }
    const created = await this.prisma.deviceToken.create({
      data: {
        userId,
        fcmToken: payload.fcmToken,
        deviceId: payload.deviceId,
        deviceName: payload.deviceName,
        platform: payload.platform ?? 'ANDROID',
        ativo: true,
        ultimoUso: new Date(),
      },
    });
    return { id: created.id };
  }

  async removerToken(userId: string, fcmToken: string): Promise<void> {
    await this.prisma.deviceToken.deleteMany({
      where: { userId, fcmToken },
    });
  }

  /** Push segmentado: envia para todos os tokens ativos de um user. */
  async sendToUser(userId: string, payload: PushPayload): Promise<number> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId, ativo: true },
      select: { id: true, fcmToken: true },
    });
    if (tokens.length === 0) {
      this.logger.warn(`Nenhum token ativo para userId=${userId}`);
      return 0;
    }
    return this.dispatch(
      tokens.map((t) => ({ id: t.id, fcmToken: t.fcmToken })),
      payload,
    );
  }

  /** Push segmentado a vários users (ex: todos os corretores de uma corretora). */
  async sendToUsers(userIds: string[], payload: PushPayload): Promise<number> {
    if (userIds.length === 0) return 0;
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId: { in: userIds }, ativo: true },
      select: { id: true, fcmToken: true },
    });
    return this.dispatch(
      tokens.map((t) => ({ id: t.id, fcmToken: t.fcmToken })),
      payload,
    );
  }

  private async dispatch(
    tokens: Array<{ id: string; fcmToken: string }>,
    payload: PushPayload,
  ): Promise<number> {
    if (tokens.length === 0) return 0;

    if (!this.enabled) {
      this.logger.log(
        `[STUB push] "${payload.title}" → ${tokens.length} token(s). body="${payload.body}" data=${JSON.stringify(payload.data ?? {})}`,
      );
      return tokens.length;
    }

    const message: admin.messaging.MulticastMessage = {
      tokens: tokens.map((t) => t.fcmToken),
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
      android: {
        priority: 'high',
        notification: {
          channelId: 'corretor-default',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
    };
    try {
      const res = await admin.messaging().sendEachForMulticast(message);
      this.logger.log(
        `📤 Push enviado: ${res.successCount} ok / ${res.failureCount} falhas`,
      );
      // Marca tokens inválidos como inativos
      const invalidIds: string[] = [];
      res.responses.forEach((r, i) => {
        const code = r.error?.code;
        if (
          !r.success &&
          (code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token')
        ) {
          invalidIds.push(tokens[i].id);
        }
      });
      if (invalidIds.length > 0) {
        await this.prisma.deviceToken.updateMany({
          where: { id: { in: invalidIds } },
          data: { ativo: false },
        });
        this.logger.warn(`🧹 ${invalidIds.length} tokens inválidos marcados como inativos.`);
      }
      return res.successCount;
    } catch (err) {
      this.logger.error(
        `Falha no FCM dispatch: ${err instanceof Error ? err.message : err}`,
      );
      return 0;
    }
  }
}
