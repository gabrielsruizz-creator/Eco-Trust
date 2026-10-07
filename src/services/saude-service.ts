/**
 * Saúde financeira EcoTrust (versão 1): nota de 0 a 100 somando 6 fatores.
 *
 * Metodologia (pontos máximos):
 * - Taxa de poupança ............ 25  (20% ou mais da renda = nota cheia; 0% ou menos = zero)
 * - Peso das despesas fixas ..... 20  (até 30% da renda = cheia; 60% ou mais = zero)
 * - Orçamento ................... 20  (proporção de limites respeitados; sem orçamento = 5)
 * - Metas ....................... 15  (10 por ter meta + até 5 pelo progresso da reserva de emergência)
 * - Gastos não essenciais ....... 10  (até 20% dos gastos = cheia; 40% ou mais = zero)
 * - Saldo acumulado ............. 10  (positivo = cheia)
 *
 * Entre os extremos, os pontos são proporcionais (linha reta). A nota é a soma, arredondada.
 * `calcularSaude` é puro (fácil de testar e evoluir); `obterSaude` busca os dados no banco.
 */

import { obterPerfilFinanceiro } from '@/repositories/perfil-financeiro-repository';
import { listarTransacoes, somarTotaisAte, somarTotaisGerais } from '@/repositories/transacoes-repository';
import { obterMetas } from '@/services/metas-service';
import { obterOrcamentos, type ResumoOrcamentos } from '@/services/orcamento-service';
import { obterResumoDoMes } from '@/services/resumo-service';
import type { PerfilFinanceiro, ProgressoMeta, ResumoMes } from '@/types/financas';
import { mesAtual, somarMeses } from '@/utils/datas';
import { formatarCentavos } from '@/utils/moeda';

/** Categorias consideradas "não essenciais" (onde normalmente dá para cortar). */
export const NAO_ESSENCIAIS = ['Lazer', 'Compras', 'Assinaturas', 'Viagens'];

export type SituacaoFator = 'bom' | 'atencao' | 'ruim';

export type FatorSaude = {
  id: 'poupanca' | 'fixas' | 'orcamento' | 'metas' | 'nao-essenciais' | 'saldo';
  nome: string;
  pontos: number;
  maximo: number;
  situacao: SituacaoFator;
  /** Frase curta, ex.: "Boa taxa de poupança (17%)" */
  resumo: string;
  /** Explicação e dica */
  detalhe: string;
};

export type FaixaSaude = 'atencao' | 'regular' | 'boa' | 'excelente';

export type SaudeFinanceira = {
  /** null quando ainda não há lançamentos suficientes */
  nota: number | null;
  faixa: FaixaSaude | null;
  rotuloFaixa: string;
  fatores: FatorSaude[];
};

export const ROTULO_FAIXA: Record<FaixaSaude, string> = {
  atencao: 'Precisa de atenção',
  regular: 'Regular',
  boa: 'Boa',
  excelente: 'Excelente',
};

export function faixaDaNota(nota: number): FaixaSaude {
  if (nota >= 80) return 'excelente';
  if (nota >= 60) return 'boa';
  if (nota >= 40) return 'regular';
  return 'atencao';
}

/** Pontos proporcionais: `valor` em `cheio` vale `maximo`, em `zero` vale 0 (funciona nos dois sentidos). */
function linear(valor: number, zero: number, cheio: number, maximo: number) {
  const fracao = (valor - zero) / (cheio - zero);
  return Math.max(0, Math.min(1, fracao)) * maximo;
}

