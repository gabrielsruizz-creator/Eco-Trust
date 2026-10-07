/**
 * Orçamento mensal (geral e por categoria de despesa).
 * `calcularOrcamentos` é puro; `obterOrcamentos` busca os dados no banco.
 */

import { buscarCategoria, listarCategorias } from '@/repositories/categorias-repository';
import {
  listarOrcamentos,
  removerOrcamento,
  salvarOrcamento,
  type Orcamento,
} from '@/repositories/orcamentos-repository';
import { obterPerfilFinanceiro } from '@/repositories/perfil-financeiro-repository';
import { ErroValidacao } from '@/services/erros';
import { obterResumoDoMes } from '@/services/resumo-service';
import type { Categoria, PerfilFinanceiro, ResumoMes } from '@/types/financas';
import { hoje, somarMeses } from '@/utils/datas';
import { formatarCentavos } from '@/utils/moeda';

/** A partir de quanto do limite usado o app avisa */
export const LIMITE_ATENCAO = 80;
const MAX_LIMITE_CENTAVOS = 10_000_000_000;

export type SituacaoOrcamento = 'dentro' | 'atencao' | 'ultrapassou';

export type StatusOrcamento = {
  /** null = orçamento geral */
  categoriaId: number | null;
  nome: string;
  limiteCentavos: number;
  gastoCentavos: number;
  /** Percentual usado (pode passar de 100) */
  percentual: number;
  /** Limite menos o gasto (negativo quando ultrapassou) */
  restanteCentavos: number;
  situacao: SituacaoOrcamento;
  /** Aviso pronto para mostrar, ou null quando está tudo bem */
  mensagem: string | null;
  /** Quanto dá para gastar por dia até o fim do mês (só no mês atual e se ainda há saldo) */
  porDiaCentavos: number | null;
};

export type ResumoOrcamentos = {
  mes: string;
  geral: StatusOrcamento | null;
  /** Do mais usado (%) para o menos usado */
  categorias: StatusOrcamento[];
  /** Renda informada menos a meta de economia: ponto de partida para o orçamento geral */
  sugestaoGeralCentavos: number | null;
};

function diasRestantesNoMes(mes: string, dataHoje: string) {
  if (dataHoje.slice(0, 7) !== mes) return null;
  const [ano, m] = mes.split('-').map(Number);
  const diasNoMes = new Date(ano, m, 0).getDate();
  return diasNoMes - Number(dataHoje.slice(8, 10)) + 1;
}

function montarStatus(
  categoriaId: number | null,
  nome: string,
  limiteCentavos: number,
  gastoCentavos: number,
  diasRestantes: number | null,
): StatusOrcamento {
  const percentual = (gastoCentavos / limiteCentavos) * 100;
  const restante = limiteCentavos - gastoCentavos;
  const situacao: SituacaoOrcamento =
    gastoCentavos > limiteCentavos ? 'ultrapassou' : percentual >= LIMITE_ATENCAO ? 'atencao' : 'dentro';
  const doQue =
    categoriaId === null ? 'seu orçamento mensal' : `seu orçamento de ${nome.toLocaleLowerCase('pt-BR')}`;

  let mensagem: string | null = null;
  if (situacao === 'ultrapassou') mensagem = `Você ultrapassou ${doQue} em ${formatarCentavos(-restante)}.`;
  else if (situacao === 'atencao') mensagem = `Você já utilizou ${Math.floor(percentual)}% do ${doQue}.`;

  return {
    categoriaId,
    nome,
    limiteCentavos,
    gastoCentavos,
    percentual,
    restanteCentavos: restante,
    situacao,
    mensagem,
    porDiaCentavos:
      diasRestantes !== null && restante > 0 ? Math.floor(restante / diasRestantes) : null,
  };
}

export type EntradaOrcamentos = {
  mes: string;
  resumo: ResumoMes;
  orcamentos: Orcamento[];
  categorias: Categoria[];
  perfil: PerfilFinanceiro | null;
  dataHoje: string;
};

export function calcularOrcamentos({
  mes,
  resumo,
  orcamentos,
  categorias,
  perfil,
  dataHoje,
}: EntradaOrcamentos): ResumoOrcamentos {
  const dias = diasRestantesNoMes(mes, dataHoje);
  const gastoPorCategoria = new Map(resumo.despesasPorCategoria.map((c) => [c.categoriaId, c.totalCentavos]));

  let geral: StatusOrcamento | null = null;
  const porCategoria: StatusOrcamento[] = [];

  for (const o of orcamentos) {
    if (o.categoriaId === null) {
      geral = montarStatus(null, 'Orçamento mensal', o.limiteCentavos, resumo.despesasCentavos, dias);
      continue;
    }
    const categoria = categorias.find((c) => c.id === o.categoriaId);
    if (!categoria) continue;
    porCategoria.push(
      montarStatus(categoria.id, categoria.nome, o.limiteCentavos, gastoPorCategoria.get(categoria.id) ?? 0, dias),
    );
  }

  porCategoria.sort((a, b) => b.percentual - a.percentual || a.nome.localeCompare(b.nome, 'pt-BR'));

  const renda = perfil?.rendaMensalCentavos ?? 0;
  return {
    mes,
    geral,
    categorias: porCategoria,
    sugestaoGeralCentavos: renda > 0 ? Math.max(0, renda - (perfil?.metaEconomiaCentavos ?? 0)) : null,
  };
}

