import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { StatusProposta, TipoDocumento, TipoProposta } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequestUser } from '../auth/types';
import { GerarPagamentoDto } from './dto/acoes.dto';
import { AssinarDto } from './dto/assinar.dto';
import { CriarPropostaDto } from './dto/criar-proposta.dto';
import {
  PropostaDetalheDto,
  PropostaResumoDto,
} from './dto/proposta-response.dto';
import { PropostasService } from './propostas.service';

class UrlResponseDto {
  url!: string;
}

@ApiTags('propostas')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('propostas')
export class PropostasController {
  constructor(private readonly service: PropostasService) {}

  @Post()
  @ApiOperation({ summary: 'Cria proposta (PF ou PME) em RASCUNHO' })
  @ApiOkResponse({ type: PropostaDetalheDto })
  criar(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: CriarPropostaDto,
  ): Promise<PropostaDetalheDto> {
    return this.service.criar(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista propostas do corretor autenticado' })
  @ApiQuery({ name: 'status', enum: StatusProposta, required: false })
  @ApiQuery({ name: 'tipo', enum: TipoProposta, required: false })
  @ApiOkResponse({ type: [PropostaResumoDto] })
  listar(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query('status') status?: StatusProposta,
    @Query('tipo') tipo?: TipoProposta,
  ): Promise<PropostaResumoDto[]> {
    return this.service.listar(user.userId, { status, tipo });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de uma proposta' })
  @ApiOkResponse({ type: PropostaDetalheDto })
  detalhe(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PropostaDetalheDto> {
    return this.service.detalhe(user.userId, id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Apaga rascunho/simulação' })
  async apagar(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.service.deletarRascunho(user.userId, id);
  }

  @Post(':id/simular')
  @HttpCode(200)
  @ApiOperation({ summary: 'Marca proposta como SIMULADA' })
  simular(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PropostaDetalheDto> {
    return this.service.simular(user.userId, id);
  }

  @Post(':id/documentos')
  @UseInterceptors(FileInterceptor('arquivo'))
  @ApiOperation({
    summary: 'Upload de documento (multipart, arquivo binário) — salva em MinIO',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tipo: { type: 'string', enum: Object.values(TipoDocumento) },
        arquivo: { type: 'string', format: 'binary' },
      },
      required: ['tipo', 'arquivo'],
    },
  })
  anexarDoc(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() arquivo: Express.Multer.File,
    @Body('tipo') tipo: TipoDocumento,
  ): Promise<PropostaDetalheDto> {
    return this.service.anexarDocumento(user.userId, id, tipo, arquivo);
  }

  @Get(':id/documentos/:docId/url')
  @ApiOperation({ summary: 'URL presigned (TTL 5min) para baixar o documento' })
  @ApiOkResponse({ type: UrlResponseDto })
  urlDocumento(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
  ): Promise<{ url: string }> {
    return this.service.urlDocumento(user.userId, id, docId);
  }

  @Post(':id/documentos/concluir')
  @HttpCode(200)
  @ApiOperation({ summary: 'Marca docs concluídos, avança para AGUARDANDO_ASSINATURA' })
  concluirDocs(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PropostaDetalheDto> {
    return this.service.marcarDocsConcluidos(user.userId, id);
  }

  @Post(':id/assinatura')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Assina proposta (PNG glass signature), gera PDF e avança',
  })
  assinar(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssinarDto,
  ): Promise<PropostaDetalheDto> {
    return this.service.assinar(user.userId, id, dto);
  }

  @Get(':id/assinatura/pdf-url')
  @ApiOperation({ summary: 'URL presigned (TTL 10min) do PDF assinado' })
  @ApiOkResponse({ type: UrlResponseDto })
  urlAssinatura(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ url: string }> {
    return this.service.urlAssinatura(user.userId, id);
  }

  @Post(':id/pagamento')
  @ApiOperation({ summary: 'Gera pagamento PIX/BOLETO mock (cron confirma após 30s)' })
  gerarPagamento(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GerarPagamentoDto,
  ): Promise<PropostaDetalheDto> {
    return this.service.gerarPagamento(user.userId, id, dto);
  }

  @Post(':id/pagamento/confirmar')
  @HttpCode(200)
  @ApiOperation({
    summary: '(Manual) Força confirmação — o cron já faz isso após 30s',
  })
  confirmarPagamento(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PropostaDetalheDto> {
    return this.service.confirmarPagamento(user.userId, id);
  }

  @Post(':id/aprovar')
  @HttpCode(200)
  @ApiOperation({ summary: '(Admin) Marca como APROVADA' })
  aprovar(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PropostaDetalheDto> {
    return this.service.aprovar(user.userId, id);
  }

  @Post(':id/recusar')
  @HttpCode(200)
  @ApiOperation({ summary: '(Admin) Marca como RECUSADA' })
  recusar(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { motivo?: string },
  ): Promise<PropostaDetalheDto> {
    return this.service.recusar(user.userId, id, body?.motivo);
  }

  @Post(':id/cancelar')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancela proposta' })
  cancelar(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PropostaDetalheDto> {
    return this.service.cancelar(user.userId, id);
  }
}
