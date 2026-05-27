import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequestUser } from '../auth/types';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserProfileDto } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Perfil completo do usuário autenticado' })
  @ApiOkResponse({ type: UserProfileDto })
  async me(
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<UserProfileDto> {
    const u = await this.users.findById(user.userId);
    return this.users.toProfile(u);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualiza dados do perfil (nome, email, telefone)' })
  @ApiOkResponse({ type: UserProfileDto })
  async atualizar(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: UpdateUserDto,
  ): Promise<UserProfileDto> {
    const u = await this.users.updateProfile(user.userId, dto);
    return this.users.toProfile(u);
  }
}
