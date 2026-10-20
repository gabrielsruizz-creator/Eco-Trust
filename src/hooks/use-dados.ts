// Este arquivo fica FORA do React Compiler. O compilador refaz a memoização olhando só para o que
// a função usa, e descartava `versao` (que não é lida dentro da consulta). Resultado: as telas não
// recalculavam ao salvar um lançamento. Aqui a dependência de `versao` precisa ser respeitada à risca.
'use no memo';

/**
 * Hooks de leitura: as telas usam estes hooks para obter dados.
 * Eles recalculam automaticamente quando os repositórios avisam que algo mudou no banco
 * (cada escrita incrementa a "versão dos dados", que entra nas dependências de cada consulta).
 */

import { useMemo, useSyncExternalStore } from 'react';

import { assinarMudancas, lerVersaoDados } from '@/data/database';
import { obterAcademy, obterAula, obterCurso, obterCursosDaCategoria } from '@/services/academy-service';
import { obterAnalise } from '@/services/analise-service';
import { obterAssinatura } from '@/services/assinatura-service';
import { obterUltimoBackup } from '@/services/backup-service';
import { obterCategorias } from '@/services/categorias-service';
import { obterDashboard } from '@/services/dashboard-service';
import { obterAnaliseSalva, obterEvolucao } from '@/services/evolucao-service';
import { obterForum, obterTopico } from '@/services/forum-service';
import { obterJornada } from '@/services/gamificacao-service';
import {
  obterImpostometro,
  obterImpostosDoLancamento,
  obterImpostosDosLancamentos,
} from '@/services/impostometro-service';
import { obterImpostosFixos } from '@/services/impostos-renda-service';
import { obterDeducoesIR } from '@/services/ir-service';
import { obterSimulacaoReforma } from '@/services/reforma-service';
import { obterNotaDoLancamento } from '@/services/nota-fiscal-service';
import { montarHistorico } from '@/services/historico-service';
import { obterMeta, obterMetas } from '@/services/metas-service';
import { obterOrcamentos } from '@/services/orcamento-service';
import { obterPerfil as obterPerfilFinanceiro } from '@/services/perfil-financeiro-service';
import { obterPerfil } from '@/services/perfil-investidor-service';
import { obterPet } from '@/services/pet-service';
import { obterDadosPessoais, obterSituacao } from '@/services/perfil-pessoal-service';
import { obterPreferencias } from '@/services/preferencias-service';
import { obterSaude } from '@/services/saude-service';
import { obterDiasComLancamentos, obterTransacao, obterTransacoes } from '@/services/transacoes-service';
import type { TipoTransacao } from '@/types/financas';

function useVersaoDados() {
  return useSyncExternalStore(assinarMudancas, lerVersaoDados);
}

/* eslint-disable react-hooks/exhaustive-deps -- `versao` é dependência de propósito (dados do banco) */

export function useCategorias(tipo?: TipoTransacao) {
  const versao = useVersaoDados();
  return useMemo(() => obterCategorias(tipo), [versao, tipo]);
}

export function useTransacoes(mes?: string, tipo?: TipoTransacao, categoriaId?: number) {
  const versao = useVersaoDados();
  return useMemo(() => obterTransacoes({ mes, tipo, categoriaId }), [versao, mes, tipo, categoriaId]);
}

export function useTransacao(id: number) {
  const versao = useVersaoDados();
  return useMemo(() => (Number.isInteger(id) ? obterTransacao(id) : null), [versao, id]);
}

/** Impostos de uma despesa: da nota fiscal ou estimados pelo tipo de consumo (null para receitas). */
export function useImpostosDoLancamento(id: number) {
  const versao = useVersaoDados();
  return useMemo(() => (Number.isInteger(id) ? obterImpostosDoLancamento(obterTransacao(id)) : null), [versao, id]);
}

/** Impostos de cada despesa do mês, pelo id do lançamento. */
export function useImpostosDosLancamentos(mes: string) {
  const versao = useVersaoDados();
  return useMemo(() => obterImpostosDosLancamentos(mes), [versao, mes]);
}

/** Impostos da renda e do patrimônio configurados pelo usuário (null se nada configurado). */
export function useImpostosFixos() {
  const versao = useVersaoDados();
  return useMemo(() => obterImpostosFixos(), [versao]);
}

/** Loja, link da SEFAZ e itens da nota de um lançamento (null se não veio de nota lida pelo QR Code). */
export function useNotaDoLancamento(id: number) {
  const versao = useVersaoDados();
  return useMemo(() => (Number.isInteger(id) ? obterNotaDoLancamento(id) : null), [versao, id]);
}

