/**
 * Jornada EcoTrust: pontos de experiência (XP), níveis, sequência de dias e conquistas.
 *
 * Tudo é calculado a partir dos dados reais do usuário (nada de pontos "soltos"):
 * - 10 XP por lançamento registrado
 * -  5 XP por dia diferente em que registrou algo (hábito)
 * - 15 XP por valor guardado numa meta; 20 XP por meta criada; 150 XP por meta concluída
 * - 20 XP por orçamento definido (até 5)
 * - 50 XP por perfil financeiro completo; 30 XP por dados pessoais completos
 * - 10 XP por aula concluída na Trust Academy
 * - 50 XP por conquista alcançada
 *
 * `calcularJornada` é puro; `obterJornada` busca os dados; `sincronizarJornada` grava conquistas
 * novas e a nota de saúde do mês (e devolve as conquistas recém-alcançadas, para comemorar).
 */

import {
  contarDepositosEmMetas,
  contarOrcamentos,
  listarConquistasAlcancadas,
  listarHistoricoSaude,
  listarMomentosDeRegistro,
  registrarConquistas,
  salvarNotaDoMes,
  type PontoHistoricoSaude,
} from '@/repositories/jornada-repository';
import { obterPerfilFinanceiro } from '@/repositories/perfil-financeiro-repository';
import { obterPerfilPessoal } from '@/repositories/perfil-pessoal-repository';
import { obterSituacaoFinanceira } from '@/repositories/situacao-repository';
import { contarProgressoAcademy } from '@/services/academy-service';
import { obterMetas } from '@/services/metas-service';
import { calcularOrcamentos, obterOrcamentos } from '@/services/orcamento-service';
import { camposPreenchidos, TOTAL_CAMPOS_PESSOAIS } from '@/services/perfil-pessoal-service';
import { obterResumoDoMes } from '@/services/resumo-service';
import { obterSaude, obterSaudeDoMes, pontosPorFator } from '@/services/saude-service';
import type { PerfilPessoal, ProgressoMeta, ResumoMes, SituacaoFinanceira } from '@/types/financas';
import { diasEntre, hoje, mesAtual, paraDataLocal, somarMeses } from '@/utils/datas';

export const NIVEIS = [
  { minimo: 0, nome: 'Iniciante' },
  { minimo: 100, nome: 'Organizado' },
  { minimo: 300, nome: 'Planejador' },
  { minimo: 600, nome: 'Poupador' },
  { minimo: 1000, nome: 'Estrategista' },
  { minimo: 1600, nome: 'Investidor consciente' },
  { minimo: 2500, nome: 'Mestre das finanças' },
];

export type DefinicaoConquista = { id: string; nome: string; descricao: string; icone: string };

export const CONQUISTAS: DefinicaoConquista[] = [
  { id: 'primeiro-passo', nome: 'Primeiro passo', descricao: 'Registrou o primeiro lançamento.', icone: '🌱' },
  { id: 'registrador', nome: 'Registrador', descricao: 'Registrou 50 lançamentos.', icone: '📒' },
  { id: 'sequencia-7', nome: 'Uma semana firme', descricao: 'Registrou algo 7 dias seguidos.', icone: '🔥' },
  { id: 'sequencia-30', nome: 'Hábito de ferro', descricao: 'Registrou algo 30 dias seguidos.', icone: '💪' },
  { id: 'primeira-meta', nome: 'Sonho no papel', descricao: 'Criou a primeira meta.', icone: '🎯' },
  { id: 'meta-concluida', nome: 'Missão cumprida', descricao: 'Concluiu uma meta.', icone: '🏆' },
  { id: 'reserva-completa', nome: 'Porto seguro', descricao: 'Completou a reserva de emergência.', icone: '🛡️' },
  { id: 'orcamento-definido', nome: 'No controle', descricao: 'Definiu um orçamento.', icone: '📊' },
  { id: 'mes-no-azul', nome: 'Mês no azul', descricao: 'Terminou um mês dentro de todos os orçamentos.', icone: '💙' },
  { id: 'poupador', nome: 'Poupador', descricao: 'Guardou 20% ou mais da renda em um mês.', icone: '💰' },
  { id: 'saude-boa', nome: 'Saúde em dia', descricao: 'Alcançou nota 70 de saúde financeira.', icone: '❤️' },
  { id: 'perfil-completo', nome: 'Quem sou eu', descricao: 'Completou os dados pessoais do perfil.', icone: '🪪' },
  { id: 'curso-concluido', nome: 'Aluno dedicado', descricao: 'Concluiu um curso da Trust Academy.', icone: '🎓' },
];

