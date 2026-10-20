/**
 * Impostômetro pessoal: quanto do dinheiro gasto no mês foi para o governo em impostos sobre consumo.
 *
 * Cada despesa usa, nesta ordem:
 * 1. o valor dos tributos da nota fiscal, quando informado;
 * 2. uma estimativa produto a produto, quando a despesa veio de uma nota com a lista de itens
 *    (cerveja e refrigerante pagam bem mais imposto que arroz e feijão);
 * 3. uma estimativa pelo tipo de consumo da categoria.
 * As tabelas ficam em `carga-tributaria`. Os cálculos são feitos em centavos "quebrados" e
 * arredondados só no fim, para os totais não acumularem erro de arredondamento.
 */

import {
  cargaTotal,
  escolhaDoUsuario,
  NOME_ESFERA,
  perfilDoProduto,
  perfilTributario,
  TRIBUTOS,
  type Esfera,
  type PerfilCarga,
  type PerfilTributario,
  type TipoProdutoId,
  type Tributo,
  type TributoId,
} from '@/data/carga-tributaria';
import { buscarCategoria, listarCategorias } from '@/repositories/categorias-repository';
import { buscarNotaDaTransacao, listarItensDoMes } from '@/repositories/notas-repository';
import { listarTransacoes } from '@/repositories/transacoes-repository';
import { perfilTributarioDaCategoria } from '@/services/categorias-service';
import { carregarClassificacoes } from '@/services/classificacao-service';
import {
  calcularImpostosFixosDoMes,
  obterImpostosFixos,
  type ImpostosFixosMes,
} from '@/services/impostos-renda-service';
import { obterPerfil } from '@/services/perfil-financeiro-service';
import type { ResumoImpostosInsight } from '@/services/insights-service';
import type { ItemNota, Transacao } from '@/types/financas';
import { mesAtual, paraDataLocal, somarMeses } from '@/utils/datas';
import { variacaoPercentual } from '@/utils/percentual';

/** nota = tributos informados na nota; itens = estimado produto a produto; estimado = pela categoria */
export type OrigemImposto = 'nota' | 'itens' | 'estimado';

export type ItemParaEstimar = Pick<ItemNota, 'descricao' | 'valorTotalCentavos'>;
type ItensPorLancamento = Map<number, ItemParaEstimar[]>;

/** Imposto estimado de um item da nota. */
export type ImpostoDoItem = {
  centavos: number;
  /** % do preço do item */
  carga: number;
  /** Tipo de produto reconhecido pelo nome (null = usou o da categoria) */
  tipo: string | null;
  tipoId: TipoProdutoId | null;
  /** O tipo veio de uma escolha do usuário (e não do palpite pelo nome) */
  escolhaDoUsuario: boolean;
};

export type ImpostosDoLancamento = {
  totalCentavos: number;
  /** Quanto do valor pago foi imposto, em % */
  percentual: number;
  origem: OrigemImposto;
  perfil: PerfilTributario;
  porTributo: { tributo: Tributo; centavos: number }[];
  /** Veio de uma nota fiscal que não informou os tributos (ou informou R$ 0,00) */
  notaSemTributos: boolean;
  /** Estimativa de cada item da nota, na ordem da nota (só quando origem = 'itens') */
  porItem: ImpostoDoItem[] | null;
};

