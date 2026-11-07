import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AccessTokenPayload } from '../token.types';

/** Guard global: toda rota exige `Authorization: Bearer <token>`, exceto as marcadas com @Public(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Faça login para continuar.');
    }

    const payload = await this.jwt
      .verifyAsync<AccessTokenPayload>(token)
      .catch(() => null);
    if (payload?.typ !== 'access') {
      throw new UnauthorizedException('Sessão expirada. Entre novamente.');
    }

    // Recarrega do banco: conta apagada derruba a sessão na hora.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user)
      throw new UnauthorizedException('Sessão expirada. Entre novamente.');

    (request as Request & { user: unknown }).user = user;
    return true;
  }
}
