import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { banco, despesa, limparBanco } from './banco-falso';
import { perfilTributario } from '@/data/carga-tributaria';
import { calcularINSS } from '@/data/tributos-renda';
import {
  estimarCompra,
  obterImpostometro,
  obterImpostosDoLancamento,
  obterImpostosDosLancamentos,
  obterResumoImpostos,
} from '@/services/impostometro-service';
import { salvarImpostosFixos } from '@/services/impostos-renda-service';

jest.mock('@/repositories/categorias-repository', () => jest.requireActual<typeof import('./banco-falso')>('./banco-falso').categoriasRepository);
jest.mock('@/repositories/transacoes-repository', () => jest.requireActual<typeof import('./banco-falso')>('./banco-falso').transacoesRepository);
jest.mock('@/repositories/notas-repository', () => jest.requireActual<typeof import('./banco-falso')>('./banco-falso').notasRepository);
jest.mock('@/repositories/impostos-fixos-repository', () => jest.requireActual<typeof import('./banco-falso')>('./banco-falso').impostosFixosRepository);
jest.mock('@/services/perfil-financeiro-service', () => jest.requireActual<typeof import('./banco-falso')>('./banco-falso').perfilFinanceiroService);

const SUPERMERCADO = 1;
const COMBUSTIVEL = 2;
const PIX = 3;
const SALARIO = 4;

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 9, 20, 12), advanceTimers: true });
  limparBanco();
  banco.perfil = { rendaMensalCentavos: 500_000 };
  banco.categorias = [
    { id: SUPERMERCADO, nome: 'Supermercado', tipo: 'despesa', padrao: true, perfilTributario: 'supermercado' },
    { id: COMBUSTIVEL, nome: 'Combustível', tipo: 'despesa', padrao: true, perfilTributario: 'combustivel' },
    { id: PIX, nome: 'Pix pra mãe', tipo: 'despesa', padrao: false, perfilTributario: null },
    { id: SALARIO, nome: 'Salário', tipo: 'receita', padrao: true, perfilTributario: null },
  ];
});

afterEach(() => {
  jest.useRealTimers();
});

describe('impostômetro do mês', () => {
  beforeEach(() => {
    banco.transacoes = [
      despesa({ valorCentavos: 100_000, categoriaId: SUPERMERCADO, data: '2026-10-05' }), // 23% = 230
      despesa({ valorCentavos: 30_000, categoriaId: COMBUSTIVEL, data: '2026-10-06' }), // 38% = 114
      despesa({ valorCentavos: 20_000, categoriaId: SUPERMERCADO, data: '2026-10-07', tributosCentavos: 3_500 }),
      despesa({ valorCentavos: 50_000, categoriaId: PIX, data: '2026-10-08' }), // isento
      despesa({ tipo: 'receita', valorCentavos: 400_000, categoriaId: SALARIO, data: '2026-10-01' }),
      despesa({ valorCentavos: 10_000, categoriaId: SUPERMERCADO, data: '2026-09-10' }),
      despesa({ valorCentavos: 10_000, categoriaId: SUPERMERCADO, data: '2025-12-10' }),
    ];
  });

  it('soma estimativas e valores da nota', () => {
    const imp = obterImpostometro('2026-10');
    expect(imp.impostosCentavos).toBe(23_000 + 11_400 + 3_500);
    expect(imp.gastosCentavos).toBe(200_000);
    expect(imp.despesas).toBe(4);
    expect(imp.despesasComNota).toBe(1);
    expect(imp.rendaCentavos).toBe(400_000);
    expect(imp.diasNoMes).toBe(31);
    expect(imp.diasTrabalhados).toBe(Math.round((37_900 / 400_000) * 31 * 10) / 10);
  });

  it('compara com o mês anterior e acumula só o ano corrente', () => {
    const imp = obterImpostometro('2026-10');
    expect(imp.impostosMesAnteriorCentavos).toBe(2_300);
    expect(imp.acumuladoAnoCentavos).toBe(37_900 + 2_300);
  });

  it('as divisões por imposto e por esfera fecham com o total', () => {
    const imp = obterImpostometro('2026-10');
    const somaTributos = imp.porTributo.reduce((s, p) => s + p.centavos, 0);
    const somaEsferas = imp.porEsfera.reduce((s, p) => s + p.centavos, 0);
    expect(Math.abs(somaTributos - imp.impostosCentavos)).toBeLessThanOrEqual(imp.porTributo.length);
    expect(Math.abs(somaEsferas - imp.cargaTotalCentavos)).toBeLessThanOrEqual(imp.porEsfera.length);
  });

  it('mês sem despesas usa a renda do perfil', () => {
    const vazio = obterImpostometro('2026-11');
    expect(vazio.despesas).toBe(0);
    expect(vazio.percentualDosGastos).toBeNull();
    expect(vazio.rendaCentavos).toBe(500_000);
  });

  it('dá o imposto de cada lançamento e o resumo dos insights', () => {
    const [mercado, , comNota] = banco.transacoes;
    const mapa = obterImpostosDosLancamentos('2026-10');
    expect(mapa.get(mercado.id)?.centavos).toBe(23_000);
    expect(mapa.get(comNota.id)?.origem).toBe('nota');
    expect(obterResumoImpostos('2026-10')?.maiorCategoria?.nome).toBe('Supermercado');
    expect(obterResumoImpostos('2026-11')).toBeNull();
  });
});

