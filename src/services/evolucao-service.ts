/**
 * Evolução da saúde financeira mês a mês, com comentários.
 * - `montarEvolucao` (puro): comentário da EcoTrust IA para cada mês, dizendo o que mudou nos fatores.
 * - `pedirAnaliseDaEvolucao`: pede ao Claude um comentário sobre a evolução (usa créditos da API),
 *   e guarda o resultado para não pedir de novo sem necessidade.
 */

import { lerConfiguracao, salvarConfiguracao } from '@/repositories/configuracoes-repository';
import { listarHistoricoSaude, type PontoHistoricoSaude } from '@/repositories/jornada-repository';
import { montarContextoIA } from '@/services/contexto-ia-service';
import { ErroValidacao } from '@/services/erros';
import { faixaDaNota, ROTULO_FAIXA, type FaixaSaude } from '@/services/saude-service';
import { mesAtual, nomeDoMes } from '@/utils/datas';

const NOME_FATOR: Record<string, string> = {
  poupanca: 'taxa de poupança',
  fixas: 'despesas fixas',
  orcamento: 'orçamento',
  metas: 'metas',
  'nao-essenciais': 'gastos não essenciais',
  saldo: 'saldo acumulado',
};

/** Quantos meses o gráfico mostra */
export const MESES_EVOLUCAO = 6;

export type PontoEvolucao = {
  mes: string;
  nota: number;
  faixa: FaixaSaude;
  estimado: boolean;
  /** Diferença em relação ao mês anterior do gráfico (null no primeiro) */
  delta: number | null;
  comentario: string;
};

export type Evolucao = { pontos: PontoEvolucao[]; resumo: string };

const nomeMes = (mes: string) => nomeDoMes(mes).split(' ')[0];
const pontos = (n: number) => `${n} ${Math.abs(n) === 1 ? 'ponto' : 'pontos'}`;

function maiorVariacao(atual: Record<string, number>, anterior: Record<string, number>, sinal: 1 | -1) {
  let melhor: { id: string; diferenca: number } | null = null;
  for (const id of Object.keys(atual)) {
    const diferenca = Math.round(((atual[id] ?? 0) - (anterior[id] ?? 0)) * sinal);
    if (diferenca >= 1 && (!melhor || diferenca > melhor.diferenca)) melhor = { id, diferenca };
  }
  return melhor;
}

function comentar(ponto: PontoHistoricoSaude, anterior: PontoHistoricoSaude | null): string {
  const faixa = ROTULO_FAIXA[faixaDaNota(ponto.nota)].toLocaleLowerCase('pt-BR');
  const partes: string[] = [];
  if (!anterior) {
    partes.push(`Em ${nomeMes(ponto.mes)}, sua nota foi ${ponto.nota} (${faixa}).`);
  } else {
    const delta = ponto.nota - anterior.nota;
    if (delta > 0) partes.push(`Sua nota subiu ${pontos(delta)} em relação a ${nomeMes(anterior.mes)}.`);
    else if (delta < 0) partes.push(`Sua nota caiu ${pontos(-delta)} em relação a ${nomeMes(anterior.mes)}.`);
    else partes.push(`Sua nota ficou igual à de ${nomeMes(anterior.mes)}.`);

    if (ponto.fatores && anterior.fatores) {
      const ganho = maiorVariacao(ponto.fatores, anterior.fatores, 1);
      const perda = maiorVariacao(ponto.fatores, anterior.fatores, -1);
      if (ganho) partes.push(`O que mais ajudou: ${NOME_FATOR[ganho.id] ?? ganho.id} (+${ganho.diferenca}).`);
      if (perda) partes.push(`O que mais pesou: ${NOME_FATOR[perda.id] ?? perda.id} (−${perda.diferenca}).`);
    }
  }
  if (ponto.estimado) partes.push('(Estimado pelos seus lançamentos.)');
  return partes.join(' ');
}

