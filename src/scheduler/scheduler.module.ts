import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PagamentoSimulatorService } from './pagamento-simulator.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [PagamentoSimulatorService],
})
export class SchedulerModule {}
