import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BiometricController } from './biometric/biometric.controller';
import { BiometricService } from './biometric/biometric.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { PasswordResetService } from './password-reset.service';
import { TokenService } from './token.service';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController, BiometricController],
  providers: [
    AuthService,
    BiometricService,
    TokenService,
    JwtStrategy,
    JwtAuthGuard,
    PasswordResetService,
  ],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
