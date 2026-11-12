import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { estatisticas, normalizarTelefone } from '../barbearia/agenda.utils';
import { ConfigBarbeariaService } from '../config/config.service';
import type { CreateClienteDto, UpdateClienteDto } from './cliente.dto';

const NAO_ENCONTRADO = 'Cliente não encontrado.';

@Injectable()
export class ClientesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigBarbeariaService,
  ) {}

  /** Busca por parte do nome ou do telefone, como a busca do app. */
  list(userId: string, busca?: string) {
    const termo = busca?.trim();
    const digitos = termo?.replace(/\D/g, '');
    return this.prisma.cliente.findMany({
      where: {
        userId,
        ...(termo && {
          OR: [
            { nome: { contains: termo, mode: 'insensitive' } },
            ...(digitos ? [{ telefone: { contains: digitos } }] : []),
          ],
        }),
      },
      orderBy: { nome: 'asc' },
    });
  }

  async get(userId: string, id: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id, userId },
    });
    if (!cliente) throw new NotFoundException(NAO_ENCONTRADO);
    return cliente;
  }

  /** Estatísticas de vários clientes com uma consulta só (lista com o filtro "Com faltas"). */
  async estatisticasDe(userId: string, clienteIds: string[]) {
    const [config, grupos] = await Promise.all([
      this.config.get(userId),
      this.prisma.agendamento.groupBy({
        by: ['clienteId', 'status'],
        where: { userId, clienteId: { in: clienteIds } },
        _count: { _all: true },
      }),
    ]);
    const contagens = new Map<string, Record<string, number>>();
    for (const g of grupos) {
      const atual = contagens.get(g.clienteId) ?? {};
      atual[g.status] = g._count._all;
      contagens.set(g.clienteId, atual);
    }
    return new Map(
      clienteIds.map((id) => [
        id,
        estatisticas(contagens.get(id) ?? {}, config.limiteFaltas),
      ]),
    );
  }

  async create(userId: string, dto: CreateClienteDto) {
    await this.garantirTelefoneLivre(userId, dto.telefone);
    return this.salvar(() =>
      this.prisma.cliente.create({
        data: {
          userId,
          nome: dto.nome,
          telefone: dto.telefone.replace(/\D/g, ''),
          telefoneNormalizado: normalizarTelefone(dto.telefone),
          obs: dto.obs || null,
        },
      }),
    );
  }

  async update(userId: string, id: string, dto: UpdateClienteDto) {
    await this.get(userId, id);
    if (dto.telefone)
      await this.garantirTelefoneLivre(userId, dto.telefone, id);
    return this.salvar(() =>
      this.prisma.cliente.update({
        where: { id },
        data: {
          nome: dto.nome,
          ...(dto.telefone && {
            telefone: dto.telefone.replace(/\D/g, ''),
            telefoneNormalizado: normalizarTelefone(dto.telefone),
          }),
          // "" apaga a observação
          ...(dto.obs !== undefined && { obs: dto.obs || null }),
        },
      }),
    );
  }

  /** Apaga o cliente e o histórico de agendamentos dele (cascade no banco). */
  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.prisma.cliente.delete({ where: { id } });
  }

  private async garantirTelefoneLivre(
    userId: string,
    telefone: string,
    ignorarId?: string,
  ) {
    const outro = await this.prisma.cliente.findFirst({
      where: {
        userId,
        telefoneNormalizado: normalizarTelefone(telefone),
        ...(ignorarId && { id: { not: ignorarId } }),
      },
    });
    if (outro)
      throw new ConflictException(
        `Telefone já cadastrado: este número é de ${outro.nome}.`,
      );
  }

  /** Corrida entre duas requisições com o mesmo telefone cai no índice único. */
  private async salvar<T>(op: () => Promise<T>) {
    try {
      return await op();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Telefone já cadastrado para outro cliente.',
        );
      }
      throw error;
    }
  }
}
