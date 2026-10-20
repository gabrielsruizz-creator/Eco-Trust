/**
 * Primeiros insights do EcoTrust: regras simples sobre os dados do usuário.
 * Ordem de importância: alertas → conquistas → informações. A tela mostra o primeiro da lista.
 */

import type { StatusOrcamento } from '@/services/orcamento-service';
import type { Insight, ResumoMes } from '@/types/financas';
import { formatarCentavos } from '@/utils/moeda';

/** Só comparamos categorias que tiveram pelo menos R$ 50 no mês passado, para evitar "aumentou 300%" sobre R$ 5. */
const MINIMO_COMPARACAO_CENTAVOS = 5000;
/** Aumento a partir do qual vale avisar */
const AUMENTO_RELEVANTE = 0.15;

/** Impostos sobre consumo do mês (do Impostômetro). */
export type ResumoImpostosInsight = {
  impostosCentavos: number;
  percentualDosGastos: number;
  /** Categoria que mais pagou imposto no mês */
  maiorCategoria: { nome: string; impostosCentavos: number } | null;
};

export type EntradaInsights = {
  resumoAtual: ResumoMes;
  resumoAnterior: ResumoMes;
  metaEconomiaCentavos: number;
  percentualMeta: number | null;
  disponivelParaGastarCentavos: number | null;
  /** De onde vem o limite do mês: orçamento geral definido pelo usuário ou renda − meta */
  origemLimite: 'orcamento' | 'renda' | null;
  orcamentosCategorias: StatusOrcamento[];
  impostos?: ResumoImpostosInsight | null;
};

function nomeCategoria(nome: string) {
  return nome.toLocaleLowerCase('pt-BR');
}

function maiorAumentoDeCategoria(atual: ResumoMes, anterior: ResumoMes) {
  let maior: { categoria: string; percentual: number; diferenca: number } | null = null;
  for (const c of atual.despesasPorCategoria) {
    const antes = anterior.despesasPorCategoria.find((a) => a.categoriaId === c.categoriaId);
    if (!antes || antes.totalCentavos < MINIMO_COMPARACAO_CENTAVOS) continue;
    const diferenca = c.totalCentavos - antes.totalCentavos;
    if (diferenca / antes.totalCentavos < AUMENTO_RELEVANTE) continue;
    if (!maior || diferenca > maior.diferenca) {
      maior = {
        categoria: c.categoria,
        percentual: Math.round((diferenca / antes.totalCentavos) * 100),
        diferenca,
      };
    }
  }
  return maior;
}

export function gerarInsights(entrada: EntradaInsights): Insight[] {
  const { resumoAtual: atual, resumoAnterior: anterior } = entrada;

  if (atual.receitasCentavos === 0 && atual.despesasCentavos === 0) {
    return [
      {
        id: 'sem-dados',
        tom: 'neutro',
        texto:
          'Você ainda não registrou nada neste mês. Adicione suas receitas e despesas para o EcoTrust analisar sua vida financeira.',
      },
    ];
  }

  const insights: Insight[] = [];

  if (atual.receitasCentavos > 0 && atual.despesasCentavos > atual.receitasCentavos) {
    insights.push({
      id: 'gastou-mais-que-recebeu',
      tom: 'alerta',
      texto: `Suas despesas deste mês já passaram suas receitas em ${formatarCentavos(atual.despesasCentavos - atual.receitasCentavos)}.`,
    });
  }

  if (entrada.disponivelParaGastarCentavos !== null && entrada.disponivelParaGastarCentavos < 0) {
    const excesso = formatarCentavos(-entrada.disponivelParaGastarCentavos);
    insights.push({
      id: 'acima-do-limite',
      tom: 'alerta',
      texto:
        entrada.origemLimite === 'orcamento'
          ? `Você ultrapassou seu orçamento mensal em ${excesso}.`
          : entrada.metaEconomiaCentavos > 0
            ? `Você já gastou ${excesso} além do que pode para atingir sua meta deste mês.`
            : `Você já gastou ${excesso} além da sua renda deste mês.`,
    });
  }

  // Orçamentos por categoria: o mais estourado e o mais perto do limite.
  const estourado = entrada.orcamentosCategorias
    .filter((o) => o.situacao === 'ultrapassou')
    .sort((a, b) => a.restanteCentavos - b.restanteCentavos)[0];
  if (estourado?.mensagem) {
    insights.push({ id: 'orcamento-ultrapassado', tom: 'alerta', texto: estourado.mensagem });
  }
  const atencao = entrada.orcamentosCategorias
    .filter((o) => o.situacao === 'atencao')
    .sort((a, b) => b.percentual - a.percentual)[0];
  if (atencao?.mensagem) {
    insights.push({ id: 'orcamento-atencao', tom: 'alerta', texto: atencao.mensagem });
  }

  const aumento = maiorAumentoDeCategoria(atual, anterior);
  if (aumento) {
    insights.push({
      id: 'aumento-categoria',
      tom: 'alerta',
      texto: `Seus gastos com ${nomeCategoria(aumento.categoria)} aumentaram ${aumento.percentual}% em relação ao mês passado.`,
    });
  }

  if (entrada.percentualMeta !== null && entrada.percentualMeta >= 100) {
    insights.push({
      id: 'meta-atingida',
      tom: 'positivo',
      texto: 'Parabéns! Você já atingiu sua meta de economia deste mês.',
    });
  } else if (entrada.percentualMeta !== null && entrada.percentualMeta > 0) {
    insights.push({
      id: 'progresso-meta',
      tom: 'positivo',
      texto: `Você já economizou ${Math.floor(entrada.percentualMeta)}% da sua meta deste mês.`,
    });
  }

  if (
    entrada.disponivelParaGastarCentavos !== null &&
    entrada.disponivelParaGastarCentavos >= 0 &&
    atual.despesasCentavos > 0
  ) {
    insights.push({
      id: 'dentro-do-orcamento',
      tom: 'positivo',
      texto: `Você está dentro do seu orçamento mensal. Ainda pode gastar ${formatarCentavos(entrada.disponivelParaGastarCentavos)} este mês.`,
    });
  }

  const impostos = entrada.impostos;
  if (impostos && impostos.impostosCentavos > 0) {
    const maior = impostos.maiorCategoria;
    insights.push({
      id: 'impostos-do-mes',
      tom: 'neutro',
      texto:
        `${formatarCentavos(impostos.impostosCentavos)} dos seus gastos deste mês foram impostos (${impostos.percentualDosGastos.toLocaleString('pt-BR')}%).` +
        (maior ? ` Onde mais pesou: ${nomeCategoria(maior.nome)}, com ${formatarCentavos(maior.impostosCentavos)}.` : ''),
    });
  }

  const principal = atual.despesasPorCategoria[0];
  if (principal && atual.despesasCentavos > 0) {
    insights.push({
      id: 'categoria-principal',
      tom: 'neutro',
      texto: `Sua maior despesa do mês é ${nomeCategoria(principal.categoria)}: ${formatarCentavos(principal.totalCentavos)} (${Math.round((principal.totalCentavos / atual.despesasCentavos) * 100)}% dos gastos).`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'continue-registrando',
      tom: 'neutro',
      texto: 'Continue registrando seus gastos: quanto mais dados, melhores as análises do EcoTrust.',
    });
  }

  return insights;
}
