import { ApiProperty } from '@nestjs/swagger';
import { CorretoraStatus } from './corretora.dto';

export class ValidarCorretoraResponseDto {
  @ApiProperty({ example: '11222333000181' })
  cnpj!: string;

  @ApiProperty({
    description: 'true apenas quando a corretora está com status APROVADA',
    example: true,
  })
  aprovada!: boolean;

  @ApiProperty({ enum: CorretoraStatus, example: CorretoraStatus.APROVADA })
  status!: CorretoraStatus;

  @ApiProperty({
    description: 'Mensagem explicativa para exibição no app',
    example: 'Corretora apta a emitir propostas.',
  })
  mensagem!: string;
}
