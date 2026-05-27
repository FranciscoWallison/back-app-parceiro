import { Module } from '@nestjs/common';
import { LembretesSimulatorService } from './lembretes-simulator.service';
import { OperadoraSimulatorService } from './operadora-simulator.service';

@Module({
  providers: [OperadoraSimulatorService, LembretesSimulatorService],
})
export class SimuladoresModule {}
