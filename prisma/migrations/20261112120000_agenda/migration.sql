-- CreateEnum
CREATE TYPE "StatusAgendamento" AS ENUM ('agendado', 'confirmado', 'concluido', 'faltou', 'cancelado');

-- CreateTable
CREATE TABLE "configs" (
    "userId" UUID NOT NULL,
    "nomeBarbearia" TEXT NOT NULL,
    "abertura" VARCHAR(5) NOT NULL,
    "fechamento" VARCHAR(5) NOT NULL,
    "intervaloMin" INTEGER NOT NULL,
    "limiteFaltas" INTEGER NOT NULL,
    "msgConfirmacao" TEXT NOT NULL,
    "msgLembrete" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configs_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "servicos" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "duracaoMin" INTEGER NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "telefoneNormalizado" TEXT NOT NULL,
    "obs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamentos" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "servicoId" UUID NOT NULL,
    "data" VARCHAR(10) NOT NULL,
    "hora" VARCHAR(5) NOT NULL,
    "duracaoMin" INTEGER NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "status" "StatusAgendamento" NOT NULL DEFAULT 'agendado',
    "obs" TEXT,
    "confirmacaoEnviada" BOOLEAN NOT NULL DEFAULT false,
    "lembreteEnviado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "servicos_userId_ativo_idx" ON "servicos"("userId", "ativo");

-- CreateIndex
CREATE INDEX "clientes_userId_nome_idx" ON "clientes"("userId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_userId_telefoneNormalizado_key" ON "clientes"("userId", "telefoneNormalizado");

-- CreateIndex
CREATE INDEX "agendamentos_userId_data_idx" ON "agendamentos"("userId", "data");

-- CreateIndex
CREATE INDEX "agendamentos_clienteId_idx" ON "agendamentos"("clienteId");

-- AddForeignKey
ALTER TABLE "configs" ADD CONSTRAINT "configs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "servicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Contas que já existiam ganham os mesmos ajustes e serviços iniciais das contas novas
-- (src/modules/barbearia/defaults.ts).
INSERT INTO "configs" ("userId", "nomeBarbearia", "abertura", "fechamento", "intervaloMin", "limiteFaltas", "msgConfirmacao", "msgLembrete", "updatedAt")
SELECT u."id", 'Minha Barbearia', '09:00', '19:00', 30, 2,
  'Olá, {nome}! Seu horário na {barbearia} está marcado para {data} às {hora} ({servico}). Responda SIM para confirmar ou avise se precisar remarcar. 💈',
  'Oi, {nome}! Passando para lembrar do seu horário {data} às {hora} na {barbearia}. Se não puder vir, avise para liberarmos o horário. Até já!',
  CURRENT_TIMESTAMP
FROM "users" u;

INSERT INTO "servicos" ("id", "userId", "nome", "duracaoMin", "preco", "updatedAt")
SELECT gen_random_uuid(), u."id", s.nome, s.duracao, s.preco, CURRENT_TIMESTAMP
FROM "users" u
CROSS JOIN (VALUES
  ('Corte', 30, 40.00, 1),
  ('Barba', 30, 30.00, 2),
  ('Corte + barba', 60, 65.00, 3),
  ('Sobrancelha', 15, 15.00, 4)
) AS s(nome, duracao, preco, ordem)
ORDER BY u."id", s.ordem;
