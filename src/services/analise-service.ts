/**
 * EcoTrust IA (primeira versão): análise da vida financeira baseada em regras.
 * Não usa modelo de IA: lê os números do usuário e transforma em observações claras.
 * `gerarAnalise` é puro (fácil de testar e de evoluir); `obterAnalise` busca os dados no banco.
 */

import { obterPerfilFinanceiro } from '@/repositories/perfil-financeiro-repository';
import { listarTransacoes } from '@/repositories/transacoes-repository';
import { obterMetas, textoRitmo } from '@/services/metas-service';
import { obterOrcamentos, type ResumoOrcamentos } from '@/services/orcamento-service';
import { obterResumoDoMes } from '@/services/resumo-service';
import type { PerfilFinanceiro, ProgressoMeta, ResumoMes } from '@/types/financas';
import { hoje, nomeDoMes, somarMeses } from '@/utils/datas';
import { formatarCentavos } from '@/utils/moeda';

/** Diferença mínima (em centavos) para comentar a variação de uma categoria: R$ 100 */
const VARIACAO_MINIMA_CENTAVOS = 10_000;
/** E também pelo menos 15% de variação */
const VARIACAO_MINIMA_PERCENTUAL = 0.15;
/** A projeção do mês só aparece a partir deste dia (antes disso é muito incerta) */
const DIA_MINIMO_PROJECAO = 5;
/** Categorias essenciais (ou pagamento de dívidas) não entram na sugestão "onde reduzir" */
const ESSENCIAIS = new Set(['Moradia', 'Saúde', 'Educação', 'Dívidas']);

export type TemaInsight = 'renda' | 'gastos' | 'orcamento' | 'metas';

export type InsightIA = {
  id: string;
  tom: 'alerta' | 'positivo' | 'neutro';
  tema: TemaInsight;
  titulo: string;
  texto: string;
  /** Atalho opcional para agir sobre o insight */
  acao?: { rotulo: string; rota: '/nova-meta' | '/editar-orcamento' | '/novo-lancamento' | '/planejar' };
};

export type Analise = {
  mes: string;
  /** Frase de abertura, ex.: "Analisei outubro: 2 pontos de atenção e 3 boas notícias." */
  resumo: string;
  insights: InsightIA[];
};

export type EntradaAnalise = {
  mes: string;
  dataHoje: string;
  atual: ResumoMes;
  anterior: ResumoMes;
  /** Resumos dos 3 meses anteriores ao atual (para a média) */
  historico: ResumoMes[];
  perfil: PerfilFinanceiro | null;
  /** Soma das despesas marcadas como recorrentes no mês */
  recorrentesCentavos: number;
  orcamentos: ResumoOrcamentos;
  metas: ProgressoMeta[];
};

const pct = (valor: number) => `${Math.round(valor * 100)}%`;
const minuscula = (texto: string) => texto.toLocaleLowerCase('pt-BR');

function analisarRenda(e: EntradaAnalise): InsightIA[] {
  const insights: InsightIA[] = [];
  const { atual, perfil } = e;

  // Taxa de poupança do mês
  if (atual.receitasCentavos > 0) {
    const taxa = (atual.receitasCentavos - atual.despesasCentavos) / atual.receitasCentavos;
    if (taxa < 0) {
      insights.push({
        id: 'poupanca-negativa',
        tom: 'alerta',
        tema: 'renda',
        titulo: 'Gastando mais do que ganha',
        texto: `Neste mês você gastou ${formatarCentavos(atual.despesasCentavos - atual.receitasCentavos)} a mais do que recebeu.`,
      });
    } else {
      insights.push({
        id: 'taxa-poupanca',
        tom: taxa >= 0.1 ? 'positivo' : 'neutro',
        tema: 'renda',
        titulo: 'Quanto você está economizando',
        texto:
          `Você está economizando ${pct(taxa)} da sua renda mensal.` +
          (taxa < 0.1 ? ' O ideal é chegar a pelo menos 10%.' : taxa >= 0.2 ? ' Excelente ritmo!' : ''),
      });
    }
  }

  // Peso das despesas fixas na renda (recorrentes do mês ou o valor informado no perfil)
  const renda = Math.max(perfil?.rendaMensalCentavos ?? 0, atual.receitasCentavos);
  const fixas = e.recorrentesCentavos > 0 ? e.recorrentesCentavos : (perfil?.despesasFixasCentavos ?? 0);
  if (renda > 0 && fixas > 0) {
    const peso = fixas / renda;
    insights.push({
      id: 'peso-fixas',
      tom: peso > 0.5 ? 'alerta' : peso <= 0.3 ? 'positivo' : 'neutro',
      tema: 'renda',
      titulo: 'Despesas fixas',
      texto:
        `Suas despesas fixas representam ${pct(peso)} da sua renda.` +
        (peso > 0.5
          ? ' Acima de 50% sobra pouco espaço para imprevistos.'
          : peso <= 0.3
            ? ' Isso deixa uma boa margem no orçamento.'
            : ''),
    });
  }
  return insights;
}

