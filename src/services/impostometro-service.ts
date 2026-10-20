/**
 * Impostômetro pessoal: quanto do dinheiro gasto no mês foi para o governo em impostos sobre consumo.
 *
 * Cada despesa usa o valor da nota fiscal, quando o usuário informa, ou uma estimativa pelo tipo de
 * consumo da categoria (tabela em `carga-tributaria`). Os cálculos são feitos em centavos "quebrados"
 * e arredondados só no fim, para os totais não acumularem erro de arredondamento.
 */

import {
  cargaTotal,
  NOME_ESFERA,
  perfilTributario,
  TRIBUTOS,
  type Esfera,
  type PerfilTributario,
  type Tributo,
  type TributoId,
} from '@/data/carga-tributaria';
import { buscarCategoria, listarCategorias } from '@/repositories/categorias-repository';
import { listarTransacoes } from '@/repositories/transacoes-repository';
import { perfilTributarioDaCategoria } from '@/services/categorias-service';
import { variacaoPercentual } from '@/services/dashboard-service';
import { obterPerfil } from '@/services/perfil-financeiro-service';
import type { Transacao } from '@/types/financas';
import { somarMeses } from '@/utils/datas';

export type OrigemImposto = 'nota' | 'estimado';

export type ImpostosDoLancamento = {
  totalCentavos: number;
  /** Quanto do valor pago foi imposto, em % */
  percentual: number;
  origem: OrigemImposto;
  perfil: PerfilTributario;
  porTributo: { tributo: Tributo; centavos: number }[];
};

export type Impostometro = {
  mes: string;
  gastosCentavos: number;
  impostosCentavos: number;
  /** Quanto dos gastos foi imposto, em %. null sem gastos */
  percentualDosGastos: number | null;
  /** Receitas do mês ou, sem elas, a renda informada no perfil */
  rendaCentavos: number | null;
  origemRenda: 'receitas' | 'perfil' | null;
  percentualDaRenda: number | null;
  /** Dias do mês trabalhados só para pagar esses impostos. null sem renda */
  diasTrabalhados: number | null;
  diasNoMes: number;
  porTributo: { tributo: Tributo; centavos: number; percentual: number }[];
  porEsfera: { esfera: Esfera; nome: string; centavos: number; percentual: number }[];
  porCategoria: {
    categoriaId: number;
    categoria: string;
    perfil: PerfilTributario;
    gastoCentavos: number;
    impostosCentavos: number;
    /** Carga média da categoria no mês, em % */
    carga: number;
  }[];
  /** Despesas que mais pagaram imposto no mês */
  maioresLancamentos: { transacao: Transacao; impostosCentavos: number; origem: OrigemImposto }[];
  despesas: number;
  despesasComNota: number;
  impostosMesAnteriorCentavos: number;
  /** Variação dos impostos contra o mês anterior, em % (null se o anterior foi zero) */
  variacao: number | null;
  /** De janeiro até este mês */
  acumuladoAnoCentavos: number;
};

const MAX_LANCAMENTOS = 5;

function umaCasa(n: number) {
  return Math.round(n * 10) / 10;
}

/** Divide o imposto de uma despesa entre os tributos (centavos com casas decimais). */
function dividirImposto(
  valorCentavos: number,
  perfil: PerfilTributario,
  tributosNota: number | null,
): { origem: OrigemImposto; total: number; partes: Map<TributoId, number> } {
  const partes = new Map<TributoId, number>();

  if (tributosNota === null) {
    let total = 0;
    for (const t of TRIBUTOS) {
      const parte = (valorCentavos * (perfil.aliquotas[t.id] ?? 0)) / 100;
      if (parte > 0) partes.set(t.id, parte);
      total += parte;
    }
    return { origem: 'estimado', total, partes };
  }

  // Valor da nota: reparte na proporção do tipo de consumo (ou da média geral, se ele for isento).
  const base = cargaTotal(perfil) > 0 ? perfil : perfilTributario('geral');
  const carga = cargaTotal(base);
  for (const t of TRIBUTOS) {
    const parte = (tributosNota * (base.aliquotas[t.id] ?? 0)) / carga;
    if (parte > 0) partes.set(t.id, parte);
  }
  return { origem: 'nota', total: tributosNota, partes };
}

/** Impostos de uma despesa (null para receitas). */
export function obterImpostosDoLancamento(transacao: Transacao | null): ImpostosDoLancamento | null {
  if (!transacao || transacao.tipo !== 'despesa') return null;
  const categoria = buscarCategoria(transacao.categoriaId);
  const perfil = perfilTributario(
    perfilTributarioDaCategoria(categoria ?? { nome: transacao.categoriaNome, perfilTributario: null }),
  );
  const { origem, total, partes } = dividirImposto(transacao.valorCentavos, perfil, transacao.tributosCentavos);
  return {
    totalCentavos: Math.round(total),
    percentual: umaCasa((total / transacao.valorCentavos) * 100),
    origem,
    perfil,
    porTributo: TRIBUTOS.filter((t) => partes.has(t.id)).map((t) => ({
      tributo: t,
      centavos: Math.round(partes.get(t.id) ?? 0),
    })),
  };
}

function mapaDePerfis() {
  return new Map(
    listarCategorias('despesa').map((c) => [c.id, perfilTributario(perfilTributarioDaCategoria(c))]),
  );
}

/** Só o total de impostos de um mês (para comparações e acumulado do ano). */
function totalDoMes(mes: string, perfis: Map<number, PerfilTributario>) {
  let total = 0;
  for (const t of listarTransacoes({ mes, tipo: 'despesa' })) {
    const perfil = perfis.get(t.categoriaId) ?? perfilTributario('geral');
    total += dividirImposto(t.valorCentavos, perfil, t.tributosCentavos).total;
  }
  return total;
}

