/**
 * Regras de horário da agenda, em funções puras (sem banco) para dar para testar.
 * Datas são "YYYY-MM-DD" e horas "HH:MM" no fuso da barbearia, como no app.
 */

export const STATUS_QUE_OCUPAM = [
  'agendado',
  'confirmado',
  'concluido',
] as const;

export const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
export const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const horaParaMin = (hora: string) => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};

const pad = (n: number) => String(n).padStart(2, '0');
export const minParaHora = (min: number) =>
  `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

/** Confere se "YYYY-MM-DD" é uma data que existe (recusa 2026-02-30). */
export function dataValida(data: string) {
  if (!DATA_REGEX.test(data)) return false;
  const [y, m, d] = data.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/** Data e hora atuais no fuso da barbearia (o servidor pode estar em UTC). */
export function agoraNoFuso(timeZone: string, agora = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(agora)
      .map((p) => [p.type, p.value]),
  );
  return {
    data: `${partes.year}-${partes.month}-${partes.day}`,
    minutos: Number(partes.hour) * 60 + Number(partes.minute),
  };
}

/** O início do horário já passou? (comparado com "agora" no fuso da barbearia) */
export function jaPassou(
  data: string,
  hora: string,
  agora: { data: string; minutos: number },
) {
  if (data !== agora.data) return data < agora.data;
  return horaParaMin(hora) < agora.minutos;
}

export function gerarHorarios(
  abertura: string,
  fechamento: string,
  intervaloMin: number,
) {
  const lista: string[] = [];
  if (
    !HORA_REGEX.test(abertura) ||
    !HORA_REGEX.test(fechamento) ||
    intervaloMin < 5
  )
    return lista;
  for (
    let m = horaParaMin(abertura);
    m < horaParaMin(fechamento);
    m += intervaloMin
  ) {
    lista.push(minParaHora(m));
  }
  return lista;
}

export type Ocupado = { id: string; hora: string; duracaoMin: number };

/** Primeiro agendamento que se sobrepõe ao intervalo [hora, hora + duracao). */
export function conflito(
  hora: string,
  duracaoMin: number,
  ocupados: Ocupado[],
) {
  const ini = horaParaMin(hora);
  const fim = ini + duracaoMin;
  return ocupados.find((o) => {
    const oIni = horaParaMin(o.hora);
    return oIni < fim && ini < oIni + o.duracaoMin;
  });
}

/** Mesma lógica do horariosDoDia do app: cada horário da grade, livre ou não. */
export function horariosDoDia(params: {
  data: string;
  duracaoMin: number;
  config: { abertura: string; fechamento: string; intervaloMin: number };
  ocupados: Ocupado[];
  agora: { data: string; minutos: number };
}) {
  const { data, duracaoMin, config, ocupados, agora } = params;
  const fim = horaParaMin(config.fechamento);
  return gerarHorarios(
    config.abertura,
    config.fechamento,
    config.intervaloMin,
  ).map((hora) => ({
    hora,
    livre:
      horaParaMin(hora) + duracaoMin <= fim &&
      !jaPassou(data, hora, agora) &&
      !conflito(hora, duracaoMin, ocupados),
  }));
}

/** "55" + DDD + número, como o normalizarTelefone do app (para não duplicar com/sem o 55). */
export function normalizarTelefone(telefone: string) {
  let d = telefone.replace(/\D/g, '').replace(/^0+/, '');
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return d;
}

export const telefoneValido = (telefone: string) => {
  const d = normalizarTelefone(telefone);
  return d.length >= 12 && d.length <= 13;
};

export function estatisticas(
  contagem: Partial<Record<string, number>>,
  limiteFaltas: number,
) {
  const total = Object.values(contagem).reduce<number>(
    (s, n) => s + (n ?? 0),
    0,
  );
  const visitas = contagem.concluido ?? 0;
  const faltas = contagem.faltou ?? 0;
  const encerrados = visitas + faltas;
  return {
    total,
    visitas,
    faltas,
    presenca: encerrados ? Math.round((visitas / encerrados) * 100) : null,
    alerta: faltas >= limiteFaltas,
  };
}
