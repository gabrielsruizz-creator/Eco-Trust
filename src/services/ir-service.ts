/**
 * Despesas dedutíveis na declaração do Imposto de Renda (modelo completo): saúde sem limite e
 * educação com limite por pessoa. O app sugere o que entra (remédio de farmácia e curso livre não
 * entram) e o usuário pode marcar ou desmarcar cada despesa.
 */

import {
  aliquotaMarginalIR,
  calcularINSS,
  DEDUCAO_DEPENDENTE_ANUAL,
  LIMITE_EDUCACAO_POR_PESSOA,
  LIMITE_SIMPLIFICADO,
  PERCENTUAL_SIMPLIFICADO,
} from '@/data/tributos-renda';
import { listarCategorias } from '@/repositories/categorias-repository';
import { definirDedutivelIr, listarTransacoesEntre } from '@/repositories/transacoes-repository';
import { perfilTributarioDaCategoria } from '@/services/categorias-service';
import { obterImpostosFixos } from '@/services/impostos-renda-service';
import type { ImpostosFixos, Transacao } from '@/types/financas';
import { normalizar } from '@/utils/visual';

export type TipoDeducao = 'saude' | 'educacao';

export type DespesaDedutivel = {
  transacao: Transacao;
  tipo: TipoDeducao;
  dedutivel: boolean;
  /** true = o usuário marcou; false = palpite do app */
  escolhaDoUsuario: boolean;
};

export type DeducoesIR = {
  ano: number;
  despesas: DespesaDedutivel[];
  saudeCentavos: number;
  /** Educação já limitada a R$ 3.561,50 por pessoa */
  educacaoCentavos: number;
  educacaoInformadaCentavos: number;
  limiteEducacaoCentavos: number;
  pessoas: number;
  /** Comparação com o desconto simplificado (só com salário bruto informado) */
  comparacao: {
    rendaAnualCentavos: number;
    /** Saúde + educação + INSS + dependentes */
    completaCentavos: number;
    simplificadoCentavos: number;
    melhor: 'completa' | 'simplificada';
    /** Imposto a menos, aproximado, escolhendo o melhor modelo em vez do outro */
    economiaCentavos: number;
    aliquotaMarginal: number;
  } | null;
};

/** Saúde que não entra: farmácia, remédio, academia, óculos comprados em ótica... */
const NAO_DEDUTIVEL_SAUDE = /farmacia|drogaria|droga\b|remedio|medicamento|vitamina|suplemento|academia|otica|oculos|lente/;
/** Educação que não entra: cursos livres, idiomas, material, transporte escolar... */
const NAO_DEDUTIVEL_EDUCACAO = /curso livre|idioma|ingles|espanhol|musica|natacao|esporte|material|apostila|livro|uniforme|transporte|van\b|reforco|cursinho|pre.?vestibular/;

/** Palpite do app: saúde e educação entram, menos os casos que a Receita não aceita. */
export function palpiteDedutivel(tipo: TipoDeducao, descricao: string) {
  const d = normalizar(descricao);
  return !(tipo === 'saude' ? NAO_DEDUTIVEL_SAUDE : NAO_DEDUTIVEL_EDUCACAO).test(d);
}

export function calcularDeducoes(
  ano: number,
  despesas: DespesaDedutivel[],
  fixos: ImpostosFixos | null,
): DeducoesIR {
  const marcadas = despesas.filter((d) => d.dedutivel);
  const saude = marcadas.filter((d) => d.tipo === 'saude').reduce((s, d) => s + d.transacao.valorCentavos, 0);
  const educacaoInformada = marcadas
    .filter((d) => d.tipo === 'educacao')
    .reduce((s, d) => s + d.transacao.valorCentavos, 0);
  const pessoas = 1 + (fixos?.dependentes ?? 0);
  const limiteEducacao = LIMITE_EDUCACAO_POR_PESSOA * pessoas;
  const educacao = Math.min(educacaoInformada, limiteEducacao);

  let comparacao: DeducoesIR['comparacao'] = null;
  const bruto = fixos?.salarioBrutoCentavos ?? 0;
  if (bruto > 0) {
    const inss = calcularINSS(bruto);
    const rendaAnual = bruto * 12;
    const completa = saude + educacao + inss * 12 + (fixos?.dependentes ?? 0) * DEDUCAO_DEPENDENTE_ANUAL;
    const simplificado = Math.min(Math.round((rendaAnual * PERCENTUAL_SIMPLIFICADO) / 100), LIMITE_SIMPLIFICADO);
    const aliquota = aliquotaMarginalIR(bruto, inss, fixos?.dependentes ?? 0);
    comparacao = {
      rendaAnualCentavos: rendaAnual,
      completaCentavos: completa,
      simplificadoCentavos: simplificado,
      melhor: completa > simplificado ? 'completa' : 'simplificada',
      economiaCentavos: Math.round((Math.abs(completa - simplificado) * aliquota) / 100),
      aliquotaMarginal: aliquota,
    };
  }

  return {
    ano,
    despesas,
    saudeCentavos: saude,
    educacaoCentavos: educacao,
    educacaoInformadaCentavos: educacaoInformada,
    limiteEducacaoCentavos: limiteEducacao,
    pessoas,
    comparacao,
  };
}

/** Despesas de saúde e educação do ano, com o que entra ou não na declaração. */
export function obterDeducoesIR(ano: number): DeducoesIR {
  const tipoDaCategoria = new Map<number, TipoDeducao>();
  for (const c of listarCategorias('despesa')) {
    const perfil = perfilTributarioDaCategoria(c);
    if (perfil === 'saude' || perfil === 'educacao') tipoDaCategoria.set(c.id, perfil);
  }
  const despesas: DespesaDedutivel[] = [];
  for (const t of listarTransacoesEntre(`${ano}-01-01`, `${ano}-12-31`, 'despesa')) {
    const tipo = tipoDaCategoria.get(t.categoriaId);
    if (!tipo) continue;
    const escolha = t.dedutivelIr ?? null;
    despesas.push({
      transacao: t,
      tipo,
      dedutivel: escolha ?? palpiteDedutivel(tipo, `${t.descricao} ${t.categoriaNome}`),
      escolhaDoUsuario: escolha !== null,
    });
  }
  return calcularDeducoes(ano, despesas, obterImpostosFixos());
}

export function marcarDedutivel(id: number, dedutivel: boolean) {
  definirDedutivelIr(id, dedutivel);
}