export type Impostometro = {
  mes: string;
  gastosCentavos: number;
  /** Impostos sobre consumo, embutidos nas despesas */
  impostosCentavos: number;
  /** Impostos da renda e do patrimônio (INSS, IR, IPVA, IPTU...). null se não configurados */
  fixos: ImpostosFixosMes | null;
  /** Consumo + renda + patrimônio */
  cargaTotalCentavos: number;
  /** Quanto dos gastos foi imposto, em %. null sem gastos */
  percentualDosGastos: number | null;
  /**
   * Renda antes dos descontos: receitas do mês (ou, sem elas, a renda do perfil) mais o INSS e o IR
   * descontados no holerite.
   */
  rendaCentavos: number | null;
  origemRenda: 'receitas' | 'perfil' | null;
  /** Carga total sobre a renda, em % */
  percentualDaRenda: number | null;
  /** Dias do mês trabalhados só para pagar a carga total. null sem renda */
  diasTrabalhados: number | null;
  diasNoMes: number;
  porTributo: { tributo: Tributo; centavos: number; percentual: number }[];
  /** Consumo + renda + patrimônio, por quem recebe */
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
  /** Despesas estimadas produto a produto (nota sem tributos, mas com a lista de itens) */
  despesasPorItens: number;
  impostosMesAnteriorCentavos: number;
  /** Variação da carga total contra o mês anterior, em % (null se o anterior foi zero) */
  variacao: number | null;
  /** De janeiro até este mês */
  acumuladoAnoCentavos: number;
  /** Dia da Liberdade de Impostos com a carga e a renda do ano até este mês. null sem renda */
  liberdade: { percentual: number; dias: number; data: string } | null;
};

const MAX_LANCAMENTOS = 5;

function umaCasa(n: number) {
  return Math.round(n * 10) / 10;
}

/** Perfil de cada item: o do produto, se reconhecido pelo nome; senão o da categoria da despesa. */
function perfilDoItem(item: ItemParaEstimar, perfilCategoria: PerfilTributario): PerfilCarga {
  return perfilDoProduto(item.descricao) ?? perfilCategoria;
}

/** Soma `valor × alíquota` de um perfil nas partes de cada tributo; devolve o total somado. */
function somarPartes(partes: Map<TributoId, number>, valorCentavos: number, perfil: PerfilCarga) {
  let total = 0;
  for (const t of TRIBUTOS) {
    const parte = (valorCentavos * (perfil.aliquotas[t.id] ?? 0)) / 100;
    if (parte > 0) partes.set(t.id, (partes.get(t.id) ?? 0) + parte);
    total += parte;
  }
  return total;
}