function analisarGastos(e: EntradaAnalise): InsightIA[] {
  const insights: InsightIA[] = [];
  const { atual, anterior } = e;

  // Variações por categoria em relação ao mês passado (as 2 maiores altas e a maior queda)
  const variacoes = atual.despesasPorCategoria
    .map((c) => {
      const antes = anterior.despesasPorCategoria.find((a) => a.categoriaId === c.categoriaId)?.totalCentavos ?? 0;
      return { categoria: c.categoria, diferenca: c.totalCentavos - antes, antes };
    })
    .concat(
      anterior.despesasPorCategoria
        .filter((a) => !atual.despesasPorCategoria.some((c) => c.categoriaId === a.categoriaId))
        .map((a) => ({ categoria: a.categoria, diferenca: -a.totalCentavos, antes: a.totalCentavos })),
    )
    .filter(
      (v) =>
        Math.abs(v.diferenca) >= VARIACAO_MINIMA_CENTAVOS &&
        (v.antes === 0 || Math.abs(v.diferenca) / v.antes >= VARIACAO_MINIMA_PERCENTUAL),
    );

  variacoes
    .filter((v) => v.diferenca > 0)
    .sort((a, b) => b.diferenca - a.diferenca)
    .slice(0, 2)
    .forEach((v) =>
      insights.push({
        id: `alta-${v.categoria}`,
        tom: 'alerta',
        tema: 'gastos',
        titulo: `Mais gastos com ${minuscula(v.categoria)}`,
        texto: `Você gastou ${formatarCentavos(v.diferenca)} a mais em ${minuscula(v.categoria)} este mês do que no mês passado.`,
      }),
    );

  const queda = variacoes.filter((v) => v.diferenca < 0).sort((a, b) => a.diferenca - b.diferenca)[0];
  if (queda) {
    insights.push({
      id: `queda-${queda.categoria}`,
      tom: 'positivo',
      tema: 'gastos',
      titulo: `Menos gastos com ${minuscula(queda.categoria)}`,
      texto: `Você gastou ${formatarCentavos(-queda.diferenca)} a menos em ${minuscula(queda.categoria)} do que no mês passado.`,
    });
  }

  // Comparação com a média dos meses anteriores (só se o mês atual já terminou ou estiver avançado)
  const mesesComGasto = e.historico.filter((r) => r.despesasCentavos > 0);
  const dia = Number(e.dataHoje.slice(8, 10));
  const mesAtualEmCurso = e.dataHoje.slice(0, 7) === e.mes;
  if (mesesComGasto.length >= 2 && atual.despesasCentavos > 0 && (!mesAtualEmCurso || dia >= 20)) {
    const media = mesesComGasto.reduce((s, r) => s + r.despesasCentavos, 0) / mesesComGasto.length;
    const diferenca = (atual.despesasCentavos - media) / media;
    if (Math.abs(diferenca) >= 0.1) {
      insights.push({
        id: 'comparacao-media',
        tom: diferenca > 0 ? 'alerta' : 'positivo',
        tema: 'gastos',
        titulo: 'Comparado com a sua média',
        texto: `Seus gastos deste mês estão ${pct(Math.abs(diferenca))} ${diferenca > 0 ? 'acima' : 'abaixo'} da sua média dos últimos ${mesesComGasto.length} meses.`,
      });
    }
  }

  // Projeção do mês no ritmo atual
  if (mesAtualEmCurso && dia >= DIA_MINIMO_PROJECAO && atual.despesasCentavos > 0) {
    const [ano, m] = e.mes.split('-').map(Number);
    const diasNoMes = new Date(ano, m, 0).getDate();
    if (dia < diasNoMes) {
      const projecao = Math.round((atual.despesasCentavos / dia) * diasNoMes);
      const limite =
        e.orcamentos.geral?.limiteCentavos ??
        (e.perfil && e.perfil.rendaMensalCentavos > 0
          ? Math.max(0, e.perfil.rendaMensalCentavos - e.perfil.metaEconomiaCentavos)
          : null);
      const passa = limite !== null && projecao > limite;
      insights.push({
        id: 'projecao-mes',
        tom: passa ? 'alerta' : 'neutro',
        tema: 'gastos',
        titulo: 'Projeção do mês',
        texto:
          `No ritmo atual, você vai gastar cerca de ${formatarCentavos(projecao)} em ${nomeDoMes(e.mes).split(' ')[0]}.` +
          (passa && limite !== null
            ? ` Isso passa do seu limite em ${formatarCentavos(projecao - limite)}.`
            : limite !== null
              ? ' Dentro do seu limite.'
              : ''),
      });
    }
  }

  // Onde reduzir: a maior categoria não essencial
  const reduzivel = atual.despesasPorCategoria.find((c) => !ESSENCIAIS.has(c.categoria));
  if (reduzivel && reduzivel.totalCentavos >= 5_000) {
    const economia = Math.round(reduzivel.totalCentavos * 0.1);
    insights.push({
      id: 'onde-reduzir',
      tom: 'neutro',
      tema: 'gastos',
      titulo: 'Onde dá para reduzir',
      texto: `${reduzivel.categoria} é seu maior gasto que não é essencial (${formatarCentavos(reduzivel.totalCentavos)} neste mês). Reduzir 10% economizaria ${formatarCentavos(economia)} por mês.`,
    });
  }
  return insights;
}

