import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';

/** GET /api: confirma que a API está no ar e falando com o banco. */
@ApiTags('Status')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @SkipThrottle()
  @Get()
  @ApiOperation({ summary: 'Status da API e do banco' })
  async status() {
    const database = await this.prisma.$queryRaw`SELECT 1`
      .then(() => 'ok' as const)
      .catch(() => 'erro' as const);
    const body = {
      name: 'Barbearia API',
      status: database === 'ok' ? 'ok' : 'erro',
      database,
      docs: '/docs',
      time: new Date().toISOString(),
    };
    if (database !== 'ok') throw new ServiceUnavailableException(body);
    return body;
  }
}
