import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '../../generated/prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { presentConfig } from '../barbearia/presenters';
import { UpdateConfigDto } from './config.dto';
import { ConfigBarbeariaService } from './config.service';

@ApiTags('Ajustes')
@ApiBearerAuth()
@Controller('config')
export class ConfigController {
  constructor(private readonly config: ConfigBarbeariaService) {}

  @Get()
  @ApiOperation({
    summary: 'Ajustes da barbearia (horário, intervalo, mensagens...)',
  })
  async get(@CurrentUser() user: User) {
    return presentConfig(await this.config.get(user.id));
  }

  @Patch()
  @ApiOperation({
    summary: 'Altera os ajustes (mande só os campos que mudaram)',
  })
  async update(@CurrentUser() user: User, @Body() dto: UpdateConfigDto) {
    return presentConfig(await this.config.update(user.id, dto));
  }
}
