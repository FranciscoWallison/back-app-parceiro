import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlanoDto } from './dto/plano.dto';
import { PlanosService } from './planos.service';

@ApiTags('planos')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('planos')
export class PlanosController {
  constructor(private readonly service: PlanosService) {}

  @Get()
  @ApiOperation({ summary: 'Catálogo de planos ativos' })
  @ApiOkResponse({ type: [PlanoDto] })
  findAll(): Promise<PlanoDto[]> {
    return this.service.findAll();
  }
}
