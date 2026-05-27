import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../../users/users.service';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { TokenService } from '../token.service';
import {
  BiometricCredentialDto,
  EnrollBiometricResponseDto,
} from './dto/biometric-credential.dto';
import { BiometricLoginDto } from './dto/biometric-login.dto';
import { EnrollBiometricDto } from './dto/enroll-biometric.dto';

@Injectable()
export class BiometricService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
  ) {}

  async enroll(
    userId: string,
    dto: EnrollBiometricDto,
  ): Promise<EnrollBiometricResponseDto> {
    await this.usersService.findById(userId);
    const biometricToken = randomBytes(32).toString('base64url');
    const tokenHash = await bcrypt.hash(biometricToken, 10);

    // upsert por (userId, deviceId) → re-enroll no mesmo device substitui a credencial.
    const credential = await this.prisma.biometricCredential.upsert({
      where: { userId_deviceId: { userId, deviceId: dto.deviceId } },
      create: {
        userId,
        deviceId: dto.deviceId,
        deviceName: dto.deviceName ?? null,
        tokenHash,
      },
      update: {
        tokenHash,
        deviceName: dto.deviceName ?? null,
        ultimoUso: null,
      },
    });

    return { credentialId: credential.id, biometricToken };
  }

  async login(dto: BiometricLoginDto): Promise<AuthResponseDto> {
    const credential = await this.prisma.biometricCredential.findUnique({
      where: { id: dto.credentialId },
      include: { user: { include: { corretora: true } } },
    });
    if (!credential) {
      throw new UnauthorizedException('Credencial biométrica inválida.');
    }
    if (credential.deviceId !== dto.deviceId) {
      throw new UnauthorizedException(
        'Credencial biométrica não pertence a este device.',
      );
    }
    const ok = await bcrypt.compare(dto.biometricToken, credential.tokenHash);
    if (!ok) {
      throw new UnauthorizedException('Credencial biométrica inválida.');
    }
    if (!credential.user.ativo) {
      throw new UnauthorizedException('Usuário inativo.');
    }

    await this.prisma.biometricCredential.update({
      where: { id: credential.id },
      data: { ultimoUso: new Date() },
    });

    const tokens = await this.tokenService.issueTokenPair({
      id: credential.user.id,
      cpf: credential.user.cpf,
      corretoraCnpj: credential.user.corretora.cnpj,
    });
    return { ...tokens, user: this.usersService.toProfile(credential.user) };
  }

  async list(userId: string): Promise<BiometricCredentialDto[]> {
    const items = await this.prisma.biometricCredential.findMany({
      where: { userId },
      orderBy: { criadoEm: 'desc' },
    });
    return items.map((c) => ({
      credentialId: c.id,
      deviceId: c.deviceId,
      deviceName: c.deviceName,
      criadoEm: c.criadoEm.toISOString(),
      ultimoUso: c.ultimoUso?.toISOString() ?? null,
    }));
  }

  async remove(userId: string, credentialId: string): Promise<void> {
    const result = await this.prisma.biometricCredential.deleteMany({
      where: { id: credentialId, userId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Credencial biométrica não encontrada.');
    }
  }
}
