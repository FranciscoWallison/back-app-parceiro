import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ContatoModule } from './contato/contato.module';
import { CorretorasModule } from './corretoras/corretoras.module';
import { CpfMockModule } from './cpf-mock/cpf-mock.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { FaqModule } from './faq/faq.module';
import { MailModule } from './mail/mail.module';
import { MateriaisModule } from './materiais/materiais.module';
import { PdfModule } from './pdf/pdf.module';
import { PlanosModule } from './planos/planos.module';
import { PrismaModule } from './prisma/prisma.module';
import { PropostasModule } from './propostas/propostas.module';
import { PushModule } from './push/push.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { SimuladoresModule } from './simuladores/simuladores.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1_000, limit: 5 },
      { name: 'medium', ttl: 60_000, limit: 60 },
      { name: 'long', ttl: 3_600_000, limit: 1_000 },
    ]),
    PrismaModule,
    StorageModule,
    MailModule,
    PdfModule,
    PushModule,
    CpfMockModule,
    SchedulerModule,
    SimuladoresModule,
    UsersModule,
    AuthModule,
    CorretorasModule,
    PlanosModule,
    PropostasModule,
    DashboardModule,
    MateriaisModule,
    ContatoModule,
    FaqModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
