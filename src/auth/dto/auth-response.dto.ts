import { ApiProperty } from '@nestjs/swagger';
import { UserProfileDto } from '../../users/dto/user.dto';

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT de acesso (TTL curto, ~15 minutos)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'JWT de refresh (TTL longo, ~7 dias). Usado em /auth/refresh',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken!: string;

  @ApiProperty({ type: () => UserProfileDto })
  user!: UserProfileDto;
}

export class OkResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;
}
