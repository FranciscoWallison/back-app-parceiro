import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly tokenTtlMs = 30 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async iniciar(cpf: string): Promise<void> {
    const digits = cpf.replace(/\D/g, '');
    const user = await this.prisma.user.findUnique({ where: { cpf: digits } });
    if (!user) {
      this.logger.warn(`Forgot-password para CPF inexistente: ${digits}`);
      return;
    }
    const token = randomBytes(24).toString('base64url');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiraEm: new Date(Date.now() + this.tokenTtlMs),
      },
    });
    try {
      await this.mail.sendPasswordResetEmail(user.email, user.nome, token);
    } catch (err) {
      this.logger.error(
        `Email falhou para ${user.email}: ${err instanceof Error ? err.message : err}`,
      );
      this.logger.log(`🔐 TOKEN DE RESET (fallback log): ${token}`);
    }
  }

  /** Reset — valida token e troca senha. */
  async resetar(token: string, novaSenha: string): Promise<void> {
    if (novaSenha.length < 6) {
      throw new BadRequestException('Senha deve ter ao menos 6 caracteres.');
    }
    const reg = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });
    if (!reg) throw new NotFoundException('Token inválido.');
    if (reg.usadoEm) throw new BadRequestException('Token já utilizado.');
    if (reg.expiraEm.getTime() < Date.now()) {
      throw new BadRequestException('Token expirado.');
    }
    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: reg.userId },
        data: { senhaHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: reg.id },
        data: { usadoEm: new Date() },
      }),
    ]);
    this.logger.log(`✅ Senha resetada para userId=${reg.userId}`);
  }
}
