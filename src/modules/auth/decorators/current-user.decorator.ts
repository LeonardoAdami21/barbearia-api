import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '../../../generated/prisma/client';

/** Usuário autenticado, carregado do banco pelo JwtAuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User =>
    ctx.switchToHttp().getRequest<{ user: User }>().user,
);
