import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '../../generated/prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ConfigBarbeariaService } from '../config/config.service';
import {
  presentAgendamento,
  presentCliente,
  presentConfig,
  presentServico,
} from './presenters';

@ApiTags('Estado')
@ApiBearerAuth()
@Controller('estado')
export class EstadoController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigBarbeariaService,
  ) {}

  /**
   * Tudo da barbearia numa chamada, no formato do `State` do app (store/store.tsx).
   * Serve para o app carregar ao abrir, no lugar do AsyncStorage.
   */
  @Get()
  @ApiOperation({
    summary:
      'Config, serviços, clientes e agendamentos numa chamada (formato State do app)',
    description:
      'Os serviços vêm com `ativo`: os removidos (ativo=false) aparecem só para mostrar o nome no histórico.',
  })
  async get(@CurrentUser() user: User) {
    const [config, servicos, clientes, agendamentos] = await Promise.all([
      this.config.get(user.id),
      this.prisma.servico.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.cliente.findMany({
        where: { userId: user.id },
        orderBy: { nome: 'asc' },
      }),
      this.prisma.agendamento.findMany({
        where: { userId: user.id },
        orderBy: [{ data: 'asc' }, { hora: 'asc' }],
      }),
    ]);
    return {
      config: presentConfig(config),
      servicos: servicos.map(presentServico),
      clientes: clientes.map(presentCliente),
      agendamentos: agendamentos.map(presentAgendamento),
    };
  }
}
