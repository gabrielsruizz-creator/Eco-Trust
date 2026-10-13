/**
 * Histórico: agrupa as transações por dia e calcula os totais do que está filtrado.
 * Funções puras: recebem a lista já buscada (por mês e tipo) e filtram/organizam em memória.
 */

import type { TipoTransacao, Transacao } from '@/types/financas';
import { hoje, ontem } from '@/utils/datas';
import { normalizar } from '@/utils/visual';

const MESES_ABREVIADOS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

export type GrupoDia = {
  data: string;
  /** "06 OUT" */
  rotulo: string;
  /** "Hoje", "Ontem" ou null */
  destaque: string | null;
  transacoes: Transacao[];
};

export type OpcaoCategoriaFiltro = { id: number; nome: string; tipo: TipoTransacao };

export type Historico = {
  grupos: GrupoDia[];
  totais: { receitasCentavos: number; despesasCentavos: number; saldoCentavos: number; quantidade: number };
  /** Categorias que aparecem nas transações do período, para o filtro */
  categorias: OpcaoCategoriaFiltro[];
  /** Categoria realmente aplicada (null se a escolhida não existe no período) */
  categoriaAplicada: number | null;
};

/** "2026-10-06" → "06 OUT" */
export function rotuloDia(data: string) {
  const [, mes, dia] = data.split('-');
  return `${dia} ${MESES_ABREVIADOS[Number(mes) - 1]}`;
}

/**
 * Organiza o mês para a tela. `dia` (AAAA-MM-DD) mostra só aquele dia; as categorias do filtro
 * continuam sendo as do mês todo, para dar para trocar de categoria sem perder o dia.
 */
export function montarHistorico(
  transacoes: Transacao[],
  categoriaId: number | null = null,
  dia: string | null = null,
  busca = '',
): Historico {
  const porId = new Map<number, OpcaoCategoriaFiltro>();
  for (const t of transacoes) {
    if (!porId.has(t.categoriaId)) porId.set(t.categoriaId, { id: t.categoriaId, nome: t.categoriaNome, tipo: t.tipo });
  }
  const categorias = [...porId.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const categoriaAplicada = categoriaId !== null && porId.has(categoriaId) ? categoriaId : null;

  const termo = normalizar(busca);
  const filtradas = transacoes.filter(
    (t) =>
      (categoriaAplicada === null || t.categoriaId === categoriaAplicada) &&
      (dia === null || t.data === dia) &&
      (termo === '' || normalizar(`${t.descricao} ${t.categoriaNome}`).includes(termo)),
  );

  const dataHoje = hoje();
  const dataOntem = ontem();
  const grupos: GrupoDia[] = [];
  let receitas = 0;
  let despesas = 0;

  // As transações já vêm ordenadas da mais recente para a mais antiga.
  for (const t of filtradas) {
    if (t.tipo === 'receita') receitas += t.valorCentavos;
    else despesas += t.valorCentavos;

    let grupo = grupos.at(-1);
    if (!grupo || grupo.data !== t.data) {
      grupo = {
        data: t.data,
        rotulo: rotuloDia(t.data),
        destaque: t.data === dataHoje ? 'Hoje' : t.data === dataOntem ? 'Ontem' : null,
        transacoes: [],
      };
      grupos.push(grupo);
    }
    grupo.transacoes.push(t);
  }

  return {
    grupos,
    totais: {
      receitasCentavos: receitas,
      despesasCentavos: despesas,
      saldoCentavos: receitas - despesas,
      quantidade: filtradas.length,
    },
    categorias,
    categoriaAplicada,
  };
}

/** Nome para o filtro; distingue categorias com o mesmo nome em receita e despesa ("Outros"). */
export function rotuloCategoriaFiltro(categoria: OpcaoCategoriaFiltro, todas: OpcaoCategoriaFiltro[]) {
  const repetido = todas.some((c) => c.id !== categoria.id && c.nome === categoria.nome);
  if (!repetido) return categoria.nome;
  return `${categoria.nome} (${categoria.tipo === 'receita' ? 'receita' : 'despesa'})`;
}
