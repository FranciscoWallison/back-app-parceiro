import { ApiProperty } from '@nestjs/swagger';
import { TipoMaterial } from '@prisma/client';

export class MaterialDto {
  @ApiProperty() id!: string;
  @ApiProperty() titulo!: string;
  @ApiProperty() descricao!: string;
  @ApiProperty({ enum: TipoMaterial }) tipo!: TipoMaterial;
  @ApiProperty({ nullable: true }) thumbnail!: string | null;
  @ApiProperty() ordem!: number;
}

export class MaterialDownloadDto {
  @ApiProperty() id!: string;
  @ApiProperty() titulo!: string;
  @ApiProperty({ description: 'URL mock — em prod seria S3 presigned URL' })
  url!: string;
}
