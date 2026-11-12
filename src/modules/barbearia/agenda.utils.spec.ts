import {
  agoraNoFuso,
  conflito,
  dataValida,
  estatisticas,
  horariosDoDia,
  jaPassou,
  normalizarTelefone,
  telefoneValido,
} from './agenda.utils';

const config = { abertura: '09:00', fechamento: '12:00', intervaloMin: 30 };
const ontem = { data: '2026-01-01', minutos: 0 };

describe('agenda.utils', () => {
  it('valida datas reais', () => {
    expect(dataValida('2026-02-28')).toBe(true);
    expect(dataValida('2026-02-30')).toBe(false);
    expect(dataValida('2026-2-1')).toBe(false);
  });

  it('calcula a data/hora no fuso da barbearia', () => {
    // 02:30 UTC de 10/11 ainda é 23:30 de 09/11 em São Paulo (UTC-3)
    const agora = agoraNoFuso(
      'America/Sao_Paulo',
      new Date('2026-11-10T02:30:00Z'),
    );
    expect(agora).toEqual({ data: '2026-11-09', minutos: 23 * 60 + 30 });
  });

  it('sabe o que já passou', () => {
    const agora = { data: '2026-11-10', minutos: 10 * 60 };
    expect(jaPassou('2026-11-09', '18:00', agora)).toBe(true);
    expect(jaPassou('2026-11-10', '09:30', agora)).toBe(true);
    expect(jaPassou('2026-11-10', '10:00', agora)).toBe(false);
    expect(jaPassou('2026-11-11', '08:00', agora)).toBe(false);
  });

  it('detecta sobreposição, mas não encostar', () => {
    const ocupados = [{ id: 'a', hora: '10:00', duracaoMin: 60 }];
    expect(conflito('09:30', 30, ocupados)).toBeUndefined(); // termina 10:00
    expect(conflito('09:30', 45, ocupados)?.id).toBe('a');
    expect(conflito('10:30', 30, ocupados)?.id).toBe('a');
    expect(conflito('11:00', 30, ocupados)).toBeUndefined(); // começa 11:00
  });

  it('monta a grade com ocupados, passado e fechamento', () => {
    const grade = horariosDoDia({
      data: '2026-11-10',
      duracaoMin: 60,
      config,
      ocupados: [{ id: 'a', hora: '10:00', duracaoMin: 30 }],
      agora: { data: '2026-11-10', minutos: 9 * 60 + 10 },
    });
    expect(grade).toEqual([
      { hora: '09:00', livre: false }, // passou
      { hora: '09:30', livre: false }, // 09:30-10:30 bate com 10:00
      { hora: '10:00', livre: false }, // ocupado
      { hora: '10:30', livre: true },
      { hora: '11:00', livre: true }, // termina 12:00, no limite
      { hora: '11:30', livre: false }, // passaria do fechamento
    ]);
    expect(
      horariosDoDia({
        data: '2026-11-11',
        duracaoMin: 30,
        config,
        ocupados: [],
        agora: ontem,
      }).every((h) => h.livre),
    ).toBe(true);
  });

  it('normaliza telefone com ou sem 55', () => {
    expect(normalizarTelefone('(27) 99999-0001')).toBe('5527999990001');
    expect(normalizarTelefone('5527999990001')).toBe('5527999990001');
    expect(telefoneValido('27 3333-0000')).toBe(true);
    expect(telefoneValido('99999-0001')).toBe(false);
  });

  it('calcula presença e alerta de faltas', () => {
    expect(estatisticas({ concluido: 3, faltou: 1, agendado: 2 }, 2)).toEqual({
      total: 6,
      visitas: 3,
      faltas: 1,
      presenca: 75,
      alerta: false,
    });
    expect(estatisticas({}, 2)).toMatchObject({
      total: 0,
      presenca: null,
      alerta: false,
    });
    expect(estatisticas({ faltou: 2 }, 2).alerta).toBe(true);
  });
});
