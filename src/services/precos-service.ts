/**
 * Inflação pessoal: como os preços dos produtos que VOCÊ compra mudaram, a partir dos itens das notas
 * fiscais. O mesmo produto é reconhecido pelo código de barras (EAN) ou, sem ele, pelo nome.
 */

import { listarCompradosDesde, type RegistroPreco } from '@/repositories/notas-repository';
import { hoje, somarDias } from '@/utils/datas';
import { normalizar } from '@/utils/visual';

const DIAS_ANALISADOS = 365;

export type PrecoProduto = {
  chave: string;
  nome: string;
  unidade: string | null;
  compras: number;
  primeiroPrecoCentavos: number;
  ultimoPrecoCentavos: number;
  primeiraData: string;
  ultimaData: string;
  /** Variação do primeiro para o último preço, em % */
  variacao: number;
  gastoCentavos: number;
  /** Só quando o produto foi comprado em mais de uma loja */
  maisBarato: { loja: string; precoCentavos: number; economiaCentavos: number } | null;
};

export type AnalisePrecos = {
  /** Variação média ponderada pelo gasto (null sem produtos comprados mais de uma vez) */
  inflacaoPessoal: number | null;
  produtosComparados: number;
  produtosComprados: number;
  subiram: PrecoProduto[];
  baixaram: PrecoProduto[];
  ondeEMaisBarato: PrecoProduto[];
};

/** EAN (8 a 14 dígitos) identifica o produto em qualquer loja; senão, usa o nome normalizado. */
function chaveProduto(r: RegistroPreco) {
  if (r.codigo && /^\d{8,14}$/.test(r.codigo)) return `ean:${r.codigo}`;
  return `nome:${normalizar(r.descricao).replace(/\s+/g, ' ')}`;
}

function precoUnitario(r: RegistroPreco) {
  return r.valorUnitarioCentavos ?? Math.round(r.valorTotalCentavos / r.quantidade);
}

function umaCasa(n: number) {
  return Math.round(n * 10) / 10;
}

export function analisarPrecos(registros: RegistroPreco[], limite = 10): AnalisePrecos {
  const grupos = new Map<string, RegistroPreco[]>();
  for (const r of registros) {
    if (r.quantidade <= 0 || r.valorTotalCentavos <= 0) continue;
    const chave = chaveProduto(r);
    grupos.set(chave, [...(grupos.get(chave) ?? []), r]);
  }

  const produtos: PrecoProduto[] = [];
  for (const [chave, lista] of grupos) {
    // `lista` vem em ordem de data.
    const primeiro = lista[0];
    const ultimo = lista[lista.length - 1];
    const primeiroPreco = precoUnitario(primeiro);
    const ultimoPreco = precoUnitario(ultimo);

    const menorPorLoja = new Map<string, number>();
    for (const r of lista) {
      if (!r.loja) continue;
      const p = precoUnitario(r);
      menorPorLoja.set(r.loja, Math.min(menorPorLoja.get(r.loja) ?? Infinity, p));
    }
    let maisBarato: PrecoProduto['maisBarato'] = null;
    if (menorPorLoja.size > 1) {
      const ordenadas = [...menorPorLoja.entries()].sort((a, b) => a[1] - b[1]);
      const [loja, preco] = ordenadas[0];
      const maisCaro = ordenadas[ordenadas.length - 1][1];
      if (maisCaro > preco) maisBarato = { loja, precoCentavos: preco, economiaCentavos: maisCaro - preco };
    }

    produtos.push({
      chave,
      nome: ultimo.descricao,
      unidade: ultimo.unidade,
      compras: lista.length,
      primeiroPrecoCentavos: primeiroPreco,
      ultimoPrecoCentavos: ultimoPreco,
      primeiraData: primeiro.data,
      ultimaData: ultimo.data,
      variacao: umaCasa(((ultimoPreco - primeiroPreco) / primeiroPreco) * 100),
      gastoCentavos: lista.reduce((s, r) => s + r.valorTotalCentavos, 0),
      maisBarato,
    });
  }

  // Só compara produtos comprados em dias diferentes.
  const comparados = produtos.filter((p) => p.compras > 1 && p.primeiraData !== p.ultimaData);
  const pesoTotal = comparados.reduce((s, p) => s + p.gastoCentavos, 0);
  const inflacao =
    pesoTotal > 0 ? umaCasa(comparados.reduce((s, p) => s + p.variacao * p.gastoCentavos, 0) / pesoTotal) : null;

  return {
    inflacaoPessoal: inflacao,
    produtosComparados: comparados.length,
    produtosComprados: produtos.length,
    subiram: comparados.filter((p) => p.variacao > 0).sort((a, b) => b.variacao - a.variacao).slice(0, limite),
    baixaram: comparados.filter((p) => p.variacao < 0).sort((a, b) => a.variacao - b.variacao).slice(0, limite),
    ondeEMaisBarato: produtos
      .filter((p) => p.maisBarato)
      .sort((a, b) => b.maisBarato!.economiaCentavos - a.maisBarato!.economiaCentavos)
      .slice(0, limite),
  };
}

/** Preços dos últimos 12 meses. */
export function obterAnalisePrecos(): AnalisePrecos {
  return analisarPrecos(listarCompradosDesde(somarDias(hoje(), -DIAS_ANALISADOS)));
}