function analisarOrcamento(e: EntradaAnalise): InsightIA[] {
  const insights: InsightIA[] = [];
  const { geral, categorias } = e.orcamentos;
  for (const s of [geral, ...categorias]) {
    if (!s?.mensagem) continue;
    insights.push({
      id: `orcamento-${s.categoriaId ?? 'geral'}`,
      tom: 'alerta',
      tema: 'orcamento',
      titulo: s.situacao === 'ultrapassou' ? 'Orçamento ultrapassado' : 'Perto do limite',
      texto: s.mensagem,
    });
  }
  if (!geral && categorias.length === 0 && e.atual.despesasCentavos > 0) {
    insights.push({
      id: 'sem-orcamento',
      tom: 'neutro',
      tema: 'orcamento',
      titulo: 'Defina um orçamento',
      texto: 'Você ainda não tem orçamento. Definir um limite mensal ajuda o EcoTrust a avisar antes de você gastar demais.',
      acao: { rotulo: 'Definir orçamento', rota: '/planejar' },
    });
  } else if (categorias.length > 0 && categorias.every((c) => c.situacao === 'dentro') && (!geral || geral.situacao === 'dentro')) {
    insights.push({
      id: 'orcamento-em-dia',
      tom: 'positivo',
      tema: 'orcamento',
      titulo: 'Orçamento em dia',
      texto: 'Todos os seus orçamentos estão dentro do limite neste mês.',
    });
  }
  return insights;
}

