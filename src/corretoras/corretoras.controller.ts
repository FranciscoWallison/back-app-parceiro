import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CorretorasService } from './corretoras.service';
import { CorretoraDto } from './dto/corretora.dto';
import { ValidarCorretoraResponseDto } from './dto/validar-corretora-response.dto';

@ApiTags('corretoras')
@Controller('corretoras')
export class CorretorasController {
  constructor(private readonly corretorasService: CorretorasService) {}

  @Get()
  @ApiOperation({ summary: 'Lista todas as corretoras cadastradas' })
  @ApiOkResponse({ type: [CorretoraDto] })
  findAll(): Promise<CorretoraDto[]> {
    return this.corretorasService.findAll();
  }

  @Get(':cnpj')
  @ApiOperation({ summary: 'Busca uma corretora pelo CNPJ' })
  @ApiParam({
    name: 'cnpj',
    description: 'CNPJ com ou sem máscara (será normalizado)',
    example: '11222333000181',
  })
  @ApiOkResponse({ type: CorretoraDto })
  @ApiNotFoundResponse({ description: 'Corretora não encontrada' })
  findByCnpj(@Param('cnpj') cnpj: string): Promise<CorretoraDto> {
    return this.corretorasService.findByCnpj(cnpj);
  }

  @Get(':cnpj/validar')
  @ApiOperation({
    summary: 'Valida se a corretora está apta a emitir propostas',
    description:
      'Retorna `aprovada: true` apenas quando o status é APROVADA. ' +
      'Usado pelo app mobile no fluxo de login do corretor.',
  })
  @ApiParam({
    name: 'cnpj',
    description: 'CNPJ com ou sem máscara',
    example: '11222333000181',
  })
  @ApiOkResponse({ type: ValidarCorretoraResponseDto })
  @ApiNotFoundResponse({ description: 'Corretora não encontrada' })
  validar(@Param('cnpj') cnpj: string): Promise<ValidarCorretoraResponseDto> {
    return this.corretorasService.validar(cnpj);
  }
}
