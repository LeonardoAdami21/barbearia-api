import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // O app usa EXPO_PUBLIC_API_URL terminando em /api.
  app.setGlobalPrefix('api');
  app.enableCors({
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    requiredHeaders: ['Content-Type', 'Authorization'],
    origin: '*',
  });
  app.enableShutdownHooks();
  app.useGlobalPipes(
    // whitelist descarta campos desconhecidos em vez de recusar a requisição.
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const swagger = new DocumentBuilder()
    .setTitle('Barbearia API')
    .setDescription(
      'API do app da barbearia: contas, login com Google e verificação em duas etapas.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  // A API fica em /api e o Swagger em /docs (fora do prefixo).
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));

  const port = process.env.PORT ?? 3000;
  // 0.0.0.0 para o celular/emulador na rede conseguir acessar.
  await app.listen(port, '0.0.0.0');
  console.log(
    `API: http://localhost:${port}/api · Swagger: http://localhost:${port}/docs`,
  );
}
void bootstrap();