export type ConquistaJornada = DefinicaoConquista & {
  alcancada: boolean;
  /** Data (ISO) em que foi registrada, se já foi */
  alcancadaEm: string | null;
  /** Progresso para as que dependem de contagem, ex.: "12/50" */
  progresso: string | null;
};

export type Jornada = {
  xp: number;
  nivel: number;
  nomeNivel: string;
  /** XP dentro do nível atual e XP necessário para o próximo (null no nível máximo) */
  xpNoNivel: number;
  xpParaProximo: number | null;
  sequenciaAtual: number;
  melhorSequencia: number;
  diasDeUso: number;
  totalLancamentos: number;
  metasConcluidas: number;
  conquistas: ConquistaJornada[];
  historicoSaude: PontoHistoricoSaude[];
};

export type EntradaJornada = {
  dataHoje: string;
  /** Dias (AAAA-MM-DD, horário local) em que cada lançamento foi registrado */
  diasDeRegistro: string[];
  depositosEmMetas: number;
  orcamentosDefinidos: number;
  metas: ProgressoMeta[];
  perfilFinanceiroCompleto: boolean;
  perfilPessoal: PerfilPessoal | null;
  situacao: SituacaoFinanceira | null;
  /** Taxa de poupança do mês atual e do anterior (null sem receita) */
  taxasPoupanca: (number | null)[];
  terminouMesNoAzul: boolean;
  notaSaude: number | null;
  conquistasRegistradas: Map<string, string>;
  historicoSaude: PontoHistoricoSaude[];
  /** Início do uso (data da conta ou do primeiro registro) */
  inicio: string | null;
  /** Trust Academy (opcionais: sem informação contam como zero) */
  aulasConcluidas?: number;
  cursosConcluidos?: number;
};

/** Sequência de dias seguidos com registro: a atual (terminando hoje ou ontem) e a melhor. */
export function calcularSequencias(dias: string[], dataHoje: string) {
  const unicos = [...new Set(dias)].sort();
  let melhor = 0;
  let corrente = 0;
  for (let i = 0; i < unicos.length; i++) {
    corrente = i > 0 && diasEntre(unicos[i - 1], unicos[i]) === 1 ? corrente + 1 : 1;
    melhor = Math.max(melhor, corrente);
  }
  const ultimo = unicos.at(-1);
  const atual = ultimo && diasEntre(ultimo, dataHoje) <= 1 ? corrente : 0;
  return { atual, melhor };
}

export function nivelPorXp(xp: number) {
  let indice = 0;
  for (let i = 0; i < NIVEIS.length; i++) if (xp >= NIVEIS[i].minimo) indice = i;
  const proximo = NIVEIS[indice + 1];
  return {
    nivel: indice + 1,
    nomeNivel: NIVEIS[indice].nome,
    xpNoNivel: xp - NIVEIS[indice].minimo,
    xpParaProximo: proximo ? proximo.minimo - NIVEIS[indice].minimo : null,
  };
}