/** Cálculo puro do impostômetro de um mês, a partir das transações dele. */
export function calcularImpostometro({
  mes,
  transacoes,
  perfis,
  rendaPerfilCentavos,
  impostosMesAnteriorCentavos,
  acumuladoAnoCentavos,
}: {
  mes: string;
  transacoes: Transacao[];
  perfis: Map<number, PerfilTributario>;
  rendaPerfilCentavos: number | null;
  impostosMesAnteriorCentavos: number;
  acumuladoAnoCentavos: number;
}): Impostometro {
  let gastos = 0;
  let receitas = 0;
  let impostos = 0;
  let despesas = 0;
  let despesasComNota = 0;
  const porTributo = new Map<TributoId, number>();
  const porCategoria = new Map<number, Impostometro['porCategoria'][number] & { impostosExatos: number }>();
  const lancamentos: Impostometro['maioresLancamentos'] = [];

  for (const t of transacoes) {
    if (t.tipo === 'receita') {
      receitas += t.valorCentavos;
      continue;
    }
    const perfil = perfis.get(t.categoriaId) ?? perfilTributario('geral');
    const { origem, total, partes } = dividirImposto(t.valorCentavos, perfil, t.tributosCentavos);

    gastos += t.valorCentavos;
    impostos += total;
    despesas++;
    if (origem === 'nota') despesasComNota++;
    partes.forEach((valor, id) => porTributo.set(id, (porTributo.get(id) ?? 0) + valor));

    const categoria = porCategoria.get(t.categoriaId) ?? {
      categoriaId: t.categoriaId,
      categoria: t.categoriaNome,
      perfil,
      gastoCentavos: 0,
      impostosCentavos: 0,
      impostosExatos: 0,
      carga: 0,
    };
    categoria.gastoCentavos += t.valorCentavos;
    categoria.impostosExatos += total;
    porCategoria.set(t.categoriaId, categoria);

    if (total > 0) lancamentos.push({ transacao: t, impostosCentavos: Math.round(total), origem });
  }

  const [ano, numeroMes] = mes.split('-').map(Number);
  const diasNoMes = new Date(ano, numeroMes, 0).getDate();
  const renda = receitas > 0 ? receitas : rendaPerfilCentavos && rendaPerfilCentavos > 0 ? rendaPerfilCentavos : null;
  const impostosCentavos = Math.round(impostos);
  const percentual = (parte: number, todo: number) => (todo > 0 ? umaCasa((parte / todo) * 100) : 0);

  const porEsfera = new Map<Esfera, number>();
  for (const t of TRIBUTOS) {
    const valor = porTributo.get(t.id);
    if (valor) porEsfera.set(t.esfera, (porEsfera.get(t.esfera) ?? 0) + valor);
  }

  return {
    mes,
    gastosCentavos: gastos,
    impostosCentavos,
    percentualDosGastos: gastos > 0 ? percentual(impostos, gastos) : null,
    rendaCentavos: renda,
    origemRenda: receitas > 0 ? 'receitas' : renda !== null ? 'perfil' : null,
    percentualDaRenda: renda !== null ? percentual(impostos, renda) : null,
    diasTrabalhados: renda !== null ? umaCasa((impostos / renda) * diasNoMes) : null,
    diasNoMes,
    porTributo: TRIBUTOS.filter((t) => (porTributo.get(t.id) ?? 0) > 0)
      .map((t) => {
        const valor = porTributo.get(t.id) ?? 0;
        return { tributo: t, centavos: Math.round(valor), percentual: percentual(valor, impostos) };
      })
      .sort((a, b) => b.centavos - a.centavos),
    porEsfera: [...porEsfera.entries()]
      .map(([esfera, valor]) => ({
        esfera,
        nome: NOME_ESFERA[esfera],
        centavos: Math.round(valor),
        percentual: percentual(valor, impostos),
      }))
      .sort((a, b) => b.centavos - a.centavos),
    porCategoria: [...porCategoria.values()]
      .map(({ impostosExatos, ...c }) => ({
        ...c,
        impostosCentavos: Math.round(impostosExatos),
        carga: percentual(impostosExatos, c.gastoCentavos),
      }))
      .sort((a, b) => b.impostosCentavos - a.impostosCentavos),
    maioresLancamentos: lancamentos
      .sort((a, b) => b.impostosCentavos - a.impostosCentavos)
      .slice(0, MAX_LANCAMENTOS),
    despesas,
    despesasComNota,
    impostosMesAnteriorCentavos: Math.round(impostosMesAnteriorCentavos),
    variacao: variacaoPercentual(impostosCentavos, Math.round(impostosMesAnteriorCentavos)),
    acumuladoAnoCentavos: Math.round(acumuladoAnoCentavos),
  };
}

export function obterImpostometro(mes: string): Impostometro {
  const perfis = mapaDePerfis();
  let acumuladoAno = 0;
  for (let m = mes; m.slice(0, 4) === mes.slice(0, 4); m = somarMeses(m, -1)) {
    acumuladoAno += totalDoMes(m, perfis);
  }

  return calcularImpostometro({
    mes,
    transacoes: listarTransacoes({ mes }),
    perfis,
    rendaPerfilCentavos: obterPerfil()?.rendaMensalCentavos ?? null,
    impostosMesAnteriorCentavos: totalDoMes(somarMeses(mes, -1), perfis),
    acumuladoAnoCentavos: acumuladoAno,
  });
}
