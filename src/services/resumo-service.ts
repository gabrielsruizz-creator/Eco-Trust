import { listarTransacoes } from '@/repositories/transacoes-repository';
import type { ResumoMes, Transacao } from '@/types/financas';

/** Cálculo puro: soma receitas, despesas e despesas por categoria de uma lista de transações. */
export function calcularResumo(mes: string, transacoes: Transacao[]): ResumoMes {
  let receitasCentavos = 0;
  let despesasCentavos = 0;
  const porCategoria = new Map<number, { categoria: string; totalCentavos: number }>();

  for (const t of transacoes) {
    if (t.tipo === 'receita') {
      receitasCentavos += t.valorCentavos;
      continue;
    }
    despesasCentavos += t.valorCentavos;
    const atual = porCategoria.get(t.categoriaId) ?? { categoria: t.categoriaNome, totalCentavos: 0 };
    atual.totalCentavos += t.valorCentavos;
    porCategoria.set(t.categoriaId, atual);
  }

  const despesasPorCategoria = [...porCategoria.entries()]
    .map(([categoriaId, c]) => ({ categoriaId, ...c }))
    .sort((a, b) => b.totalCentavos - a.totalCentavos);

  return {
    mes,
    receitasCentavos,
    despesasCentavos,
    saldoCentavos: receitasCentavos - despesasCentavos,
    despesasPorCategoria,
  };
}

/** Resumo de um mês ("AAAA-MM") a partir do banco. */
export function obterResumoDoMes(mes: string): ResumoMes {
  return calcularResumo(mes, listarTransacoes({ mes }));
}