/** Máximo de fatias no gráfico de rosca (uma por cor da paleta); o resto vira "Outras". */
export const MAX_FATIAS = 8;

export type FatiaOrcamento = {
  /** null = fatia "Outras" */
  categoriaId: number | null;
  nome: string;
  valorCentavos: number;
  /** Parte do total, de 0 a 1 */
  fracao: number;
  /** Onde a fatia começa no círculo, de 0 a 1 (sentido horário, a partir do topo) */
  inicio: number;
  /** Posição na paleta de cores (null para "Outras") */
  indiceCor: number | null;
};

/**
 * Fatias do gráfico de rosca: como o gasto se divide entre as categorias com orçamento.
 * A cor segue a categoria (ordem do id), não o tamanho, para não mudar quando os valores mudam.
 */
export function montarFatias(categorias: StatusOrcamento[]): FatiaOrcamento[] {
  const comGasto = categorias.filter((c) => c.gastoCentavos > 0 && c.categoriaId !== null);
  const total = comGasto.reduce((s, c) => s + c.gastoCentavos, 0);
  if (total === 0) return [];

  let visiveis = comGasto;
  let outras = 0;
  if (comGasto.length > MAX_FATIAS) {
    const porValor = [...comGasto].sort((a, b) => b.gastoCentavos - a.gastoCentavos);
    visiveis = porValor.slice(0, MAX_FATIAS - 1);
    outras = porValor.slice(MAX_FATIAS - 1).reduce((s, c) => s + c.gastoCentavos, 0);
  }

  // Com até 8 orçamentos, a cor é a posição da categoria entre todas com orçamento (estável mesmo
  // quando uma categoria fica sem gasto). Acima disso, a posição entre as fatias visíveis.
  const porId = (a: StatusOrcamento, b: StatusOrcamento) => (a.categoriaId ?? 0) - (b.categoriaId ?? 0);
  const ordemCor = (categorias.length <= MAX_FATIAS ? [...categorias] : [...visiveis]).sort(porId);
  const fatias: FatiaOrcamento[] = [];
  let inicio = 0;
  // Desenha da maior para a menor, a partir do topo.
  for (const c of [...visiveis].sort((a, b) => b.gastoCentavos - a.gastoCentavos)) {
    const fracao = c.gastoCentavos / total;
    fatias.push({
      categoriaId: c.categoriaId,
      nome: c.nome,
      valorCentavos: c.gastoCentavos,
      fracao,
      inicio,
      indiceCor: ordemCor.indexOf(c),
    });
    inicio += fracao;
  }
  if (outras > 0) {
    fatias.push({ categoriaId: null, nome: 'Outras', valorCentavos: outras, fracao: outras / total, inicio, indiceCor: null });
  }
  return fatias;
}

export function obterOrcamentos(mes: string): ResumoOrcamentos {
  return calcularOrcamentos({
    mes,
    resumo: obterResumoDoMes(mes),
    orcamentos: listarOrcamentos(),
    categorias: listarCategorias('despesa'),
    perfil: obterPerfilFinanceiro(),
    dataHoje: hoje(),
  });
}

/**
 * Sugestão de limite para uma categoria: a média do que foi gasto nela nos 3 meses anteriores
 * (só os meses com gasto), arredondada para cima em dezenas de reais. null se não há histórico.
 */
export function sugerirLimiteCategoria(categoriaId: number, mes: string): number | null {
  const gastos: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const total =
      obterResumoDoMes(somarMeses(mes, -i)).despesasPorCategoria.find((c) => c.categoriaId === categoriaId)
        ?.totalCentavos ?? 0;
    if (total > 0) gastos.push(total);
  }
  if (gastos.length === 0) return null;
  const media = gastos.reduce((s, v) => s + v, 0) / gastos.length;
  return Math.ceil(media / 1000) * 1000;
}

export function definirOrcamento(categoriaId: number | null, limiteCentavos: number) {
  if (!Number.isInteger(limiteCentavos) || limiteCentavos <= 0) {
    throw new ErroValidacao('Informe um limite maior que zero.');
  }
  if (limiteCentavos > MAX_LIMITE_CENTAVOS) {
    throw new ErroValidacao('Esse limite parece alto demais. Confira o número digitado.');
  }
  if (categoriaId !== null) {
    const categoria = buscarCategoria(categoriaId);
    if (!categoria || categoria.tipo !== 'despesa') {
      throw new ErroValidacao('Escolha uma categoria de despesa.');
    }
  }
  salvarOrcamento(categoriaId, limiteCentavos);
}

export function excluirOrcamento(categoriaId: number | null) {
  removerOrcamento(categoriaId);
}

/** Limite atual de um orçamento (para preencher a tela de edição), ou null se não existe. */
export function obterLimite(categoriaId: number | null): number | null {
  return listarOrcamentos().find((o) => o.categoriaId === categoriaId)?.limiteCentavos ?? null;
}