export function calcularJornada(e: EntradaJornada): Jornada {
  const totalLancamentos = e.diasDeRegistro.length;
  const diasDistintos = new Set(e.diasDeRegistro).size;
  const { atual, melhor } = calcularSequencias(e.diasDeRegistro, e.dataHoje);
  const metasConcluidas = e.metas.filter((m) => m.concluida).length;
  const reservaCompleta =
    e.situacao?.reserva === 'completa' ||
    e.metas.some((m) => m.concluida && m.nome.toLocaleLowerCase('pt-BR').includes('reserva'));
  const pessoalCompleto = e.perfilPessoal !== null && camposPreenchidos(e.perfilPessoal) === TOTAL_CAMPOS_PESSOAIS;

  const condicoes: Record<string, { alcancada: boolean; progresso: string | null }> = {
    'primeiro-passo': { alcancada: totalLancamentos >= 1, progresso: null },
    registrador: { alcancada: totalLancamentos >= 50, progresso: `${Math.min(totalLancamentos, 50)}/50` },
    'sequencia-7': { alcancada: melhor >= 7, progresso: `${Math.min(melhor, 7)}/7 dias` },
    'sequencia-30': { alcancada: melhor >= 30, progresso: `${Math.min(melhor, 30)}/30 dias` },
    'primeira-meta': { alcancada: e.metas.length > 0, progresso: null },
    'meta-concluida': { alcancada: metasConcluidas > 0, progresso: null },
    'reserva-completa': { alcancada: reservaCompleta, progresso: null },
    'orcamento-definido': { alcancada: e.orcamentosDefinidos > 0, progresso: null },
    'mes-no-azul': { alcancada: e.terminouMesNoAzul, progresso: null },
    poupador: { alcancada: e.taxasPoupanca.some((t) => t !== null && t >= 0.2), progresso: null },
    'saude-boa': { alcancada: (e.notaSaude ?? 0) >= 70, progresso: null },
    'perfil-completo': {
      alcancada: pessoalCompleto,
      progresso: `${e.perfilPessoal ? camposPreenchidos(e.perfilPessoal) : 0}/${TOTAL_CAMPOS_PESSOAIS}`,
    },
    'curso-concluido': { alcancada: (e.cursosConcluidos ?? 0) > 0, progresso: null },
  };

  const conquistas: ConquistaJornada[] = CONQUISTAS.map((c) => {
    // Conquista registrada continua valendo, mesmo que a condição deixe de ser verdadeira depois.
    const registrada = e.conquistasRegistradas.get(c.id) ?? null;
    const alcancada = registrada !== null || condicoes[c.id].alcancada;
    return { ...c, alcancada, alcancadaEm: registrada, progresso: alcancada ? null : condicoes[c.id].progresso };
  });

  const xp =
    totalLancamentos * 10 +
    diasDistintos * 5 +
    e.depositosEmMetas * 15 +
    e.metas.length * 20 +
    metasConcluidas * 150 +
    Math.min(e.orcamentosDefinidos, 5) * 20 +
    (e.perfilFinanceiroCompleto ? 50 : 0) +
    (pessoalCompleto ? 30 : 0) +
    (e.aulasConcluidas ?? 0) * 10 +
    conquistas.filter((c) => c.alcancada).length * 50;

  return {
    xp,
    ...nivelPorXp(xp),
    sequenciaAtual: atual,
    melhorSequencia: melhor,
    diasDeUso: e.inicio ? Math.max(1, diasEntre(e.inicio, e.dataHoje) + 1) : 1,
    totalLancamentos,
    metasConcluidas,
    conquistas,
    historicoSaude: e.historicoSaude.slice(-6),
  };
}

function taxaPoupanca(r: ResumoMes) {
  return r.receitasCentavos > 0 ? (r.receitasCentavos - r.despesasCentavos) / r.receitasCentavos : null;
}

