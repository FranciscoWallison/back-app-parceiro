import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MaterialDownloadDto, MaterialDto } from './dto/material.dto';
import { MateriaisService } from './materiais.service';

@ApiTags('materiais')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('materiais')
export class MateriaisController {
  constructor(private readonly service: MateriaisService) {}

  @Get()
  @ApiOperation({ summary: 'Lista materiais promocionais ativos' })
  @ApiOkResponse({ type: [MaterialDto] })
  listar(): Promise<MaterialDto[]> {
    return this.service.listar();
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Devolve URL de download (mock)' })
  @ApiOkResponse({ type: MaterialDownloadDto })
  download(@Param('id', ParseUUIDPipe) id: string): Promise<MaterialDownloadDto> {
    return this.service.download(id);
  }
}
