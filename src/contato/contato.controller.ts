import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequestUser } from '../auth/types';
import { ContatoService } from './contato.service';
import { ContatoCriadoDto, EnviarContatoDto } from './dto/contato.dto';

@ApiTags('contato')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('contato')
export class ContatoController {
  constructor(private readonly service: ContatoService) {}

  @Post()
  @ApiOperation({ summary: 'Envia mensagem de contato ao suporte (stub — log)' })
  @ApiOkResponse({ type: ContatoCriadoDto })
  enviar(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: EnviarContatoDto,
  ): Promise<ContatoCriadoDto> {
    return this.service.enviar(user.userId, dto);
  }
}