function montarEntrada(inicioConta: string | null): EntradaJornada {
  const dataHoje = hoje();
  const mes = mesAtual();
  const diasDeRegistro = listarMomentosDeRegistro().map((m) => paraDataLocal(new Date(m)));

  // "Mês no azul": o mês passado terminou com todos os orçamentos dentro do limite.
  const mesPassado = somarMeses(mes, -1);
  const resumoPassado = obterResumoDoMes(mesPassado);
  const orcamentosAtuais = obterOrcamentos(mes);
  const orcPassado = calcularOrcamentos({
    mes: mesPassado,
    resumo: resumoPassado,
    orcamentos: [
      ...(orcamentosAtuais.geral ? [{ categoriaId: null, limiteCentavos: orcamentosAtuais.geral.limiteCentavos }] : []),
      ...orcamentosAtuais.categorias.map((c) => ({ categoriaId: c.categoriaId, limiteCentavos: c.limiteCentavos })),
    ],
    categorias: orcamentosAtuais.categorias.map((c) => ({ id: c.categoriaId ?? 0, nome: c.nome, tipo: 'despesa' as const, padrao: false })),
    perfil: null,
    dataHoje,
  });
  const limitesPassados = [orcPassado.geral, ...orcPassado.categorias].filter((o) => o !== null);
  const terminouMesNoAzul =
    resumoPassado.despesasCentavos > 0 &&
    limitesPassados.length > 0 &&
    limitesPassados.every((o) => o.situacao !== 'ultrapassou');

  const primeiroRegistro = [...diasDeRegistro].sort()[0] ?? null;
  const inicio = [inicioConta ? paraDataLocal(new Date(inicioConta)) : null, primeiroRegistro]
    .filter((d): d is string => d !== null)
    .sort()[0] ?? null;

  return {
    dataHoje,
    diasDeRegistro,
    depositosEmMetas: contarDepositosEmMetas(),
    orcamentosDefinidos: contarOrcamentos(),
    metas: obterMetas(),
    perfilFinanceiroCompleto: obterPerfilFinanceiro() !== null,
    perfilPessoal: obterPerfilPessoal(),
    situacao: obterSituacaoFinanceira(),
    taxasPoupanca: [taxaPoupanca(obterResumoDoMes(mes)), taxaPoupanca(resumoPassado)],
    terminouMesNoAzul,
    notaSaude: obterSaude().nota,
    conquistasRegistradas: listarConquistasAlcancadas(),
    historicoSaude: listarHistoricoSaude(),
    inicio,
    ...contarProgressoAcademy(),
  };
}

export function obterJornada(inicioConta: string | null = null): Jornada {
  return calcularJornada(montarEntrada(inicioConta));
}

/** Quantos meses para trás o histórico estima (a partir dos lançamentos) */
const MESES_ESTIMADOS = 5;

/** Estima a nota dos meses anteriores que têm lançamentos (os meses reais não são alterados). */
function preencherMesesAnteriores(mes: string) {
  // Meses reais ficam como estão; os estimados são recalculados (pode ter entrado lançamento com data antiga).
  const reais = new Set(listarHistoricoSaude().filter((h) => !h.estimado).map((h) => h.mes));
  for (let i = 1; i <= MESES_ESTIMADOS; i++) {
    const anterior = somarMeses(mes, -i);
    if (reais.has(anterior)) continue;
    const saude = obterSaudeDoMes(anterior);
    if (saude.nota !== null) salvarNotaDoMes(anterior, saude.nota, pontosPorFator(saude), true);
  }
}

/**
 * Grava as conquistas recém-alcançadas e a nota de saúde do mês.
 * Retorna as conquistas novas (para o app comemorar). Só escreve no banco se algo mudou.
 */
export function sincronizarJornada(): DefinicaoConquista[] {
  const mes = mesAtual();
  const saude = obterSaude();
  if (saude.nota !== null) salvarNotaDoMes(mes, saude.nota, pontosPorFator(saude));
  preencherMesesAnteriores(mes);

  const jornada = obterJornada();
  const novas = jornada.conquistas.filter((c) => c.alcancada && c.alcancadaEm === null);
  registrarConquistas(novas.map((c) => c.id));
  return novas;
}
