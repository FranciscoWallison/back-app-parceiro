import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FaqItemDto } from './dto/faq.dto';
import { FaqService } from './faq.service';

@ApiTags('faq')
@Controller('faq')
export class FaqController {
  constructor(private readonly service: FaqService) {}

  @Get()
  @ApiOperation({ summary: 'Lista perguntas frequentes (público — não exige auth)' })
  @ApiOkResponse({ type: [FaqItemDto] })
  listar(): Promise<FaqItemDto[]> {
    return this.service.listar();
  }
}
