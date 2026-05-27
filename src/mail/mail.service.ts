import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter!: nodemailer.Transporter;
  private from!: string;

  onModuleInit(): void {
    const host = process.env.MAIL_HOST ?? 'mailhog';
    const port = Number(process.env.MAIL_PORT ?? 1025);
    this.from = process.env.MAIL_FROM ?? 'App Corretor <no-reply@app-corretor.local>';
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      ignoreTLS: true,
    });
    this.logger.log(`MailService configurado para ${host}:${port}`);
  }

  async sendPasswordResetEmail(
    to: string,
    nome: string,
    token: string,
  ): Promise<void> {
    const linkExemplo = `http://localhost:8080/esqueci-senha?token=${token}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
        <h2 style="color: #3880ff;">Recuperação de senha</h2>
        <p>Olá, ${nome}!</p>
        <p>Recebemos um pedido para redefinir sua senha no App Corretor.</p>
        <p>Use o token abaixo no app (válido por 30 minutos):</p>
        <p style="background:#f4f4f4;padding:12px;border-radius:6px;font-family:monospace;word-break:break-all;">
          <strong>${token}</strong>
        </p>
        <p>Ou abra este link no app: <a href="${linkExemplo}">${linkExemplo}</a></p>
        <p style="color:#888;font-size:0.9em;margin-top:24px;">Se você não solicitou, ignore este email.</p>
      </div>
    `;
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: 'App Corretor — Recuperação de senha',
        html,
      });
      this.logger.log(`📧 Email de reset enviado para ${to}`);
    } catch (err) {
      this.logger.error(
        `Falha ao enviar email para ${to}: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  }
}
