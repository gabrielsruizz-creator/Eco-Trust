import { describe, expect, it } from '@jest/globals';

import { aliquotaMarginalIR, calcularINSS } from '@/data/tributos-renda';
import { calcularDeducoes, palpiteDedutivel, type DespesaDedutivel } from '@/services/ir-service';
import type { ImpostosFixos } from '@/types/financas';

const fixos = (bruto: number, dependentes = 0): ImpostosFixos => ({
  salarioBrutoCentavos: bruto,
  dependentes,
  inssCentavos: null,
  irCentavos: null,
  ipvaAnualCentavos: 0,
  iptuAnualCentavos: 0,
  outrosMensalCentavos: 0,
});

function despesa(tipo: 'saude' | 'educacao', valorCentavos: number, dedutivel = true): DespesaDedutivel {
  return {
    tipo,
    dedutivel,
    escolhaDoUsuario: false,
    transacao: { id: 1, tipo: 'despesa', valorCentavos, descricao: '', categoriaId: 1, categoriaNome: '', data: '2026-03-01', recorrente: false, tributosCentavos: null, chaveNota: null },
  };
}

describe('palpite do que entra no IR', () => {
  it.each([
    ['saude', 'Consulta dentista', true],
    ['saude', 'Plano de saúde Unimed', true],
    ['saude', 'Drogaria São Paulo', false],
    ['saude', 'Remédio', false],
    ['educacao', 'Mensalidade faculdade', true],
    ['educacao', 'Curso de inglês', false],
    ['educacao', 'Material escolar', false],
  ] as const)('%s: %s → %s', (tipo, descricao, esperado) => {
    expect(palpiteDedutivel(tipo, descricao)).toBe(esperado);
  });
});

describe('deduções do ano', () => {
  it('soma saúde sem limite e limita educação por pessoa', () => {
    const d = calcularDeducoes(2026, [despesa('saude', 500_000), despesa('saude', 9_999, false), despesa('educacao', 1_000_000)], fixos(0, 1));
    expect(d.saudeCentavos).toBe(500_000);
    expect(d.pessoas).toBe(2);
    expect(d.educacaoCentavos).toBe(2 * 356_150);
    expect(d.educacaoInformadaCentavos).toBe(1_000_000);
    expect(d.comparacao).toBeNull(); // sem salário informado
  });

  it('compara completa e simplificada pelo salário', () => {
    const d = calcularDeducoes(2026, [despesa('saude', 2_000_000)], fixos(1_000_000));
    const c = d.comparacao!;
    expect(c.simplificadoCentavos).toBe(1_675_434); // 20% de 120 mil passa do limite
    expect(c.completaCentavos).toBe(2_000_000 + calcularINSS(1_000_000) * 12);
    expect(c.melhor).toBe('completa');
    expect(c.aliquotaMarginal).toBe(27.5);
    expect(c.economiaCentavos).toBe(Math.round(((c.completaCentavos - c.simplificadoCentavos) * 27.5) / 100));
  });

  it('isento (até R$ 5 mil) não economiza', () => {
    expect(aliquotaMarginalIR(400_000, calcularINSS(400_000))).toBe(0);
    expect(calcularDeducoes(2026, [despesa('saude', 100_000)], fixos(400_000)).comparacao?.economiaCentavos).toBe(0);
  });
});