/** Divide o imposto de uma despesa entre os tributos (centavos com casas decimais). */
function dividirImposto(
  valorCentavos: number,
  perfil: PerfilTributario,
  tributosInformados: number | null,
  itens: ItemParaEstimar[] = [],
): { origem: OrigemImposto; total: number; partes: Map<TributoId, number> } {
  const partes = new Map<TributoId, number>();
  // R$ 0,00 de tributos numa compra não é real (a loja deixou de informar): estima como se não tivesse.
  const tributosNota = tributosInformados !== null && tributosInformados > 0 ? tributosInformados : null;
  const somaItens = itens.reduce((s, i) => s + i.valorTotalCentavos, 0);

  if (tributosNota === null && somaItens > 0) {
    // Produto a produto. Se a nota teve desconto (ou o valor foi editado), ajusta na mesma proporção.
    let total = 0;
    for (const item of itens) total += somarPartes(partes, item.valorTotalCentavos, perfilDoItem(item, perfil));
    const escala = valorCentavos / somaItens;
    partes.forEach((valor, id) => partes.set(id, valor * escala));
    return { origem: 'itens', total: total * escala, partes };
  }

  if (tributosNota === null) {
    return { origem: 'estimado', total: somarPartes(partes, valorCentavos, perfil), partes };
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

/** Imposto estimado de cada item (na ordem da nota), já ajustado a descontos da compra. */
export function estimarItens(
  itens: ItemParaEstimar[],
  perfilCategoria: PerfilTributario,
  valorPagoCentavos: number,
): ImpostoDoItem[] {
  const soma = itens.reduce((s, i) => s + i.valorTotalCentavos, 0);
  const escala = soma > 0 ? valorPagoCentavos / soma : 1;
  return itens.map((item) => {
    const produto = perfilDoProduto(item.descricao);
    const carga = cargaTotal(produto ?? perfilCategoria);
    return {
      centavos: Math.round(((item.valorTotalCentavos * carga) / 100) * escala),
      carga,
      tipo: produto?.nome ?? null,
      tipoId: produto?.id ?? null,
      escolhaDoUsuario: escolhaDoUsuario(item.descricao) !== null,
    };
  });
}

/** Estimativa de uma compra que ainda não foi salva (para a dica do formulário). */
export function estimarCompra(valorCentavos: number, perfil: PerfilTributario, itens: ItemParaEstimar[] = []) {
  carregarClassificacoes();
  const { origem, total } = dividirImposto(valorCentavos, perfil, null, itens);
  return { origem, totalCentavos: Math.round(total), percentual: umaCasa((total / valorCentavos) * 100) };
}

/** Impostos de uma despesa (null para receitas). */
export function obterImpostosDoLancamento(transacao: Transacao | null): ImpostosDoLancamento | null {
  carregarClassificacoes();
  if (!transacao || transacao.tipo !== 'despesa') return null;
  const categoria = buscarCategoria(transacao.categoriaId);
  const perfil = perfilTributario(
    perfilTributarioDaCategoria(categoria ?? { nome: transacao.categoriaNome, perfilTributario: null }),
  );
  const itens = transacao.chaveNota ? (buscarNotaDaTransacao(transacao.id)?.itens ?? []) : [];
  const { origem, total, partes } = dividirImposto(
    transacao.valorCentavos,
    perfil,
    transacao.tributosCentavos,
    itens,
  );
  return {
    totalCentavos: Math.round(total),
    percentual: umaCasa((total / transacao.valorCentavos) * 100),
    origem,
    perfil,
    porTributo: TRIBUTOS.filter((t) => partes.has(t.id)).map((t) => ({
      tributo: t,
      centavos: Math.round(partes.get(t.id) ?? 0),
    })),
    notaSemTributos: transacao.chaveNota !== null && !transacao.tributosCentavos,
    porItem: origem === 'itens' ? estimarItens(itens, perfil, transacao.valorCentavos) : null,
  };
}

function mapaDePerfis() {
  return new Map(
    listarCategorias('despesa').map((c) => [c.id, perfilTributario(perfilTributarioDaCategoria(c))]),
  );
}

/**
 * Impostos da renda e do patrimônio só contam nos meses em que o usuário usou o app
 * (algum lançamento) e no mês atual: assim o acumulado do ano não inventa meses.
 */
function fixosDoMes(mes: string, transacoes: Transacao[], fixos: ImpostosFixosMes | null) {
  if (!fixos || mes > mesAtual()) return null;
  return transacoes.length > 0 || mes === mesAtual() ? fixos : null;
}

/**
 * Renda antes dos descontos: receitas do mês (ou, sem elas, a renda do perfil) mais o INSS e o IR
 * descontados no holerite, que não aparecem nas receitas.
 */
function rendaBrutaDoMes(receitas: number, rendaPerfil: number | null, fixos: ImpostosFixosMes | null) {
  const base = receitas > 0 ? receitas : rendaPerfil && rendaPerfil > 0 ? rendaPerfil : null;
  return base !== null && fixos?.descontadosNaFonte ? base + fixos.inssCentavos + fixos.irCentavos : base;
}

/** Carga total e renda de um mês (para comparações e para o ano). Meses sem uso do app não contam. */
function totalDoMes(
  mes: string,
  perfis: Map<number, PerfilTributario>,
  fixos: ImpostosFixosMes | null,
  rendaPerfil: number | null,
) {
  const transacoes = listarTransacoes({ mes });
  const itens = listarItensDoMes(mes);
  const fixosMes = fixosDoMes(mes, transacoes, fixos);
  let carga = fixosMes?.totalCentavos ?? 0;
  let receitas = 0;
  for (const t of transacoes) {
    if (t.tipo === 'receita') {
      receitas += t.valorCentavos;
      continue;
    }
    const perfil = perfis.get(t.categoriaId) ?? perfilTributario('geral');
    carga += dividirImposto(t.valorCentavos, perfil, t.tributosCentavos, itens.get(t.id)).total;
  }
  const ativo = transacoes.length > 0 || mes === mesAtual();
  return { carga, renda: ativo ? (rendaBrutaDoMes(receitas, rendaPerfil, fixosMes) ?? 0) : 0 };
}

/** "Dia da Liberdade de Impostos": até que dia do ano a renda foi só para pagar impostos. */
export function calcularDiaDaLiberdade(ano: number, cargaAno: number, rendaAno: number) {
  if (rendaAno <= 0 || cargaAno <= 0) return null;
  const diasNoAno = new Date(ano, 1, 29).getMonth() === 1 ? 366 : 365;
  const percentual = Math.min(1, cargaAno / rendaAno);
  const dias = Math.round(percentual * diasNoAno);
  return { percentual: umaCasa(percentual * 100), dias, data: paraDataLocal(new Date(ano, 0, 1 + dias)) };
}

/** Cálculo puro do impostômetro de um mês, a partir das transações dele. */
export function calcularImpostometro({
  mes,
  transacoes,
  perfis,
  rendaPerfilCentavos,
  fixos = null,
  itens = new Map(),
  impostosMesAnteriorCentavos,
  acumuladoAnoCentavos,
  rendaAnoCentavos = 0,
}: {
  mes: string;
  transacoes: Transacao[];
  perfis: Map<number, PerfilTributario>;
  rendaPerfilCentavos: number | null;
  /** Impostos da renda e do patrimônio que valem para este mês */
  fixos?: ImpostosFixosMes | null;
  /** Itens das notas fiscais, por lançamento */
  itens?: ItensPorLancamento;
  impostosMesAnteriorCentavos: number;
  acumuladoAnoCentavos: number;
  /** Renda bruta de janeiro até este mês */
  rendaAnoCentavos?: number;
}): Impostometro {
  let gastos = 0;
  let receitas = 0;
  let impostos = 0;
  let despesas = 0;
  let despesasComNota = 0;
  let despesasPorItens = 0;
  const porTributo = new Map<TributoId, number>();
  const porCategoria = new Map<number, Impostometro['porCategoria'][number] & { impostosExatos: number }>();
  const lancamentos: Impostometro['maioresLancamentos'] = [];

  for (const t of transacoes) {
    if (t.tipo === 'receita') {
      receitas += t.valorCentavos;
      continue;
    }
    const perfil = perfis.get(t.categoriaId) ?? perfilTributario('geral');
    const { origem, total, partes } = dividirImposto(t.valorCentavos, perfil, t.tributosCentavos, itens.get(t.id));

    gastos += t.valorCentavos;
    impostos += total;
    despesas++;
    if (origem === 'nota') despesasComNota++;
    if (origem === 'itens') despesasPorItens++;
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
  const renda = rendaBrutaDoMes(receitas, rendaPerfilCentavos, fixos);
  const impostosCentavos = Math.round(impostos);
  const carga = impostos + (fixos?.totalCentavos ?? 0);
  const percentual = (parte: number, todo: number) => (todo > 0 ? umaCasa((parte / todo) * 100) : 0);

  const porEsfera = new Map<Esfera, number>();
  const somarEsfera = (esfera: Esfera, valor: number) => {
    if (valor > 0) porEsfera.set(esfera, (porEsfera.get(esfera) ?? 0) + valor);
  };
  for (const t of TRIBUTOS) somarEsfera(t.esfera, porTributo.get(t.id) ?? 0);
  if (fixos) {
    somarEsfera('federal', fixos.inssCentavos + fixos.irCentavos + fixos.outrosCentavos);
    somarEsfera('estadual', fixos.ipvaCentavos);
    somarEsfera('municipal', fixos.iptuCentavos);
  }

  return {
    mes,
    gastosCentavos: gastos,
    impostosCentavos,
    fixos,
    cargaTotalCentavos: Math.round(carga),
    percentualDosGastos: gastos > 0 ? percentual(impostos, gastos) : null,
    rendaCentavos: renda,
    origemRenda: receitas > 0 ? 'receitas' : renda !== null ? 'perfil' : null,
    percentualDaRenda: renda !== null ? percentual(carga, renda) : null,
    diasTrabalhados: renda !== null ? umaCasa((carga / renda) * diasNoMes) : null,
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
        percentual: percentual(valor, carga),
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
    despesasPorItens,
    impostosMesAnteriorCentavos: Math.round(impostosMesAnteriorCentavos),
    variacao: variacaoPercentual(Math.round(carga), Math.round(impostosMesAnteriorCentavos)),
    acumuladoAnoCentavos: Math.round(acumuladoAnoCentavos),
    liberdade: calcularDiaDaLiberdade(ano, acumuladoAnoCentavos, rendaAnoCentavos),
  };
}

export function obterImpostometro(mes: string): Impostometro {
  carregarClassificacoes();
  const perfis = mapaDePerfis();
  const fixos = calcularImpostosFixosDoMes(obterImpostosFixos());
  const rendaPerfil = obterPerfil()?.rendaMensalCentavos ?? null;
  let acumuladoAno = 0;
  let rendaAno = 0;
  for (let m = mes; m.slice(0, 4) === mes.slice(0, 4); m = somarMeses(m, -1)) {
    const doMes = totalDoMes(m, perfis, fixos, rendaPerfil);
    acumuladoAno += doMes.carga;
    rendaAno += doMes.renda;
  }
  const transacoes = listarTransacoes({ mes });

  return calcularImpostometro({
    mes,
    transacoes,
    perfis,
    rendaPerfilCentavos: rendaPerfil,
    fixos: fixosDoMes(mes, transacoes, fixos),
    itens: listarItensDoMes(mes),
    impostosMesAnteriorCentavos: totalDoMes(somarMeses(mes, -1), perfis, fixos, rendaPerfil).carga,
    acumuladoAnoCentavos: acumuladoAno,
    rendaAnoCentavos: rendaAno,
  });
}

/** Impostos de cada despesa de um mês, pelo id do lançamento (para a lista de Transações). */
export function obterImpostosDosLancamentos(mes: string): Map<number, { centavos: number; origem: OrigemImposto }> {
  carregarClassificacoes();
  const perfis = mapaDePerfis();
  const itens = listarItensDoMes(mes);
  const resultado = new Map<number, { centavos: number; origem: OrigemImposto }>();
  for (const t of listarTransacoes({ mes, tipo: 'despesa' })) {
    const { total, origem } = dividirImposto(
      t.valorCentavos,
      perfis.get(t.categoriaId) ?? perfilTributario('geral'),
      t.tributosCentavos,
      itens.get(t.id),
    );
    resultado.set(t.id, { centavos: Math.round(total), origem });
  }
  return resultado;
}

/** Resumo leve para os insights do Início (sem comparar meses). */
export function obterResumoImpostos(mes: string): ResumoImpostosInsight | null {
  carregarClassificacoes();
  const imp = calcularImpostometro({
    mes,
    transacoes: listarTransacoes({ mes, tipo: 'despesa' }),
    perfis: mapaDePerfis(),
    itens: listarItensDoMes(mes),
    rendaPerfilCentavos: null,
    impostosMesAnteriorCentavos: 0,
    acumuladoAnoCentavos: 0,
  });
  if (imp.percentualDosGastos === null) return null;
  const maior = imp.porCategoria[0];
  return {
    impostosCentavos: imp.impostosCentavos,
    percentualDosGastos: imp.percentualDosGastos,
    maiorCategoria: maior && maior.impostosCentavos > 0 ? { nome: maior.categoria, impostosCentavos: maior.impostosCentavos } : null,
  };
}
