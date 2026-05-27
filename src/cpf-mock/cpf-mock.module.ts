import { Global, Module } from '@nestjs/common';
import { AntifraudeMockService } from './antifraude-mock.service';
import { CpfMockService } from './cpf-mock.service';
import { OcrMockService } from './ocr-mock.service';

@Global()
@Module({
  providers: [CpfMockService, AntifraudeMockService, OcrMockService],
  exports: [CpfMockService, AntifraudeMockService, OcrMockService],
})
export class CpfMockModule {}
