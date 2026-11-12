import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  agoraNoFuso,
  conflito,
  dataValida,
  horaParaMin,
  horariosDoDia,
  jaPassou,
  normalizarTelefone,
  STATUS_QUE_OCUPAM,
} from '../barbearia/agenda.utils';
import { ClientesService } from '../clientes/clientes.service';
import { ConfigBarbeariaService } from '../config/config.service';
import { ServicosService } from '../servicos/servicos.service';
import type {
  CreateAgendamentoDto,
  HorariosQuery,
  ListAgendamentosQuery,
  Status,
  UpdateAgendamentoDto,
} from './agendamento.dto';

const NAO_ENCONTRADO = 'Agendamento não encontrado.';
const ocupa = (status: Status) =>
  (STATUS_QUE_OCUPAM as readonly string[]).includes(status);

type Tx = Prisma.TransactionClient;

@Injectable()
export class AgendamentosService {
  private readonly timeZone: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigBarbeariaService,
    private readonly servicos: ServicosService,
    private readonly clientes: ClientesService,
    env: ConfigService,
  ) {
    this.timeZone = env.get<string>('APP_TIMEZONE') || 'America/Sao_Paulo';
  }

  list(userId: string, q: ListAgendamentosQuery) {
    return this.prisma.agendamento.findMany({
      where: {
        userId,
        ...(q.clienteId && { clienteId: q.clienteId }),
        ...(q.status && { status: q.status }),
        ...(q.data
          ? { data: q.data }
          : (q.de || q.ate) && { data: { gte: q.de, lte: q.ate } }),
      },
      orderBy: [{ data: 'asc' }, { hora: 'asc' }],
    });
  }

  async get(userId: string, id: string) {
    const ag = await this.prisma.agendamento.findFirst({
      where: { id, userId },
    });
    if (!ag) throw new NotFoundException(NAO_ENCONTRADO);
    return ag;
  }

  /** Grade de horários do dia para um serviço, marcando quais estão livres. */
  async horarios(userId: string, q: HorariosQuery) {
    this.checarData(q.data);
    const [config, servico, ocupados] = await Promise.all([
      this.config.get(userId),
      this.servicos.get(userId, q.servicoId),
      this.ocupados(this.prisma, userId, q.data, q.ignorarId),
    ]);
    return horariosDoDia({
      data: q.data,
      duracaoMin: servico.duracaoMin,
      config,
      ocupados,
      agora: this.agora(),
    });
  }

  async create(userId: string, dto: CreateAgendamentoDto) {
    this.checarData(dto.data);
    // Leituras fora da transação: dentro dela só se usa o `tx` (uma conexão por agendamento).
    const [servico, config, clienteExistente] = await Promise.all([
      this.servicoAtivo(userId, dto.servicoId),
      this.config.get(userId),
      dto.novoCliente ? null : this.clientes.get(userId, dto.clienteId!),
    ]);
    this.checarHorario(config, {
      data: dto.data,
      hora: dto.hora,
      duracaoMin: servico.duracaoMin,
    });

    return this.prisma.$transaction(async (tx) => {
      await this.reservar(tx, userId, {
        data: dto.data,
        hora: dto.hora,
        duracaoMin: servico.duracaoMin,
      });
      const clienteId =
        clienteExistente?.id ??
        (await this.clienteDoTelefone(tx, userId, dto.novoCliente!));

      return tx.agendamento.create({
        data: {
          userId,
          clienteId,
          servicoId: servico.id,
          data: dto.data,
          hora: dto.hora,
          duracaoMin: servico.duracaoMin,
          preco: servico.preco,
          obs: dto.obs || null,
        },
      });
    });
  }

  async update(userId: string, id: string, dto: UpdateAgendamentoDto) {
    const ag = await this.get(userId, id);
    if (dto.data) this.checarData(dto.data);

    const trocouServico =
      dto.servicoId !== undefined && dto.servicoId !== ag.servicoId;
    const servico = trocouServico
      ? await this.servicoAtivo(userId, dto.servicoId!)
      : null;

    const data = dto.data ?? ag.data;
    const hora = dto.hora ?? ag.hora;
    const duracaoMin = servico?.duracaoMin ?? ag.duracaoMin;
    const status = dto.status ?? ag.status;
    const remarcou = trocouServico || data !== ag.data || hora !== ag.hora;
    // Só confere a agenda se o horário mudou ou se um cancelado/falta volta a ocupar a cadeira.
    const precisaConferir = ocupa(status) && (remarcou || !ocupa(ag.status));

    // Reabrir um horário antigo pode; remarcar para um horário que já passou ou fora do expediente, não.
    if (precisaConferir && remarcou) {
      this.checarHorario(await this.config.get(userId), {
        data,
        hora,
        duracaoMin,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      if (precisaConferir) {
        await this.reservar(tx, userId, {
          data,
          hora,
          duracaoMin,
          ignorarId: id,
        });
      }
      return tx.agendamento.update({
        where: { id },
        data: {
          data,
          hora,
          status,
          ...(servico && {
            servicoId: servico.id,
            duracaoMin: servico.duracaoMin,
            preco: servico.preco,
          }),
          ...(dto.obs !== undefined && { obs: dto.obs || null }),
          confirmacaoEnviada: dto.confirmacaoEnviada,
          lembreteEnviado: dto.lembreteEnviado,
        },
      });
    });
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.prisma.agendamento.delete({ where: { id } });
  }

  private agora() {
    return agoraNoFuso(this.timeZone);
  }

  private checarData(data: string) {
    if (!dataValida(data))
      throw new BadRequestException('Essa data não existe.');
  }

  private async servicoAtivo(userId: string, servicoId: string) {
    const servico = await this.servicos.get(userId, servicoId);
    if (!servico.ativo) {
      throw new BadRequestException(
        'Esse serviço foi removido. Escolha outro.',
      );
    }
    return servico;
  }

  /** Cadastro rápido na tela de novo agendamento: reaproveita o cliente se o telefone já existe. */
  private async clienteDoTelefone(
    tx: Tx,
    userId: string,
    novo: { nome: string; telefone: string; obs?: string },
  ) {
    const telefoneNormalizado = normalizarTelefone(novo.telefone);
    const cliente = await tx.cliente.upsert({
      where: { userId_telefoneNormalizado: { userId, telefoneNormalizado } },
      update: {},
      create: {
        userId,
        nome: novo.nome,
        telefone: novo.telefone.replace(/\D/g, ''),
        telefoneNormalizado,
        obs: novo.obs || null,
      },
    });
    return cliente.id;
  }

  private ocupados(db: Tx, userId: string, data: string, ignorarId?: string) {
    return db.agendamento.findMany({
      where: {
        userId,
        data,
        status: { in: [...STATUS_QUE_OCUPAM] },
        ...(ignorarId && { id: { not: ignorarId } }),
      },
      select: {
        id: true,
        hora: true,
        duracaoMin: true,
        cliente: { select: { nome: true } },
      },
    });
  }

  /** Regras que não dependem dos outros agendamentos: não pode ser no passado nem fora do expediente. */
  private checarHorario(
    config: { abertura: string; fechamento: string },
    p: { data: string; hora: string; duracaoMin: number },
  ) {
    if (jaPassou(p.data, p.hora, this.agora())) {
      throw new BadRequestException('Esse horário já passou.');
    }
    const ini = horaParaMin(p.hora);
    if (
      ini < horaParaMin(config.abertura) ||
      ini + p.duracaoMin > horaParaMin(config.fechamento)
    ) {
      throw new BadRequestException(
        `Fora do horário de funcionamento (${config.abertura} às ${config.fechamento}).`,
      );
    }
  }

  /** Dentro da transação: trava o dia e confere se o horário não choca com outro. */
  private async reservar(
    tx: Tx,
    userId: string,
    p: { data: string; hora: string; duracaoMin: number; ignorarId?: string },
  ) {
    // Uma reserva por vez para o mesmo dia da mesma barbearia: evita dois agendamentos
    // simultâneos no mesmo horário. O lock é liberado no fim da transação.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${userId}:${p.data}`}))`;

    const ocupados = await this.ocupados(tx, userId, p.data, p.ignorarId);
    const choque = conflito(p.hora, p.duracaoMin, ocupados);
    if (choque) {
      const outro = ocupados.find((o) => o.id === choque.id)!;
      throw new ConflictException(
        `Horário ocupado: ${outro.cliente.nome} está marcado às ${outro.hora}.`,
      );
    }
  }
}
