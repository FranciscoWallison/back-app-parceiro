import { Module } from '@nestjs/common';
import { CorretorasController } from './corretoras.controller';
import { CorretorasService } from './corretoras.service';

@Module({
  controllers: [CorretorasController],
  providers: [CorretorasService],
  exports: [CorretorasService],
})
export class CorretorasModule {}
