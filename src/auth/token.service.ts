import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload, TokenType } from './types';

interface TokenConfig {
  secret: string;
  expiresIn: string;
}

export interface TokenSubject {
  id: string;
  cpf: string;
  corretoraCnpj: string;
}

@Injectable()
export class TokenService {
  private readonly accessConfig: TokenConfig;
  private readonly refreshConfig: TokenConfig;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {
    this.accessConfig = {
      secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
      expiresIn: process.env.JWT_ACCESS_TTL ?? '15m',
    };
    this.refreshConfig = {
      secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
      expiresIn: process.env.JWT_REFRESH_TTL ?? '7d',
    };
  }

  async issueTokenPair(
    user: TokenSubject,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.sign(user, 'access'),
      this.sign(user, 'refresh'),
    ]);
    return { accessToken, refreshToken };
  }

  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    const payload = await this.verify(token, 'refresh');
    const revoked = await this.prisma.revokedRefreshToken.findUnique({
      where: { jti: payload.jti },
    });
    if (revoked) {
      throw new UnauthorizedException('Refresh token revogado.');
    }
    return payload;
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    return this.verify(token, 'access');
  }

  async revokeRefreshToken(payload: JwtPayload, expSeconds?: number): Promise<void> {
    const expiraEm = expSeconds
      ? new Date(expSeconds * 1000)
      : new Date(Date.now() + 7 * 24 * 3600 * 1000);
    try {
      await this.prisma.revokedRefreshToken.create({
        data: {
          jti: payload.jti,
          userId: payload.sub,
          expiraEm,
        },
      });
    } catch {
      // já estava revogado (unique violation) — idempotente
    }
  }

  private async sign(user: TokenSubject, type: TokenType): Promise<string> {
    const cfg = type === 'access' ? this.accessConfig : this.refreshConfig;
    const payload: JwtPayload = {
      sub: user.id,
      cpf: user.cpf,
      corretoraCnpj: user.corretoraCnpj,
      type,
      jti: randomUUID(),
    };
    const options: JwtSignOptions = {
      secret: cfg.secret,
      expiresIn: cfg.expiresIn as unknown as JwtSignOptions['expiresIn'],
    };
    return this.jwtService.signAsync(payload, options);
  }

  private async verify(token: string, expectedType: TokenType): Promise<JwtPayload> {
    const cfg = expectedType === 'access' ? this.accessConfig : this.refreshConfig;
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: cfg.secret,
      });
      if (payload.type !== expectedType) {
        throw new UnauthorizedException(
          `Token do tipo ${payload.type} usado onde ${expectedType} é esperado.`,
        );
      }
      return payload;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Token inválido ou expirado.');
    }
  }
}
