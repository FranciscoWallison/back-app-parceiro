import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequestUser } from '../auth/types';
import {
  EnviarTestePushDto,
  RegistrarTokenDto,
  RemoverTokenDto,
} from './dto/push.dto';
import { PushService } from './push.service';

class TokenIdResponseDto {
  id!: string;
}

class CountResponseDto {
  sent!: number;
}

@ApiTags('push')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Post('register-token')
  @ApiOperation({
    summary: 'Registra ou atualiza FCM token do device para o user autenticado',
    description:
      'Chamado pelo app após receber o token FCM. Se o token já existe, ' +
      'apenas atualiza ownership (usuário trocou de conta no mesmo device).',
  })
  @ApiOkResponse({ type: TokenIdResponseDto })
  registrar(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: RegistrarTokenDto,
  ): Promise<{ id: string }> {
    return this.push.registrarToken(user.userId, dto);
  }

  @Delete('register-token')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove token (logout / desativar push neste device)' })
  async remover(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: RemoverTokenDto,
  ): Promise<void> {
    await this.push.removerToken(user.userId, dto.fcmToken);
  }

  @Post('test')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Envia push de teste para todos os devices do user autenticado',
  })
  @ApiOkResponse({ type: CountResponseDto })
  async testar(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: EnviarTestePushDto,
  ): Promise<{ sent: number }> {
    const sent = await this.push.sendToUser(user.userId, {
      title: dto.title ?? 'Teste do App Corretor',
      body: dto.body ?? 'Se você está vendo isto, push notifications funcionam! 🎉',
      data: dto.data ?? { tipo: 'teste' },
    });
    return { sent };
  }
}
