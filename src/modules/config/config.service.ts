import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { horaParaMin } from '../barbearia/agenda.utils';
import { CONFIG_PADRAO } from '../barbearia/defaults';
import type { UpdateConfigDto } from './config.dto';

@Injectable()
export class ConfigBarbeariaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Toda conta nasce com config, mas o upsert cobre contas antigas sem ela. */
  get(userId: string) {
    return this.prisma.config.upsert({
      where: { userId },
      update: {},
      create: { userId, ...CONFIG_PADRAO },
    });
  }

  async update(userId: string, dto: UpdateConfigDto) {
    const atual = await this.get(userId);
    const abertura = dto.abertura ?? atual.abertura;
    const fechamento = dto.fechamento ?? atual.fechamento;
    if (horaParaMin(fechamento) <= horaParaMin(abertura)) {
      throw new BadRequestException(
        'O fechamento precisa ser depois da abertura.',
      );
    }
    return this.prisma.config.update({ where: { userId }, data: dto });
  }
}
