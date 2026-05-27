import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService, UserWithCorretora } from '../users/users.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.validateCredentials(dto.cpf, dto.senha);
    if (!user) {
      throw new UnauthorizedException('CPF ou senha inválidos.');
    }
    return this.respondWithTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);
    const user = await this.usersService.findById(payload.sub);
    if (!user.ativo) {
      throw new UnauthorizedException('Usuário inativo.');
    }
    await this.tokenService.revokeRefreshToken(payload);
    return this.respondWithTokens(user);
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = await this.tokenService.verifyRefreshToken(refreshToken);
      await this.tokenService.revokeRefreshToken(payload);
    } catch {
      // idempotente
    }
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    return this.usersService.toProfile(user);
  }

  private async respondWithTokens(
    user: UserWithCorretora,
  ): Promise<AuthResponseDto> {
    const tokens = await this.tokenService.issueTokenPair({
      id: user.id,
      cpf: user.cpf,
      corretoraCnpj: user.corretora.cnpj,
    });
    return { ...tokens, user: this.usersService.toProfile(user) };
  }
}
