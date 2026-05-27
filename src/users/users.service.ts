import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserProfileDto } from './dto/user.dto';

export type UserWithCorretora = Prisma.UserGetPayload<{
  include: { corretora: true };
}>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByCpf(cpf: string): Promise<UserWithCorretora | null> {
    const digits = cpf.replace(/\D/g, '');
    return this.prisma.user.findUnique({
      where: { cpf: digits },
      include: { corretora: true },
    });
  }

  async findById(id: string): Promise<UserWithCorretora> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { corretora: true },
    });
    if (!user) {
      throw new NotFoundException(`Usuário ${id} não encontrado.`);
    }
    return user;
  }

  toProfile(user: UserWithCorretora): UserProfileDto {
    return {
      id: user.id,
      cpf: user.cpf,
      nome: user.nome,
      email: user.email,
      corretoraCnpj: user.corretora.cnpj,
    };
  }

  async updateProfile(
    id: string,
    dto: UpdateUserDto,
  ): Promise<UserWithCorretora> {
    if (dto.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('E-mail já em uso por outro usuário.');
      }
    }
    return this.prisma.user.update({
      where: { id },
      data: {
        nome: dto.nome,
        email: dto.email,
        telefone: dto.telefone,
      },
      include: { corretora: true },
    });
  }

  async validateCredentials(
    cpf: string,
    senha: string,
  ): Promise<UserWithCorretora | null> {
    const user = await this.findByCpf(cpf);
    if (!user || !user.ativo) return null;
    const ok = await bcrypt.compare(senha, user.senhaHash);
    return ok ? user : null;
  }
}
