import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import type { CreateServicoDto, UpdateServicoDto } from './servico.dto';

const NAO_ENCONTRADO = 'Serviço não encontrado.';

@Injectable()
export class ServicosService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string, incluirInativos = false) {
    return this.prisma.servico.findMany({
      where: { userId, ...(!incluirInativos && { ativo: true }) },
      orderBy: { createdAt: 'asc' },
    });
  }

  async get(userId: string, id: string) {
    const servico = await this.prisma.servico.findFirst({
      where: { id, userId },
    });
    if (!servico) throw new NotFoundException(NAO_ENCONTRADO);
    return servico;
  }

  create(userId: string, dto: CreateServicoDto) {
    return this.prisma.servico.create({
      data: {
        userId,
        nome: dto.nome,
        duracaoMin: dto.duracaoMin,
        preco: dto.preco,
      },
    });
  }

  /** Muda o serviço daqui para frente; agendamentos já feitos guardam a duração e o preço antigos. */
  async update(userId: string, id: string, dto: UpdateServicoDto) {
    const servico = await this.get(userId, id);
    if (!servico.ativo) throw new NotFoundException(NAO_ENCONTRADO);
    return this.prisma.servico.update({ where: { id }, data: dto });
  }

  /** Esconde dos novos agendamentos, mas mantém no histórico. Sempre sobra pelo menos um. */
  async remove(userId: string, id: string) {
    const servico = await this.get(userId, id);
    if (!servico.ativo) throw new NotFoundException(NAO_ENCONTRADO);
    const ativos = await this.prisma.servico.count({
      where: { userId, ativo: true },
    });
    if (ativos <= 1)
      throw new BadRequestException('Mantenha pelo menos um serviço.');
    await this.prisma.servico.update({ where: { id }, data: { ativo: false } });
  }
}