describe('impostos da renda e do patrimônio', () => {
  it('entram na carga total e na renda bruta', () => {
    banco.transacoes = [
      despesa({ valorCentavos: 100_000, categoriaId: SUPERMERCADO, data: '2026-10-05' }),
      despesa({ tipo: 'receita', valorCentavos: 400_000, categoriaId: SALARIO, data: '2026-10-01' }),
      despesa({ valorCentavos: 10_000, categoriaId: SUPERMERCADO, data: '2026-08-10' }),
    ];
    salvarImpostosFixos({
      salarioBrutoCentavos: 500_000,
      dependentes: 0,
      inssCentavos: 999,
      irCentavos: 999,
      ipvaAnualCentavos: 120_000,
      iptuAnualCentavos: 0,
      outrosMensalCentavos: 0,
    });
    expect(banco.fixos?.inssCentavos).toBeNull(); // com salário bruto, vale a tabela

    const inss = calcularINSS(500_000);
    const imp = obterImpostometro('2026-10');
    expect(imp.fixos?.inssCentavos).toBe(inss);
    expect(imp.fixos?.irCentavos).toBe(0);
    expect(imp.fixos?.ipvaCentavos).toBe(10_000);
    expect(imp.cargaTotalCentavos).toBe(23_000 + inss + 10_000);
    expect(imp.rendaCentavos).toBe(400_000 + inss);
    // agosto teve lançamento (conta os fixos); setembro não
    expect(imp.acumuladoAnoCentavos).toBe(imp.cargaTotalCentavos + 2_300 + inss + 10_000);
    expect(obterImpostometro('2026-09').fixos).toBeNull();
  });
});

describe('estimativa produto a produto', () => {
  const itens = [
    { descricao: 'CERV HEINEKEN LN', valorTotalCentavos: 5_000 }, // 55%
    { descricao: 'ARROZ 5KG', valorTotalCentavos: 3_000 }, // 16%
    { descricao: 'QUEIJO KG', valorTotalCentavos: 2_000 }, // não reconhecido: 23% da categoria
  ];

  function comNota(valorCentavos: number, tributosCentavos: number | null) {
    const t = despesa({ valorCentavos, categoriaId: SUPERMERCADO, data: '2026-10-10', tributosCentavos, chaveNota: 'x'.repeat(44) });
    banco.transacoes.push(t);
    banco.notas.set(t.id, { chave: t.chaveNota!, url: null, emitente: null, itens: itens.map((i) => ({ ...i, codigo: null, quantidade: 1, unidade: null, valorUnitarioCentavos: null })) });
    return t;
  }

  it('estima item a item e ajusta descontos', () => {
    // 27,50 + 4,80 + 4,60 = 36,90 sobre R$ 100 de itens; pagou R$ 90 → 33,21
    const l = obterImpostosDoLancamento(comNota(9_000, null))!;
    expect(l.origem).toBe('itens');
    expect(l.totalCentavos).toBe(3_321);
    expect(l.notaSemTributos).toBe(true);
    expect(l.porItem?.map((i) => [i.centavos, i.carga, i.tipo])).toEqual([
      [2_475, 55, 'bebida alcoólica'],
      [432, 16, 'alimento básico'],
      [414, 23, null],
    ]);
    expect(estimarCompra(9_000, perfilTributario('supermercado'), itens).totalCentavos).toBe(3_321);
  });

  it('nota com R$ 0,00 de tributos também é estimada', () => {
    const l = obterImpostosDoLancamento(comNota(10_000, 0))!;
    expect(l.origem).toBe('itens');
    expect(l.totalCentavos).toBe(3_690);
    expect(l.notaSemTributos).toBe(true);
  });

  it('quando a nota informa os tributos, vale a nota', () => {
    const l = obterImpostosDoLancamento(comNota(10_000, 1_500))!;
    expect(l.origem).toBe('nota');
    expect(l.totalCentavos).toBe(1_500);
    expect(l.porItem).toBeNull();
  });

  it('sem itens, nota zerada usa a categoria', () => {
    const t = despesa({ valorCentavos: 4_881, categoriaId: SUPERMERCADO, data: '2026-10-10', tributosCentavos: 0, chaveNota: 'y'.repeat(44) });
    banco.transacoes.push(t);
    const l = obterImpostosDoLancamento(t)!;
    expect(l.origem).toBe('estimado');
    expect(l.totalCentavos).toBe(Math.round(4_881 * 0.23));
  });

  it('receitas não têm impostos de consumo', () => {
    expect(obterImpostosDoLancamento(despesa({ tipo: 'receita', valorCentavos: 1, categoriaId: SALARIO, data: '2026-10-01' }))).toBeNull();
  });
});