function analisarMetas(e: EntradaAnalise): InsightIA[] {
  const insights: InsightIA[] = [];
  const ativas = e.metas.filter((m) => !m.concluida);

  for (const m of ativas) {
    const ritmo = textoRitmo(m);
    if (m.porMesNecessarioCentavos !== null && m.ritmoMensalCentavos !== null && m.ritmoMensalCentavos < m.porMesNecessarioCentavos) {
      insights.push({
        id: `meta-atrasada-${m.id}`,
        tom: 'alerta',
        tema: 'metas',
        titulo: m.nome,
        texto: `Para cumprir o prazo, você precisa guardar ${formatarCentavos(m.porMesNecessarioCentavos)} por mês. Seu ritmo recente é de ${formatarCentavos(m.ritmoMensalCentavos)}.`,
      });
    } else if (ritmo) {
      insights.push({ id: `meta-ritmo-${m.id}`, tom: 'positivo', tema: 'metas', titulo: m.nome, texto: ritmo });
    } else if (m.prazoVencido) {
      insights.push({
        id: `meta-vencida-${m.id}`,
        tom: 'alerta',
        tema: 'metas',
        titulo: m.nome,
        texto: `O prazo desta meta já passou e ainda faltam ${formatarCentavos(m.faltaCentavos)}. Que tal definir um novo prazo?`,
      });
    }
  }

  for (const m of e.metas.filter((x) => x.concluida)) {
    insights.push({ id: `meta-concluida-${m.id}`, tom: 'positivo', tema: 'metas', titulo: m.nome, texto: 'Meta alcançada! Parabéns.' });
  }

  const temReserva = e.metas.some((m) => minuscula(m.nome).includes('reserva'));
  const fixas = e.perfil?.despesasFixasCentavos ?? 0;
  if (!temReserva && fixas > 0) {
    insights.push({
      id: 'sugestao-reserva',
      tom: 'neutro',
      tema: 'metas',
      titulo: 'Reserva de emergência',
      texto: `Uma reserva de 6 meses das suas contas fixas seria ${formatarCentavos(fixas * 6)}. Ela protege você de imprevistos antes de investir.`,
      acao: { rotulo: 'Criar meta', rota: '/nova-meta' },
    });
  } else if (e.metas.length === 0) {
    insights.push({
      id: 'sem-metas',
      tom: 'neutro',
      tema: 'metas',
      titulo: 'Crie uma meta',
      texto: 'Metas dão um destino para o dinheiro que sobra. Comece com uma pequena.',
      acao: { rotulo: 'Criar meta', rota: '/nova-meta' },
    });
  }
  return insights;
}

const ORDEM_TOM = { alerta: 0, positivo: 1, neutro: 2 } as const;

export function gerarAnalise(e: EntradaAnalise): Analise {
  if (e.atual.receitasCentavos === 0 && e.atual.despesasCentavos === 0 && e.metas.length === 0) {
    return {
      mes: e.mes,
      resumo: `Ainda não há dados de ${nomeDoMes(e.mes).split(' ')[0]} para analisar.`,
      insights: [
        {
          id: 'sem-dados',
          tom: 'neutro',
          tema: 'gastos',
          titulo: 'Comece registrando',
          texto: 'Registre suas receitas e despesas do mês. Quanto mais dados, melhores as análises do EcoTrust.',
          acao: { rotulo: 'Novo lançamento', rota: '/novo-lancamento' },
        },
      ],
    };
  }

  const insights = [...analisarRenda(e), ...analisarGastos(e), ...analisarOrcamento(e), ...analisarMetas(e)]
    // Estável: mantém a ordem por tema dentro de cada tom
    .map((insight, i) => ({ insight, i }))
    .sort((a, b) => ORDEM_TOM[a.insight.tom] - ORDEM_TOM[b.insight.tom] || a.i - b.i)
    .map(({ insight }) => insight);

  const alertas = insights.filter((i) => i.tom === 'alerta').length;
  const positivos = insights.filter((i) => i.tom === 'positivo').length;
  const partes: string[] = [];
  if (alertas > 0) partes.push(`${alertas} ${alertas === 1 ? 'ponto de atenção' : 'pontos de atenção'}`);
  if (positivos > 0) partes.push(`${positivos} ${positivos === 1 ? 'boa notícia' : 'boas notícias'}`);
  const nome = nomeDoMes(e.mes).split(' ')[0];

  return {
    mes: e.mes,
    resumo: partes.length > 0 ? `Analisei ${nome}: ${partes.join(' e ')}.` : `Analisei ${nome}. Veja o que encontrei.`,
    insights,
  };
}

export function obterAnalise(mes: string): Analise {
  return gerarAnalise({
    mes,
    dataHoje: hoje(),
    atual: obterResumoDoMes(mes),
    anterior: obterResumoDoMes(somarMeses(mes, -1)),
    historico: [1, 2, 3].map((i) => obterResumoDoMes(somarMeses(mes, -i))),
    perfil: obterPerfilFinanceiro(),
    recorrentesCentavos: listarTransacoes({ mes, tipo: 'despesa' })
      .filter((t) => t.recorrente)
      .reduce((s, t) => s + t.valorCentavos, 0),
    orcamentos: obterOrcamentos(mes),
    metas: obterMetas(),
  });
}
