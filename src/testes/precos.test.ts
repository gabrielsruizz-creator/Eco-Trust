import { describe, expect, it } from '@jest/globals';

import type { RegistroPreco } from '@/repositories/notas-repository';
import { analisarPrecos } from '@/services/precos-service';

const r = (descricao: string, data: string, unitario: number, loja: string, extra: Partial<RegistroPreco> = {}): RegistroPreco => ({
  descricao,
  codigo: null,
  quantidade: 1,
  unidade: 'UN',
  valorUnitarioCentavos: unitario,
  valorTotalCentavos: unitario,
  data,
  loja,
  ...extra,
});

describe('inflação pessoal', () => {
  const registros = [
    r('ARROZ TIO JOAO 5KG', '2026-01-10', 2_500, 'Mercado A', { codigo: '7893500020110' }),
    r('ARROZ T.JOAO 5 KG', '2026-06-10', 3_000, 'Mercado B', { codigo: '7893500020110' }), // mesmo EAN, outro nome
    r('BANANA PRATA KG', '2026-01-10', 600, 'Mercado A', { quantidade: 2, unidade: 'KG', valorUnitarioCentavos: null, valorTotalCentavos: 1_200 }),
    r('Banana  Prata kg', '2026-03-10', 500, 'Mercado A', { unidade: 'KG' }),
    r('PILHA AA', '2026-05-01', 1_000, 'Mercado A'), // comprado uma vez só
  ];
  const a = analisarPrecos(registros);

  it('reconhece o produto pelo EAN ou pelo nome', () => {
    expect(a.produtosComprados).toBe(3);
    expect(a.produtosComparados).toBe(2);
  });

  it('calcula a variação pelo preço por unidade', () => {
    expect(a.subiram.map((p) => [p.nome, p.variacao])).toEqual([['ARROZ T.JOAO 5 KG', 20]]);
    expect(a.baixaram.map((p) => [p.nome, p.variacao, p.primeiroPrecoCentavos])).toEqual([['Banana  Prata kg', -16.7, 600]]);
  });

  it('média ponderada pelo gasto', () => {
    // arroz: +20% com R$ 55 gastos; banana: −16,7% com R$ 17
    expect(a.inflacaoPessoal).toBe(Math.round(((20 * 5_500 - 16.7 * 1_700) / 7_200) * 10) / 10);
  });

  it('aponta a loja mais barata', () => {
    expect(a.ondeEMaisBarato[0].maisBarato).toEqual({ loja: 'Mercado A', precoCentavos: 2_500, economiaCentavos: 500 });
  });

  it('sem compras repetidas não há inflação', () => {
    expect(analisarPrecos([r('PILHA', '2026-01-01', 100, 'A')]).inflacaoPessoal).toBeNull();
  });
});
