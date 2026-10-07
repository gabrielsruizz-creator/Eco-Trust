/**
 * Números do Dashboard. `calcularDashboard` é puro (fácil de testar); `obterDashboard` busca os dados no banco.
 */

import { obterPerfilFinanceiro } from '@/repositories/perfil-financeiro-repository';
import { somarTotaisGerais } from '@/repositories/transacoes-repository';
import { gerarInsights } from '@/services/insights-service';
import { obterOrcamentos, type ResumoOrcamentos } from '@/services/orcamento-service';
import { obterResumoDoMes } from '@/services/resumo-service';
import type { Dashboard, PerfilFinanceiro, ResumoMes } from '@/types/financas';
import { somarMeses } from '@/utils/datas';

export type EntradaDashboard = {
  resumoAtual: ResumoMes;
  resumoAnterior: ResumoMes;
  totaisGerais: { receitasCentavos: number; despesasCentavos: number };
  perfil: PerfilFinanceiro | null;
  orcamentos?: ResumoOrcamentos | null;
};

export function calcularDashboard({
  resumoAtual,
  resumoAnterior,
  totaisGerais,
  perfil,
  orcamentos,
}: EntradaDashboard): Dashboard {
  const meta = perfil?.metaEconomiaCentavos ?? 0;
  const economizado = resumoAtual.receitasCentavos - resumoAtual.despesasCentavos;
  const percentualMeta = meta > 0 ? (Math.max(0, economizado) / meta) * 100 : null;

  // Limite do mês: o orçamento geral, se o usuário definiu um.
  // Senão, a renda informada ou o que realmente entrou no mês (o que for maior), menos a meta.
  const baseRenda = Math.max(perfil?.rendaMensalCentavos ?? 0, resumoAtual.receitasCentavos);
  let limiteGastos: number | null = null;
  let origemLimite: Dashboard['origemLimite'] = null;
  if (orcamentos?.geral) {
    limiteGastos = orcamentos.geral.limiteCentavos;
    origemLimite = 'orcamento';
  } else if (baseRenda > 0) {
    limiteGastos = Math.max(0, baseRenda - meta);
    origemLimite = 'renda';
  }
  const disponivel = limiteGastos !== null ? limiteGastos - resumoAtual.despesasCentavos : null;

  return {
    mes: resumoAtual.mes,
    saldoDisponivelCentavos: totaisGerais.receitasCentavos - totaisGerais.despesasCentavos,
    receitasCentavos: resumoAtual.receitasCentavos,
    despesasCentavos: resumoAtual.despesasCentavos,
    economizadoCentavos: economizado,
    metaEconomiaCentavos: meta,
    percentualMeta,
    limiteGastosCentavos: limiteGastos,
    origemLimite,
    disponivelParaGastarCentavos: disponivel,
    categorias: resumoAtual.despesasPorCategoria.map((c) => ({
      ...c,
      percentual:
        resumoAtual.despesasCentavos > 0
          ? Math.round((c.totalCentavos / resumoAtual.despesasCentavos) * 100)
          : 0,
    })),
    insights: gerarInsights({
      resumoAtual,
      resumoAnterior,
      metaEconomiaCentavos: meta,
      percentualMeta,
      disponivelParaGastarCentavos: disponivel,
      origemLimite,
      orcamentosCategorias: orcamentos?.categorias ?? [],
    }),
  };
}

export function obterDashboard(mes: string): Dashboard {
  return calcularDashboard({
    resumoAtual: obterResumoDoMes(mes),
    resumoAnterior: obterResumoDoMes(somarMeses(mes, -1)),
    totaisGerais: somarTotaisGerais(),
    perfil: obterPerfilFinanceiro(),
    orcamentos: obterOrcamentos(mes),
  });
}
