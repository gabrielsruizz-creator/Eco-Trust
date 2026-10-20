import { describe, expect, it } from '@jest/globals';

import { perfilDoProduto, perfilTributario } from '@/data/carga-tributaria';
import { REGRA_POR_PERFIL, REGRA_POR_PRODUTO } from '@/data/reforma-tributaria';
import { calcularSimulacao, simularValor } from '@/services/reforma-service';
import type { Transacao } from '@/types/financas';

const despesa = (id: number, valorCentavos: number, categoriaId: number, categoriaNome: string): Transacao => ({
  id,
  tipo: 'despesa',
  valorCentavos,
  descricao: '',
  categoriaId,
  categoriaNome,
  data: '2026-10-10',
  recorrente: false,
  tributosCentavos: null,
  chaveNota: null,
});

describe('simulador da reforma', () => {
  it('cesta básica fica só com os tributos embutidos', () => {
    const arroz = perfilDoProduto('ARROZ 5KG')!;
    const r = simularValor(10_000, arroz, REGRA_POR_PRODUTO[arroz.id]);
    expect(r.hoje).toBeCloseTo(1_600);
    expect(r.reforma).toBeCloseTo(700); // embutidos 7%
  });

  it('serviços passam a pagar mais', () => {
    const r = simularValor(10_000, perfilTributario('servicos'), REGRA_POR_PERFIL.servicos);
    expect(r.reforma).toBeGreaterThan(r.hoje);
  });

  it('combustível mantém a carga de hoje', () => {
    const r = simularValor(10_000, perfilTributario('combustivel'), REGRA_POR_PERFIL.combustivel);
    expect(r.reforma).toBe(r.hoje);
  });

  it('bebida paga IBS/CBS sobre o preço sem imposto, mais o seletivo', () => {
    const cerveja = perfilDoProduto('CERV HEINEKEN')!;
    // sem consumo: 100 − 50 = 50; IBS/CBS 27,91% = 13,955; seletivo (IPI 15%) = 15; embutidos 5
    expect(simularValor(10_000, cerveja, REGRA_POR_PRODUTO.bebida).reforma).toBeCloseTo(3_395.5);
  });

  it('agrupa por categoria ou por tipo de produto da nota', () => {
    const sim = calcularSimulacao(
      '2026-10',
      [despesa(1, 9_000, 1, 'Supermercado'), despesa(2, 10_000, 2, 'Serviços')],
      new Map([
        [1, 'supermercado'],
        [2, 'servicos'],
      ]),
      new Map([[1, [{ descricao: 'ARROZ 5KG', valorTotalCentavos: 10_000 }]]]),
    );
    expect(sim.gastosCentavos).toBe(19_000);
    expect(sim.porGrupo.map((g) => g.nome).sort()).toEqual(['Serviços', 'alimento básico']);
    expect(sim.porGrupo.find((g) => g.nome === 'alimento básico')?.gastoCentavos).toBe(9_000); // desconto ajustado
    expect(sim.hojeCentavos + sim.diferencaCentavos).toBe(sim.reformaCentavos);
  });
});
