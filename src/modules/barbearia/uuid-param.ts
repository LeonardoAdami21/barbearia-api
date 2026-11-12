import { NotFoundException, Param, ParseUUIDPipe } from '@nestjs/common';

/** @Param('id') que responde 404 com a mensagem certa quando o id nem é um UUID. */
export const UuidParam = (mensagem: string, nome = 'id') =>
  Param(
    nome,
    new ParseUUIDPipe({
      exceptionFactory: () => new NotFoundException(mensagem),
    }),
  );
