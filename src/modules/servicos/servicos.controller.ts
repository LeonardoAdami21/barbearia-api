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
import { presentServico } from '../barbearia/presenters';
import { UuidParam } from '../barbearia/uuid-param';
import { CreateServicoDto, UpdateServicoDto } from './servico.dto';
import { ServicosService } from './servicos.service';

const NAO_ENCONTRADO = 'Serviço não encontrado.';

@ApiTags('Serviços')
@ApiBearerAuth()
@Controller('servicos')
export class ServicosController {
  constructor(private readonly servicos: ServicosService) {}

  @Get()
  @ApiOperation({ summary: 'Lista os serviços ativos' })
  @ApiQuery({
    name: 'incluirInativos',
    required: false,
    type: Boolean,
    description: 'true inclui os removidos (para mostrar o nome no histórico)',
  })
  async list(
    @CurrentUser() user: User,
    @Query('incluirInativos') incluirInativos?: string,
  ) {
    const lista = await this.servicos.list(user.id, incluirInativos === 'true');
    return lista.map(presentServico);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Um serviço (inclusive removido)' })
  async get(@CurrentUser() user: User, @UuidParam(NAO_ENCONTRADO) id: string) {
    return presentServico(await this.servicos.get(user.id, id));
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra um serviço' })
  async create(@CurrentUser() user: User, @Body() dto: CreateServicoDto) {
    return presentServico(await this.servicos.create(user.id, dto));
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Altera nome, duração ou preço (vale para os próximos agendamentos)',
  })
  async update(
    @CurrentUser() user: User,
    @UuidParam(NAO_ENCONTRADO) id: string,
    @Body() dto: UpdateServicoDto,
  ) {
    return presentServico(await this.servicos.update(user.id, id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Remove o serviço dos novos agendamentos (o histórico continua)',
  })
  async remove(
    @CurrentUser() user: User,
    @UuidParam(NAO_ENCONTRADO) id: string,
  ) {
    await this.servicos.remove(user.id, id);
  }
}