function situacaoPorPontos(pontos: number, maximo: number): SituacaoFator {
  const fracao = pontos / maximo;
  return fracao >= 0.7 ? 'bom' : fracao >= 0.35 ? 'atencao' : 'ruim';
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export type EntradaSaude = {
  atual: ResumoMes;
  anterior: ResumoMes;
  perfil: PerfilFinanceiro | null;
  recorrentesCentavos: number;
  orcamentos: ResumoOrcamentos;
  metas: ProgressoMeta[];
  saldoAcumuladoCentavos: number;
  temLancamentos: boolean;
};

export function calcularSaude(e: EntradaSaude): SaudeFinanceira {
  if (!e.temLancamentos) {
    return {
      nota: null,
      faixa: null,
      rotuloFaixa: 'Sem dados ainda',
      fatores: [],
    };
  }

  const fatores: FatorSaude[] = [];

  // 1. Taxa de poupança: mês atual; se ainda não entrou receita, o mês anterior.
  const base = e.atual.receitasCentavos > 0 ? e.atual : e.anterior;
  if (base.receitasCentavos > 0) {
    const taxa = (base.receitasCentavos - base.despesasCentavos) / base.receitasCentavos;
    const pontos = linear(taxa, 0, 0.2, 25);
    fatores.push({
      id: 'poupanca',
      nome: 'Taxa de poupança',
      pontos,
      maximo: 25,
      situacao: taxa < 0 ? 'ruim' : situacaoPorPontos(pontos, 25),
      resumo: taxa < 0 ? 'Gastando mais do que ganha' : `${taxa >= 0.1 ? 'Boa taxa' : 'Taxa baixa'} de poupança (${pct(taxa)})`,
      detalhe:
        taxa >= 0.2
          ? 'Você guarda 20% ou mais do que ganha. Excelente!'
          : 'O ideal é guardar pelo menos 20% da renda. Cada ponto percentual a mais melhora sua nota.',
    });
  } else {
    fatores.push({
      id: 'poupanca',
      nome: 'Taxa de poupança',
      pontos: 0,
      maximo: 25,
      situacao: 'atencao',
      resumo: 'Sem receitas registradas',
      detalhe: 'Registre suas receitas do mês para o EcoTrust calcular quanto você está guardando.',
    });
  }

  // 2. Peso das despesas fixas na renda.
  const renda = Math.max(e.perfil?.rendaMensalCentavos ?? 0, e.atual.receitasCentavos);
  const fixas = e.recorrentesCentavos > 0 ? e.recorrentesCentavos : (e.perfil?.despesasFixasCentavos ?? 0);
  if (renda > 0) {
    const peso = fixas / renda;
    const pontos = linear(peso, 0.6, 0.3, 20);
    fatores.push({
      id: 'fixas',
      nome: 'Despesas fixas',
      pontos,
      maximo: 20,
      situacao: situacaoPorPontos(pontos, 20),
      resumo: peso <= 0.3 ? `Despesas fixas sob controle (${pct(peso)} da renda)` : `Despesas fixas altas (${pct(peso)} da renda)`,
      detalhe:
        'Contas fixas de até 30% da renda deixam espaço para imprevistos e para guardar dinheiro. Acima de 60%, o orçamento fica apertado.',
    });
  } else {
    fatores.push({
      id: 'fixas',
      nome: 'Despesas fixas',
      pontos: 0,
      maximo: 20,
      situacao: 'atencao',
      resumo: 'Renda não informada',
      detalhe: 'Informe sua renda no perfil financeiro para avaliar o peso das contas fixas.',
    });
  }

  // 3. Orçamento: proporção de limites respeitados (atenção conta meio ponto).
  const limites = [e.orcamentos.geral, ...e.orcamentos.categorias].filter((o) => o !== null);
  if (limites.length === 0) {
    fatores.push({
      id: 'orcamento',
      nome: 'Orçamento',
      pontos: 5,
      maximo: 20,
      situacao: 'atencao',
      resumo: 'Sem orçamento definido',
      detalhe: 'Definir limites de gastos ajuda a controlar o mês. Crie um em Planejar → Orçamento.',
    });
  } else {
    const ultrapassados = limites.filter((o) => o.situacao === 'ultrapassou').length;
    const emAtencao = limites.filter((o) => o.situacao === 'atencao').length;
    const respeitados = limites.length - ultrapassados - emAtencao * 0.5;
    const pontos = (respeitados / limites.length) * 20;
    fatores.push({
      id: 'orcamento',
      nome: 'Orçamento',
      pontos,
      maximo: 20,
      situacao: ultrapassados > 0 ? 'ruim' : emAtencao > 0 ? 'atencao' : 'bom',
      resumo:
        ultrapassados > 0
          ? `${ultrapassados} ${ultrapassados === 1 ? 'orçamento ultrapassado' : 'orçamentos ultrapassados'}`
          : emAtencao > 0
            ? 'Gastos perto do limite do orçamento'
            : 'Gastos dentro do orçamento',
      detalhe: 'Cada orçamento respeitado soma pontos. Os que estão acima de 80% contam pela metade.',
    });
  }

  // 4. Metas: ter uma meta ativa + progresso da reserva de emergência.
  const reserva = e.metas.find((m) => m.nome.toLocaleLowerCase('pt-BR').includes('reserva'));
  const pontosMetas = (e.metas.length > 0 ? 10 : 0) + (reserva ? (reserva.percentual / 100) * 5 : 0);
  fatores.push({
    id: 'metas',
    nome: 'Metas',
    pontos: pontosMetas,
    maximo: 15,
    situacao: situacaoPorPontos(pontosMetas, 15),
    resumo: e.metas.length > 0 ? 'Meta financeira ativa' : 'Nenhuma meta ativa',
    detalhe: reserva
      ? `Sua reserva de emergência está em ${Math.floor(reserva.percentual)}%. Completar a reserva vale mais pontos.`
      : 'Ter metas dá destino ao dinheiro. Uma reserva de emergência completa vale pontos extras.',
  });

  // 5. Gastos não essenciais (lazer, compras, assinaturas, viagens) sobre o total de gastos.
  if (e.atual.despesasCentavos > 0) {
    const naoEssenciais = e.atual.despesasPorCategoria.filter((c) => NAO_ESSENCIAIS.includes(c.categoria));
    const total = naoEssenciais.reduce((s, c) => s + c.totalCentavos, 0);
    const parte = total / e.atual.despesasCentavos;
    const pontos = linear(parte, 0.4, 0.2, 10);
    const maior = naoEssenciais[0];
    fatores.push({
      id: 'nao-essenciais',
      nome: 'Gastos não essenciais',
      pontos,
      maximo: 10,
      situacao: situacaoPorPontos(pontos, 10),
      resumo:
        parte <= 0.2
          ? 'Gastos não essenciais sob controle'
          : `Gastos elevados com ${(maior?.categoria ?? 'lazer').toLocaleLowerCase('pt-BR')}`,
      detalhe: `Lazer, compras, assinaturas e viagens são ${pct(parte)} dos seus gastos do mês${maior ? ` (o maior é ${maior.categoria}: ${formatarCentavos(maior.totalCentavos)})` : ''}. Até 20% é o ideal.`,
    });
  } else {
    fatores.push({
      id: 'nao-essenciais',
      nome: 'Gastos não essenciais',
      pontos: 10,
      maximo: 10,
      situacao: 'bom',
      resumo: 'Sem gastos não essenciais neste mês',
      detalhe: 'Nenhuma despesa registrada neste mês ainda.',
    });
  }

  // 6. Saldo acumulado (tudo que entrou menos tudo que saiu).
  const positivo = e.saldoAcumuladoCentavos > 0;
  fatores.push({
    id: 'saldo',
    nome: 'Saldo acumulado',
    pontos: positivo ? 10 : 0,
    maximo: 10,
    situacao: positivo ? 'bom' : 'ruim',
    resumo: positivo ? 'Saldo positivo' : 'Saldo negativo',
    detalhe: positivo
      ? `Seus lançamentos somam um saldo de ${formatarCentavos(e.saldoAcumuladoCentavos)}.`
      : `Seus lançamentos somam um saldo de ${formatarCentavos(e.saldoAcumuladoCentavos)}. Gastar mais do que entra gera dívidas.`,
  });

  const nota = Math.round(fatores.reduce((s, f) => s + f.pontos, 0));
  const faixa = faixaDaNota(nota);
  return { nota, faixa, rotuloFaixa: ROTULO_FAIXA[faixa], fatores };
}

export function obterSaude(): SaudeFinanceira {
  return obterSaudeDoMes(mesAtual());
}

/**
 * Saúde de um mês. Para meses passados é uma ESTIMATIVA: usa os lançamentos daquele mês e o saldo
 * acumulado até o fim dele, mas os orçamentos, metas e perfil atuais (não guardamos como eram antes).
 */
export function obterSaudeDoMes(mes: string): SaudeFinanceira {
  const atual = mes === mesAtual();
  const totais = atual ? somarTotaisGerais() : somarTotaisAte(`${mes}-31`);
  const resumo = obterResumoDoMes(mes);
  return calcularSaude({
    atual: resumo,
    anterior: obterResumoDoMes(somarMeses(mes, -1)),
    perfil: obterPerfilFinanceiro(),
    recorrentesCentavos: listarTransacoes({ mes, tipo: 'despesa' })
      .filter((t) => t.recorrente)
      .reduce((s, t) => s + t.valorCentavos, 0),
    orcamentos: obterOrcamentos(mes),
    metas: obterMetas().filter((m) => !m.concluida || m.nome.toLocaleLowerCase('pt-BR').includes('reserva')),
    saldoAcumuladoCentavos: totais.receitasCentavos - totais.despesasCentavos,
    temLancamentos: atual
      ? totais.receitasCentavos + totais.despesasCentavos > 0
      : resumo.receitasCentavos + resumo.despesasCentavos > 0,
  });
}

/** Pontos de cada fator, no formato guardado no histórico. */
export function pontosPorFator(saude: SaudeFinanceira): Record<string, number> {
  return Object.fromEntries(saude.fatores.map((f) => [f.id, Math.round(f.pontos * 10) / 10]));
}
