/** Valores iniciais de toda barbearia nova (os mesmos do store/seed.ts do app). */
export const CONFIG_PADRAO = {
  nomeBarbearia: 'Minha Barbearia',
  abertura: '09:00',
  fechamento: '19:00',
  intervaloMin: 30,
  limiteFaltas: 2,
  msgConfirmacao:
    'Olá, {nome}! Seu horário na {barbearia} está marcado para {data} às {hora} ({servico}). ' +
    'Responda SIM para confirmar ou avise se precisar remarcar. 💈',
  msgLembrete:
    'Oi, {nome}! Passando para lembrar do seu horário {data} às {hora} na {barbearia}. ' +
    'Se não puder vir, avise para liberarmos o horário. Até já!',
};

export const SERVICOS_PADRAO = [
  { nome: 'Corte', duracaoMin: 30, preco: 40 },
  { nome: 'Barba', duracaoMin: 30, preco: 30 },
  { nome: 'Corte + barba', duracaoMin: 60, preco: 65 },
  { nome: 'Sobrancelha', duracaoMin: 15, preco: 15 },
];

/** Dados aninhados para o prisma.user.create: a conta já nasce com config e serviços. */
export const barbeariaInicial = () => ({
  config: { create: { ...CONFIG_PADRAO } },
  servicos: { createMany: { data: SERVICOS_PADRAO } },
});
