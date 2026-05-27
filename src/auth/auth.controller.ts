import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserProfileDto } from '../users/dto/user.dto';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { AuthResponseDto, OkResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PasswordResetService } from './password-reset.service';
import type { AuthenticatedRequestUser } from './types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordReset: PasswordResetService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Login com CPF + senha',
    description:
      'Retorna um par de tokens JWT (access curto + refresh longo). ' +
      'Use o accessToken no header `Authorization: Bearer <token>` para chamadas autenticadas.',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'CPF ou senha inválidos' })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Renova o par de tokens usando o refresh token',
    description:
      'O refresh token é rotacionado: o antigo é revogado e um novo par é emitido.',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Refresh token inválido, expirado ou revogado' })
  refresh(@Body() dto: RefreshDto): Promise<AuthResponseDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Revoga o refresh token',
    description: 'Idempotente — tokens inválidos retornam 200 também.',
  })
  @ApiOkResponse({ type: OkResponseDto })
  async logout(@Body() dto: RefreshDto): Promise<OkResponseDto> {
    await this.authService.logout(dto.refreshToken);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Retorna o perfil do usuário autenticado' })
  @ApiOkResponse({ type: UserProfileDto })
  @ApiUnauthorizedResponse({ description: 'Access token inválido ou ausente' })
  me(@CurrentUser() user: AuthenticatedRequestUser): Promise<UserProfileDto> {
    return this.authService.getProfile(user.userId);
  }

  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Inicia recuperação de senha',
    description:
      'Sempre retorna 200 (não vaza existência de CPF). Em dev, o token é logado no console do backend; em prod enviaria email/SMS.',
  })
  @ApiOkResponse({ type: OkResponseDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<OkResponseDto> {
    await this.passwordReset.iniciar(dto.cpf);
    return { ok: true };
  }

  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Conclui troca de senha com token' })
  @ApiOkResponse({ type: OkResponseDto })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<OkResponseDto> {
    await this.passwordReset.resetar(dto.token, dto.novaSenha);
    return { ok: true };
  }
}
