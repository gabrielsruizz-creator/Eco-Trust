/**
 * Premissas do simulador da reforma tributária (EC 132/2023 e LC 214/2025), para quando ela estiver
 * completa (2033): ICMS, ISS, PIS/Cofins e IPI dão lugar ao IBS + CBS, cobrados "por fora" do preço.
 *
 * - Alíquota de referência: 27,91% (IBS 18,7% + CBS 9,21%), estimativa da Resolução CGIBS nº 14/2026.
 *   O valor definitivo ainda será fixado.
 * - Fator = parte da alíquota cheia que cada tipo de consumo paga: 0 = alíquota zero (cesta básica
 *   nacional, frutas, verduras e ovos); 0,4 = redução de 60% (saúde, educação, alimentos, higiene e
 *   limpeza); 0,6 = regimes com redução de 40% (bares, restaurantes, hotelaria). Categorias que
 *   misturam produtos usam uma média aproximada.
 * - Imposto Seletivo (cigarro, bebidas alcoólicas e açucaradas): as alíquotas ainda não foram
 *   definidas. Supomos que ele substitua o IPI de hoje desses produtos (mesma carga).
 * - Combustíveis terão regime próprio (valor fixo por litro): supomos a mesma carga de hoje.
 * - Os tributos embutidos (IRPJ, CSLL e INSS das empresas) continuam como estão.
 */

import type { PerfilTributarioId, TipoProdutoId } from '@/data/carga-tributaria';

export const ALIQUOTA_REFERENCIA = 27.91;

/** Como cada tipo de consumo fica na regra nova. 'atual' = mantém a carga de hoje. */
export type RegraReforma = { fator: number; seletivo?: boolean } | 'atual';

export const REGRA_POR_PERFIL: Record<PerfilTributarioId, RegraReforma> = {
  supermercado: { fator: 0.45 },
  alimentacao: { fator: 0.55 },
  restaurante: { fator: 0.6 },
  bebidas: { fator: 1, seletivo: true },
  combustivel: 'atual',
  transporte: { fator: 0.6 },
  moradia: 'atual',
  contas: { fator: 1 },
  telecom: { fator: 1 },
  saude: { fator: 0.4 },
  educacao: { fator: 0.4 },
  lazer: { fator: 0.7 },
  servicos: { fator: 1 },
  compras: { fator: 1 },
  assinaturas: { fator: 1 },
  viagens: { fator: 0.6 },
  geral: { fator: 0.8 },
  isento: { fator: 0 },
};

export const REGRA_POR_PRODUTO: Record<TipoProdutoId, RegraReforma> = {
  cigarro: { fator: 1, seletivo: true },
  destilado: { fator: 1, seletivo: true },
  bebida: { fator: 1, seletivo: true },
  refrigerante: { fator: 1, seletivo: true },
  cosmetico: { fator: 1 },
  doces: { fator: 1 },
  higiene: { fator: 0.4 },
  limpeza: { fator: 0.4 },
  laticinios: { fator: 0.2 },
  carnes: { fator: 0 },
  hortifruti: { fator: 0 },
  basico: { fator: 0 },
};

/** Linha do tempo para mostrar na tela. */
export const ETAPAS_REFORMA: { ano: string; texto: string }[] = [
  { ano: '2026', texto: 'Teste: CBS de 0,9% e IBS de 0,1%, descontados do PIS/Cofins. Nada muda no bolso.' },
  { ano: '2027', texto: 'A CBS substitui PIS e Cofins. O IPI zera (menos na Zona Franca) e começa o Imposto Seletivo.' },
  { ano: '2029–2032', texto: 'ICMS e ISS caem aos poucos enquanto o IBS sobe.' },
  { ano: '2033', texto: 'Regra nova completa: só IBS, CBS e Imposto Seletivo no consumo.' },
];
