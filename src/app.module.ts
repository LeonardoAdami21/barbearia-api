import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { BarbeariaModule } from './modules/barbearia/barbearia.module';
import { HealthController } from './modules/health/health.controller';
import { FirebaseModule } from './shared/firebase/firebase.module';
import { PrismaModule } from './shared/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Limite geral por IP; as rotas de login têm um limite mais baixo (@Throttle).
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }],
      errorMessage: 'Muitas tentativas. Aguarde um minuto e tente de novo.',
    }),
    PrismaModule,
    FirebaseModule,
    AuthModule,
    BarbeariaModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
