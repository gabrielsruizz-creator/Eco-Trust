const formatador = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatarCentavos(centavos: number) {
  return formatador.format(centavos / 100);
}

/**
 * Converte o texto digitado ("1.234,56", "1234.56" ou "42") em centavos.
 * Retorna null se for inválido ou não positivo (ou negativo, quando `permitirZero` é true).
 */
export function lerValorEmCentavos(texto: string, permitirZero = false): number | null {
  const limpo = texto.trim().replace(/\s/g, '').replace(/^R\$/i, '');
  if (!/^\d[\d.,]*$/.test(limpo)) return null;
  // Com vírgula, ela é o decimal ("1.234,56"). Sem vírgula, pontos em grupos de 3 dígitos são
  // separadores de milhar, como se escreve no Brasil ("4.500" = 4500); senão o ponto é decimal ("12.5").
  const pontosDeMilhar = /^\d{1,3}(\.\d{3})+$/.test(limpo);
  const normalizado = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : pontosDeMilhar
      ? limpo.replace(/\./g, '')
      : limpo;
  const valor = Number(normalizado);
  if (!Number.isFinite(valor) || valor < 0 || (valor === 0 && !permitirZero)) return null;
  return Math.round(valor * 100);
}

/** Centavos → texto para preencher um campo de valor (4290 → "42,90", 450000 → "4500"). */
export function centavosParaTexto(centavos: number) {
  return centavos % 100 === 0 ? String(centavos / 100) : (centavos / 100).toFixed(2).replace('.', ',');
}
