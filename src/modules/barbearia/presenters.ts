import type {
  Agendamento,
  Cliente,
  Config,
  Servico,
} from '../../generated/prisma/client';

/**
 * Converte os registros do banco para os tipos que o app já usa (src/types.ts do barbearia-app).
 * Campos opcionais vazios saem como undefined (somem do JSON), igual ao app.
 */

export const presentConfig = (c: Config) => ({
  nomeBarbearia: c.nomeBarbearia,
  abertura: c.abertura,
  fechamento: c.fechamento,
  intervaloMin: c.intervaloMin,
  limiteFaltas: c.limiteFaltas,
  msgConfirmacao: c.msgConfirmacao,
  msgLembrete: c.msgLembrete,
});

export const presentServico = (s: Servico) => ({
  id: s.id,
  nome: s.nome,
  duracaoMin: s.duracaoMin,
  preco: Number(s.preco),
  ativo: s.ativo,
});

export const presentCliente = (c: Cliente) => ({
  id: c.id,
  nome: c.nome,
  telefone: c.telefone,
  obs: c.obs ?? undefined,
  criadoEm: c.createdAt.toISOString(),
});

export const presentAgendamento = (a: Agendamento) => ({
  id: a.id,
  clienteId: a.clienteId,
  servicoId: a.servicoId,
  data: a.data,
  hora: a.hora,
  status: a.status,
  obs: a.obs ?? undefined,
  confirmacaoEnviada: a.confirmacaoEnviada,
  lembreteEnviado: a.lembreteEnviado,
  /** Duração e preço gravados no momento do agendamento. */
  duracaoMin: a.duracaoMin,
  preco: Number(a.preco),
  criadoEm: a.createdAt.toISOString(),
});
