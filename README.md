# Barbearia API

API em NestJS + Prisma (Postgres) do app barbearia-app (Expo).
As rotas ficam em `/api` (`GET /api` mostra o status da API e do banco) e o Swagger em `/docs`.

## Rodando localmente

O `docker-compose.yml` sobe só o Postgres (dados em `./postgres_data`); a API roda na máquina.

```bash
cp .env.example .env              # preencha JWT_SECRET e TWO_FACTOR_ENCRYPTION_KEY (os comandos estão no arquivo)
yarn install                      # também gera o Prisma Client
docker compose up -d              # Postgres
yarn db:migrate                   # cria/aplica as migrations
yarn start:dev
```

- API: `http://localhost:<PORT>/api` · Swagger: `http://localhost:<PORT>/docs`
- No app, `EXPO_PUBLIC_API_URL` = `http://10.0.2.2:<PORT>/api` (emulador Android).

O `Dockerfile` gera uma imagem da API para produção: ao subir, ela aplica as migrations (`prisma migrate deploy`)
e inicia o servidor. Ela precisa das mesmas variáveis do `.env`, com `DATABASE_URL` apontando para o banco.

## Autenticação

| Rota | Auth | O que faz |
| --- | --- | --- |
| `POST /auth/register` | – | Cria a conta (senha de 8 a 72 caracteres) e devolve o token |
| `POST /auth/login` | – | `authenticated` com token, ou `two_factor_required` com `challengeToken` (vale 5 min) |
| `POST /auth/google` | – | Entra ou cria a conta com o `idToken` do Google (precisa de `GOOGLE_WEB_CLIENT_ID`) |
| `POST /auth/firebase` | – | Entra ou cria a conta com o ID token do Firebase Authentication (precisa do JSON em `credentials/`) |
| `POST /auth/2fa/verify` | – | 2ª etapa: código do autenticador ou código de recuperação |
| `GET /auth/me` | Bearer | Usuário logado |
| `POST /auth/2fa/setup` | Bearer | Gera o segredo e o `otpauth://` do QR code |
| `POST /auth/2fa/enable` | Bearer | Confirma o 1º código e devolve 10 códigos de recuperação |
| `POST /auth/2fa/disable` | Bearer | Desliga o 2FA (código do autenticador ou de recuperação) |

- Firebase: salve o JSON da service account (Console do Firebase → Configurações do projeto → Contas de serviço →
  Gerar nova chave privada) em `credentials/firebase-service-account.json`. A pasta é ignorada pelo git e pelo Docker.
- Todas as rotas exigem `Authorization: Bearer <token>`, menos as marcadas com `@Public()`.
- Rotas que recebem senha ou código aceitam 10 tentativas por minuto por IP (resposta 429).
- O segredo do 2FA é guardado cifrado (AES-256-GCM); os códigos de recuperação, como hash SHA-256.
  O mesmo código TOTP não é aceito duas vezes.
