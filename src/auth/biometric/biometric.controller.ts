import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../current-user.decorator';
import { AuthResponseDto, OkResponseDto } from '../dto/auth-response.dto';
import { JwtAuthGuard } from '../jwt-auth.guard';
import type { AuthenticatedRequestUser } from '../types';
import { BiometricService } from './biometric.service';
import {
  BiometricCredentialDto,
  EnrollBiometricResponseDto,
} from './dto/biometric-credential.dto';
import { BiometricLoginDto } from './dto/biometric-login.dto';
import { EnrollBiometricDto } from './dto/enroll-biometric.dto';

@ApiTags('auth-biometric')
@Controller('auth/biometric')
export class BiometricController {
  constructor(private readonly biometricService: BiometricService) {}

  @Post('enroll')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Registra biometria do device para o usuário autenticado',
    description:
      'Chamado APÓS um login normal bem-sucedido, quando o app pergunta ' +
      '"Deseja habilitar biometria neste device?". O cliente recebe um ' +
      '`biometricToken` opaco que deve ser salvo no Keystore (Android) ' +
      'ou Keychain (iOS) protegido por biometria. Re-enrollar no mesmo ' +
      'device substitui a credencial anterior.',
  })
  @ApiOkResponse({ type: EnrollBiometricResponseDto })
  enroll(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: EnrollBiometricDto,
  ): Promise<EnrollBiometricResponseDto> {
    return this.biometricService.enroll(user.userId, dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Login via biometria já cadastrada',
    description:
      'Não requer Bearer token. Cliente desbloqueia o `biometricToken` ' +
      'do Keystore/Keychain usando biometria nativa (FaceID/TouchID/Android ' +
      'Biometric) e envia aqui junto com o deviceId. Retorna o mesmo par ' +
      'de tokens que um login com CPF + senha.',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Credencial biométrica inválida ou device incorreto' })
  login(@Body() dto: BiometricLoginDto): Promise<AuthResponseDto> {
    return this.biometricService.login(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lista as credenciais biométricas do usuário' })
  @ApiOkResponse({ type: [BiometricCredentialDto] })
  list(
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<BiometricCredentialDto[]> {
    return this.biometricService.list(user.userId);
  }

  @Delete(':credentialId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Remove uma credencial biométrica' })
  @ApiOkResponse({ type: OkResponseDto })
  async remove(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('credentialId', ParseUUIDPipe) credentialId: string,
  ): Promise<OkResponseDto> {
    await this.biometricService.remove(user.userId, credentialId);
    return { ok: true };
  }
}
