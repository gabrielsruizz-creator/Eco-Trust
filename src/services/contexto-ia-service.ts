/**
 * Monta um resumo em texto das finanças do usuário para enviar ao assistente de IA.
 * Mandamos só totais (não cada lançamento), o que é mais barato e mais privado.
 */

import {
  calcularSobraEstimada,
  obterPerfil as obterPerfilFinanceiro,
  rotuloFonteRenda,
  rotuloObjetivo,
} from '@/services/perfil-financeiro-service';
import { DESCRICAO_PERFIL, obterPerfil, PERGUNTAS } from '@/services/perfil-investidor-service';
import { obterAnalise } from '@/services/analise-service';
import { descreverMeta, obterMetas } from '@/services/metas-service';
import { obterOrcamentos } from '@/services/orcamento-service';
import { obterResumoDoMes } from '@/services/resumo-service';
import { obterSaude } from '@/services/saude-service';
import { mesAtual, nomeDoMes, somarMeses } from '@/utils/datas';
import { formatarCentavos } from '@/utils/moeda';

const MESES_HISTORICO = 3;

export function montarContextoIA() {
  const linhas: string[] = [];
  const perfil = obterPerfil();

  linhas.push(`Data de hoje: ${new Date().toLocaleDateString('pt-BR')}`);

  const financeiro = obterPerfilFinanceiro();
  if (financeiro) {
    linhas.push(`Nome: ${financeiro.nome}`);
    linhas.push(
      `Renda mensal informada: ${formatarCentavos(financeiro.rendaMensalCentavos)} (${rotuloFonteRenda(financeiro.fonteRenda)})`,
    );
    linhas.push(`Despesas fixas aproximadas: ${formatarCentavos(financeiro.despesasFixasCentavos)}`);
    linhas.push(
      `Sobra estimada: ${formatarCentavos(calcularSobraEstimada(financeiro.rendaMensalCentavos, financeiro.despesasFixasCentavos))}`,
    );
    linhas.push(`Objetivo principal: ${rotuloObjetivo(financeiro.objetivo)}`);
    linhas.push(`Meta de economia por mês: ${formatarCentavos(financeiro.metaEconomiaCentavos)}`);
  }

  if (perfil) {
    linhas.push(
      `Perfil de investidor: ${DESCRICAO_PERFIL[perfil.tipo].titulo} (${perfil.pontos} de 18 pontos).`,
    );
    linhas.push('Respostas do questionário:');
    perfil.respostas.forEach((opcao, i) => {
      linhas.push(`- ${PERGUNTAS[i].texto} ${PERGUNTAS[i].opcoes[opcao].texto}`);
    });
  } else {
    linhas.push('Perfil de investidor: ainda não respondeu o questionário.');
  }

  let temMovimentacao = false;
  for (let i = 0; i < MESES_HISTORICO; i++) {
    const mes = somarMeses(mesAtual(), -i);
    const r = obterResumoDoMes(mes);
    if (r.receitasCentavos === 0 && r.despesasCentavos === 0) continue;
    temMovimentacao = true;

    linhas.push('');
    linhas.push(`${nomeDoMes(mes)}${i === 0 ? ' (mês atual, ainda em andamento)' : ''}:`);
    linhas.push(`- Receitas: ${formatarCentavos(r.receitasCentavos)}`);
    linhas.push(`- Despesas: ${formatarCentavos(r.despesasCentavos)}`);
    linhas.push(`- Saldo: ${formatarCentavos(r.saldoCentavos)}`);
    if (r.despesasPorCategoria.length > 0) {
      linhas.push(
        `- Despesas por categoria: ${r.despesasPorCategoria
          .map((c) => `${c.categoria} ${formatarCentavos(c.totalCentavos)}`)
          .join('; ')}`,
      );
    }
  }

  if (!temMovimentacao) {
    linhas.push(`Nenhuma receita ou despesa registrada nos últimos ${MESES_HISTORICO} meses.`);
  }

  const orcamentos = obterOrcamentos(mesAtual());
  if (orcamentos.geral || orcamentos.categorias.length > 0) {
    linhas.push('');
    linhas.push('Orçamentos do mês atual (gasto / limite):');
    for (const o of [orcamentos.geral, ...orcamentos.categorias]) {
      if (!o) continue;
      linhas.push(
        `- ${o.nome}: ${formatarCentavos(o.gastoCentavos)} / ${formatarCentavos(o.limiteCentavos)} (${Math.floor(o.percentual)}%)`,
      );
    }
  }

  const metas = obterMetas();
  if (metas.length > 0) {
    linhas.push('');
    linhas.push('Metas financeiras:');
    for (const m of metas) {
      linhas.push(
        `- ${m.nome}: ${formatarCentavos(m.atualCentavos)} de ${formatarCentavos(m.objetivoCentavos)} (${Math.floor(m.percentual)}%). ${descreverMeta(m)}`,
      );
    }
  }

  const saude = obterSaude();
  if (saude.nota !== null) {
    linhas.push('');
    linhas.push(`Saúde financeira EcoTrust: ${saude.nota}/100 (${saude.rotuloFaixa}). Fatores:`);
    for (const f of saude.fatores) {
      linhas.push(`- ${f.nome}: ${Math.round(f.pontos)}/${f.maximo} — ${f.resumo}`);
    }
  }

  // A mesma análise mostrada na tela, para o chat responder de forma coerente com o app.
  const analise = obterAnalise(mesAtual());
  linhas.push('');
  linhas.push('Análise automática do EcoTrust neste mês:');
  for (const i of analise.insights) linhas.push(`- ${i.titulo}: ${i.texto}`);

  return linhas.join('\n');
}