/** Momento do último backup exportado neste aparelho (null = nunca). */
export function useUltimoBackup() {
  const versao = useVersaoDados();
  return useMemo(() => obterUltimoBackup(), [versao]);
}

/** Despesas de saúde e educação do ano para a declaração do IR. */
export function useDeducoesIR(ano: number) {
  const versao = useVersaoDados();
  return useMemo(() => obterDeducoesIR(ano), [versao, ano]);
}

/** Simulação das compras do mês na regra nova da reforma tributária. */
export function useSimulacaoReforma(mes: string) {
  const versao = useVersaoDados();
  return useMemo(() => obterSimulacaoReforma(mes), [versao, mes]);
}

export function useImpostometro(mes: string) {
  const versao = useVersaoDados();
  return useMemo(() => obterImpostometro(mes), [versao, mes]);
}

export function useHistorico(
  mes: string,
  tipo: TipoTransacao | undefined,
  categoriaId: number | null,
  dia: string | null = null,
  busca = '',
) {
  const transacoes = useTransacoes(mes, tipo);
  return useMemo(() => montarHistorico(transacoes, categoriaId, dia, busca), [transacoes, categoriaId, dia, busca]);
}

export function useDiasComLancamentos() {
  const versao = useVersaoDados();
  return useMemo(() => obterDiasComLancamentos(), [versao]);
}

export function useOrcamentos(mes: string) {
  const versao = useVersaoDados();
  return useMemo(() => obterOrcamentos(mes), [versao, mes]);
}

export function useMetas() {
  const versao = useVersaoDados();
  return useMemo(() => obterMetas(), [versao]);
}

export function useMeta(id: number) {
  const versao = useVersaoDados();
  return useMemo(() => (Number.isInteger(id) ? obterMeta(id) : null), [versao, id]);
}

export function useAnalise(mes: string) {
  const versao = useVersaoDados();
  return useMemo(() => obterAnalise(mes), [versao, mes]);
}

export function useAcademy() {
  const versao = useVersaoDados();
  return useMemo(() => obterAcademy(), [versao]);
}

export function useCursosDaCategoria(id: string) {
  const versao = useVersaoDados();
  return useMemo(() => obterCursosDaCategoria(id), [versao, id]);
}

export function useCurso(id: string) {
  const versao = useVersaoDados();
  return useMemo(() => obterCurso(id), [versao, id]);
}

export function useAula(id: string) {
  const versao = useVersaoDados();
  return useMemo(() => obterAula(id), [versao, id]);
}

export function useForum(categoriaId: string | null) {
  const versao = useVersaoDados();
  return useMemo(() => obterForum(categoriaId), [versao, categoriaId]);
}

export function useTopico(id: number) {
  const versao = useVersaoDados();
  return useMemo(() => (Number.isInteger(id) ? obterTopico(id) : null), [versao, id]);
}

export function useJornada(inicioConta: string | null) {
  const versao = useVersaoDados();
  return useMemo(() => obterJornada(inicioConta), [versao, inicioConta]);
}

export function usePet(nomeUsuario: string, inicioConta: string | null) {
  const versao = useVersaoDados();
  return useMemo(() => obterPet(nomeUsuario, inicioConta), [versao, nomeUsuario, inicioConta]);
}

export function useEvolucao() {
  const versao = useVersaoDados();
  return useMemo(() => ({ evolucao: obterEvolucao(), analise: obterAnaliseSalva() }), [versao]);
}

export function useDadosPessoais() {
  const versao = useVersaoDados();
  return useMemo(() => obterDadosPessoais(), [versao]);
}

export function useSituacao() {
  const versao = useVersaoDados();
  return useMemo(() => obterSituacao(), [versao]);
}

export function usePreferencias() {
  const versao = useVersaoDados();
  return useMemo(() => obterPreferencias(), [versao]);
}

/** Plano atual. `plus` = acesso aos recursos pagos. */
export function useAssinatura() {
  const versao = useVersaoDados();
  return useMemo(() => obterAssinatura(), [versao]);
}

export function useSaude() {
  const versao = useVersaoDados();
  return useMemo(() => obterSaude(), [versao]);
}

export function useDashboard(mes: string) {
  const versao = useVersaoDados();
  return useMemo(() => obterDashboard(mes), [versao, mes]);
}

export function usePerfilFinanceiro() {
  const versao = useVersaoDados();
  return useMemo(() => obterPerfilFinanceiro(), [versao]);
}

export function usePerfilInvestidor() {
  const versao = useVersaoDados();
  return useMemo(() => obterPerfil(), [versao]);
}
