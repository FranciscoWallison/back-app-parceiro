import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AssinarDto {
  @ApiProperty({
    description: 'PNG da assinatura em base64 (pode incluir prefixo data:image/png;base64,)',
    example: 'iVBORw0KGgoAAAA...',
  })
  @IsString()
  @MinLength(50)
  @MaxLength(2_000_000)
  assinaturaPngBase64!: string;
}
