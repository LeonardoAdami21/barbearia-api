import { Module } from '@nestjs/common';
import { AgendamentosController } from '../agendamentos/agendamentos.controller';
import { AgendamentosService } from '../agendamentos/agendamentos.service';
import { ClientesController } from '../clientes/clientes.controller';
import { ClientesService } from '../clientes/clientes.service';
import { ConfigController } from '../config/config.controller';
import { ConfigBarbeariaService } from '../config/config.service';
import { ServicosController } from '../servicos/servicos.controller';
import { ServicosService } from '../servicos/servicos.service';
import { EstadoController } from './estado.controller';

/** Dados da barbearia: tudo é sempre filtrado pelo usuário logado. */
@Module({
  controllers: [
    ConfigController,
    ServicosController,
    ClientesController,
    AgendamentosController,
    EstadoController,
  ],
  providers: [
    ConfigBarbeariaService,
    ServicosService,
    ClientesService,
    AgendamentosService,
  ],
})
export class BarbeariaModule {}
