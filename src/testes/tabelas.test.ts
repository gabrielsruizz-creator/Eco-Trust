import { describe, expect, it } from '@jest/globals';

import { cargaTotal, perfilDoProduto, perfilPorNome, PERFIS_TRIBUTARIOS } from '@/data/carga-tributaria';
import { calcularINSS, calcularIRRF } from '@/data/tributos-renda';

describe('tabela de carga por tipo de consumo', () => {
  it('tem cargas entre 0% e 100%', () => {
    for (const p of PERFIS_TRIBUTARIOS) {
      expect(cargaTotal(p)).toBeGreaterThanOrEqual(0);
      expect(cargaTotal(p)).toBeLessThan(100);
    }
  });

  it.each([
    ['Mercado do bairro', 'supermercado'],
    ['iFood', 'restaurante'],
    ['Posto', 'combustivel'],
    ['Conta de luz', 'contas'],
    ['Academia', 'servicos'],
    ['Netflix', 'assinaturas'],
    ['Cerveja', 'bebidas'],
    ['Pix pra mãe', 'isento'],
    ['Coisas aleatórias', 'geral'],
    ['DROGARIA SAO PAULO', 'saude'],
    ['PETROBRAS DISTRIBUIDORA', 'combustivel'],
  ])('palpite de perfil pelo nome: %s → %s', (nome, perfil) => {
    expect(perfilPorNome(nome)).toBe(perfil);
  });

  it.each([
    ['CERV HEINEKEN LN 330ML', 'bebida alcoólica'],
    ['REFRIG COCA COLA 2L', 'refrigerante e suco'],
    ['DET YPE NEUTRO 500ML', 'limpeza'],
    ['PAP HIG NEVE 12UN', 'higiene pessoal'],
    ['BISC RECHEADO TRAKINAS', 'doces e guloseimas'],
    ['LEITE COND MOCOCA', 'doces e guloseimas'],
    ['ARROZ TIO JOAO 5KG', 'alimento básico'],
    ['LEITE UHT ITALAC 1L', 'alimento básico'],
    ['BANANA PRATA KG', 'frutas, verduras e legumes'],
    ['PEITO FRANGO KG', 'carnes'],
    ['CIG MARLBORO', 'cigarro'],
    ['VODKA SMIRNOFF 998ML', 'bebida destilada'],
    ['QUEIJO MUSSARELA KG', 'laticínios'],
    ['IOGURTE NESTLE', 'laticínios'],
    ['COCADA', null],
    ['PILHA AA DURACELL', null],
  ])('tipo de produto pelo nome no cupom: %s → %s', (descricao, tipo) => {
    expect(perfilDoProduto(descricao)?.nome ?? null).toBe(tipo);
  });
});

describe('INSS e IRRF 2026', () => {
  const ir = (bruto: number, dependentes = 0) => calcularIRRF(bruto, calcularINSS(bruto), dependentes);

  it('calcula o INSS por faixas, com teto', () => {
    expect(calcularINSS(162_100)).toBe(12_158);
    expect(calcularINSS(300_000)).toBe(24_860);
    expect(calcularINSS(1_000_000)).toBe(98_809);
  });

  it('isenta o IR até R$ 5 mil e reduz até R$ 7.350', () => {
    expect(ir(300_000)).toBe(0);
    expect(ir(500_000)).toBe(0);
    expect(ir(500_001)).toBeLessThan(100);
    expect(ir(600_000)).toBe(38_510);
    expect(ir(1_000_000)).toBe(156_955);
  });

  it('dependentes reduzem o IR', () => {
    expect(ir(1_000_000, 2)).toBeLessThan(ir(1_000_000));
  });
});
