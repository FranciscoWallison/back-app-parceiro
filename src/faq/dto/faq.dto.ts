import { ApiProperty } from '@nestjs/swagger';

export class FaqItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() pergunta!: string;
  @ApiProperty() resposta!: string;
  @ApiProperty() categoria!: string;
  @ApiProperty() ordem!: number;
}
