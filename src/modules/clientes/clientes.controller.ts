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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { User } from '../../generated/prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { presentCliente } from '../barbearia/presenters';
import { UuidParam } from '../barbearia/uuid-param';
import { CreateClienteDto, UpdateClienteDto } from './cliente.dto';
import { ClientesService } from './clientes.service';

const NAO_ENCONTRADO = 'Cliente não encontrado.';

@ApiTags('Clientes')
@ApiBearerAuth()
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os clientes (com estatísticas de visitas e faltas)',
  })
  @ApiQuery({
    name: 'busca',
    required: false,
    description: 'Parte do nome ou do telefone',
  })
  @ApiQuery({
    name: 'comAlerta',
    required: false,
    type: Boolean,
    description: 'true = só quem atingiu o limite de faltas',
  })
  async list(
    @CurrentUser() user: User,
    @Query('busca') busca?: string,
    @Query('comAlerta') comAlerta?: string,
  ) {
    const lista = await this.clientes.list(user.id, busca);
    const stats = await this.clientes.estatisticasDe(
      user.id,
      lista.map((c) => c.id),
    );
    return lista
      .map((c) => ({ ...presentCliente(c), estatisticas: stats.get(c.id)! }))
      .filter((c) => comAlerta !== 'true' || c.estatisticas.alerta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Um cliente com as estatísticas' })
  async get(@CurrentUser() user: User, @UuidParam(NAO_ENCONTRADO) id: string) {
    const cliente = await this.clientes.get(user.id, id);
    const stats = await this.clientes.estatisticasDe(user.id, [id]);
    return { ...presentCliente(cliente), estatisticas: stats.get(id)! };
  }

  @Post()
  @ApiOperation({
    summary: 'Cadastra um cliente (o telefone não pode repetir)',
  })
  async create(@CurrentUser() user: User, @Body() dto: CreateClienteDto) {
    return presentCliente(await this.clientes.create(user.id, dto));
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Altera nome, telefone ou observações ("" apaga a observação)',
  })
  async update(
    @CurrentUser() user: User,
    @UuidParam(NAO_ENCONTRADO) id: string,
    @Body() dto: UpdateClienteDto,
  ) {
    return presentCliente(await this.clientes.update(user.id, id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Apaga o cliente e todos os agendamentos dele' })
  async remove(
    @CurrentUser() user: User,
    @UuidParam(NAO_ENCONTRADO) id: string,
  ) {
    await this.clientes.remove(user.id, id);
  }
}
