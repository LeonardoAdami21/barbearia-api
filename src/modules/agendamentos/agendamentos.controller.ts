import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '../../generated/prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { presentAgendamento } from '../barbearia/presenters';
import { UuidParam } from '../barbearia/uuid-param';
import {
  CreateAgendamentoDto,
  HorariosQuery,
  ListAgendamentosQuery,
  UpdateAgendamentoDto,
} from './agendamento.dto';
import { AgendamentosService } from './agendamentos.service';

const NAO_ENCONTRADO = 'Agendamento não encontrado.';

@ApiTags('Agendamentos')
@ApiBearerAuth()
@Controller('agendamentos')
export class AgendamentosController {
  constructor(private readonly agendamentos: AgendamentosService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista agendamentos (por dia, período, cliente ou status), em ordem de data e hora',
  })
  async list(@CurrentUser() user: User, @Query() q: ListAgendamentosQuery) {
    return (await this.agendamentos.list(user.id, q)).map(presentAgendamento);
  }

  /** Antes de ':id', senão "horarios" seria lido como id. */
  @Get('horarios')
  @ApiOperation({
    summary: 'Horários do dia para um serviço, com livre: true/false',
    description:
      'Ocupado = conflita com agendado/confirmado/concluído; também fica indisponível o que já passou ou termina depois do fechamento.',
  })
  horarios(@CurrentUser() user: User, @Query() q: HorariosQuery) {
    return this.agendamentos.horarios(user.id, q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Um agendamento' })
  async get(@CurrentUser() user: User, @UuidParam(NAO_ENCONTRADO) id: string) {
    return presentAgendamento(await this.agendamentos.get(user.id, id));
  }

  @Post()
  @ApiOperation({
    summary: 'Marca um horário',
    description:
      'Recusa data/hora que já passou, fora do funcionamento ou que choca com outro agendamento (409).',
  })
  async create(@CurrentUser() user: User, @Body() dto: CreateAgendamentoDto) {
    return presentAgendamento(await this.agendamentos.create(user.id, dto));
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Remarca, muda o status (confirmado, concluido, faltou, cancelado...) ou marca mensagens enviadas',
  })
  async update(
    @CurrentUser() user: User,
    @UuidParam(NAO_ENCONTRADO) id: string,
    @Body() dto: UpdateAgendamentoDto,
  ) {
    return presentAgendamento(await this.agendamentos.update(user.id, id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Apaga o agendamento' })
  async remove(
    @CurrentUser() user: User,
    @UuidParam(NAO_ENCONTRADO) id: string,
  ) {
    await this.agendamentos.remove(user.id, id);
  }
}
