/**
 * Impostos sobre a renda do trabalhador CLT em 2026 (valores mensais, em centavos).
 *
 * - INSS: Portaria Interministerial MPS/MF nº 13/2026 (progressivo, teto R$ 8.475,55).
 * - IRRF: tabela progressiva mensal vigente desde maio/2025 + redução da Lei 15.270/2025
 *   (zera o imposto até R$ 5.000 de rendimento e reduz até R$ 7.350).
 * Quando as tabelas mudarem, basta atualizar este arquivo.
 */

/** [limite superior da faixa, alíquota em %] */
const FAIXAS_INSS: [number, number][] = [
  [162_100, 7.5],
  [290_284, 9],
  [435_427, 12],
  [847_555, 14],
];

/** [limite superior da base, alíquota em %, parcela a deduzir] */
const FAIXAS_IRRF: [number, number, number][] = [
  [242_880, 0, 0],
  [282_665, 7.5, 18_216],
  [375_105, 15, 39_416],
  [466_468, 22.5, 67_549],
  [Infinity, 27.5, 90_873],
];

const DEDUCAO_POR_DEPENDENTE = 18_959;
/** Desconto simplificado mensal: usado quando é maior que INSS + dependentes */
const DESCONTO_SIMPLIFICADO = 60_720;

const REDUCAO_ISENCAO_ATE = 500_000;
const REDUCAO_MAXIMA = 31_289;
const REDUCAO_ATE = 735_000;

/** INSS descontado do salário bruto (progressivo, por faixas). */
export function calcularINSS(brutoCentavos: number) {
  let inss = 0;
  let anterior = 0;
  for (const [limite, aliquota] of FAIXAS_INSS) {
    if (brutoCentavos <= anterior) break;
    inss += ((Math.min(brutoCentavos, limite) - anterior) * aliquota) / 100;
    anterior = limite;
  }
  return Math.round(inss);
}

/** Imposto de Renda retido na fonte sobre o salário (já com a redução de 2026). */
export function calcularIRRF(brutoCentavos: number, inssCentavos: number, dependentes = 0) {
  const deducoes = Math.max(inssCentavos + dependentes * DEDUCAO_POR_DEPENDENTE, DESCONTO_SIMPLIFICADO);
  const base = Math.max(0, brutoCentavos - deducoes);
  const [, aliquota, deduzir] = FAIXAS_IRRF.find(([limite]) => base <= limite)!;
  const imposto = Math.max(0, (base * aliquota) / 100 - deduzir);

  let reducao = 0;
  if (brutoCentavos <= REDUCAO_ISENCAO_ATE) reducao = REDUCAO_MAXIMA;
  else if (brutoCentavos <= REDUCAO_ATE) reducao = 97_862 - 0.133145 * brutoCentavos;

  return Math.round(Math.max(0, imposto - reducao));
}