export function montarEvolucao(historico: PontoHistoricoSaude[]): Evolucao {
  const recentes = historico.slice(-MESES_EVOLUCAO);
  const pontosEvolucao = recentes.map((p, i) => ({
    mes: p.mes,
    nota: p.nota,
    faixa: faixaDaNota(p.nota),
    estimado: p.estimado,
    delta: i > 0 ? p.nota - recentes[i - 1].nota : null,
    comentario: comentar(p, i > 0 ? recentes[i - 1] : null),
  }));

  let resumo: string;
  if (pontosEvolucao.length === 0) {
    resumo = 'Registre seus lançamentos para acompanhar a evolução da sua saúde financeira.';
  } else if (pontosEvolucao.length === 1) {
    resumo = 'Este é o primeiro mês do seu histórico. A evolução aparece conforme os meses passam.';
  } else {
    const primeiro = pontosEvolucao[0];
    const ultimo = pontosEvolucao.at(-1)!;
    const melhor = pontosEvolucao.reduce((a, b) => (b.nota > a.nota ? b : a));
    const diferenca = ultimo.nota - primeiro.nota;
    const tendencia =
      diferenca > 0 ? `subiu de ${primeiro.nota} para ${ultimo.nota}` : diferenca < 0 ? `caiu de ${primeiro.nota} para ${ultimo.nota}` : `se manteve em ${ultimo.nota}`;
    resumo = `Nos últimos ${pontosEvolucao.length} meses, sua nota ${tendencia}. Seu melhor mês foi ${nomeMes(melhor.mes)} (${melhor.nota}).`;
  }

  return { pontos: pontosEvolucao, resumo };
}

export function obterEvolucao(): Evolucao {
  return montarEvolucao(listarHistoricoSaude());
}

// ---------- Análise do Claude (sob demanda, guardada) ----------

const CHAVE_ANALISE = 'analise_evolucao';

export type AnaliseEvolucao = { texto: string; mes: string; geradoEm: string };

export function obterAnaliseSalva(): AnaliseEvolucao | null {
  const texto = lerConfiguracao(CHAVE_ANALISE);
  if (!texto) return null;
  try {
    return JSON.parse(texto) as AnaliseEvolucao;
  } catch {
    return null;
  }
}

export function montarPedidoAnalise(evolucao: Evolucao) {
  const linhas = evolucao.pontos.map(
    (p) => `- ${nomeDoMes(p.mes)}: nota ${p.nota}${p.estimado ? ' (estimada)' : ''}. ${p.comentario}`,
  );
  return [
    'Comente a evolução da minha saúde financeira nos últimos meses, em até 3 parágrafos curtos.',
    'Diga o que melhorou, o que piorou e qual é a ação mais importante para o próximo mês.',
    'Histórico da nota (0 a 100):',
    ...linhas,
  ].join('\n');
}

/** Pede ao EcoTrust (Claude) um comentário sobre a evolução e guarda a resposta. */
export async function pedirAnaliseDaEvolucao(evolucao: Evolucao): Promise<AnaliseEvolucao> {
  let dados: { resposta?: string; erro?: string };
  try {
    const resposta = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mensagens: [{ role: 'user', content: montarPedidoAnalise(evolucao) }],
        contexto: montarContextoIA(),
      }),
    });
    dados = (await resposta.json()) as { resposta?: string; erro?: string };
  } catch {
    throw new ErroValidacao('Não consegui me conectar ao servidor do EcoTrust. Tente de novo em instantes.');
  }
  if (!dados.resposta) throw new ErroValidacao(dados.erro ?? 'Não consegui gerar a análise agora.');

  const analise: AnaliseEvolucao = { texto: dados.resposta, mes: mesAtual(), geradoEm: new Date().toISOString() };
  salvarConfiguracao(CHAVE_ANALISE, JSON.stringify(analise));
  return analise;
}
