/**
 * Simulador da reforma tributária: quanto as compras de um mês pagariam de imposto na regra nova.
 *
 * Para cada despesa (ou item da nota): tira os tributos sobre consumo de hoje para achar o preço
 * "sem imposto", aplica o IBS + CBS da regra nova (com as reduções) e soma o Imposto Seletivo e os
 * tributos embutidos. Supõe que as empresas repassem a mudança inteira para o preço.
 */

import { perfilDoProduto, perfilTributario, type PerfilCarga, type PerfilTributarioId } from '@/data/carga-tributaria';
import { ALIQUOTA_REFERENCIA, REGRA_POR_PERFIL, REGRA_POR_PRODUTO, type RegraReforma } from '@/data/reforma-tributaria';
import { listarCategorias } from '@/repositories/categorias-repository';
import { listarItensDoMes } from '@/repositories/notas-repository';
import { listarTransacoes } from '@/repositories/transacoes-repository';
import { perfilTributarioDaCategoria } from '@/services/categorias-service';
import { carregarClassificacoes } from '@/services/classificacao-service';
import type { ItemParaEstimar } from '@/services/impostometro-service';
import type { Transacao } from '@/types/financas';

export type SimulacaoReforma = {
  mes: string;
  gastosCentavos: number;
  hojeCentavos: number;
  reformaCentavos: number;
  /** reforma − hoje (negativo = paga menos) */
  diferencaCentavos: number;
  porGrupo: { nome: string; gastoCentavos: number; hojeCentavos: number; reformaCentavos: number }[];
};

/** Hoje e na reforma, para um valor pago de um tipo de consumo (centavos com casas decimais). */
export function simularValor(valorCentavos: number, perfil: PerfilCarga, regra: RegraReforma) {
  const a = perfil.aliquotas;
  const embutidos = (valorCentavos * (a.embutidos ?? 0)) / 100;
  const consumoHoje = (valorCentavos * ((a.icms ?? 0) + (a.pisCofins ?? 0) + (a.ipi ?? 0) + (a.iss ?? 0) + (a.iof ?? 0))) / 100;
  const hoje = embutidos + consumoHoje;
  if (regra === 'atual') return { hoje, reforma: hoje };
  const semImposto = valorCentavos - consumoHoje;
  const ibsCbs = (semImposto * ALIQUOTA_REFERENCIA * regra.fator) / 100;
  const seletivo = regra.seletivo ? (valorCentavos * (a.ipi ?? 0)) / 100 : 0;
  return { hoje, reforma: embutidos + ibsCbs + seletivo };
}

export function calcularSimulacao(
  mes: string,
  despesas: Transacao[],
  perfilDaCategoria: Map<number, PerfilTributarioId>,
  itens: Map<number, ItemParaEstimar[]>,
): SimulacaoReforma {
  const grupos = new Map<string, { nome: string; gastoCentavos: number; hojeCentavos: number; reformaCentavos: number }>();
  const somar = (nome: string, gasto: number, r: { hoje: number; reforma: number }) => {
    const g = grupos.get(nome) ?? { nome, gastoCentavos: 0, hojeCentavos: 0, reformaCentavos: 0 };
    g.gastoCentavos += gasto;
    g.hojeCentavos += r.hoje;
    g.reformaCentavos += r.reforma;
    grupos.set(nome, g);
  };

  let gastos = 0;
  for (const t of despesas) {
    gastos += t.valorCentavos;
    const perfilId = perfilDaCategoria.get(t.categoriaId) ?? 'geral';
    const perfil = perfilTributario(perfilId);
    const daNota = itens.get(t.id) ?? [];
    const soma = daNota.reduce((s, i) => s + i.valorTotalCentavos, 0);
    if (soma > 0) {
      // Item a item; descontos da nota ajustados na mesma proporção.
      const escala = t.valorCentavos / soma;
      for (const item of daNota) {
        const produto = perfilDoProduto(item.descricao);
        const valor = item.valorTotalCentavos * escala;
        somar(
          produto ? produto.nome : t.categoriaNome,
          valor,
          simularValor(valor, produto ?? perfil, produto ? REGRA_POR_PRODUTO[produto.id] : REGRA_POR_PERFIL[perfilId]),
        );
      }
    } else {
      somar(t.categoriaNome, t.valorCentavos, simularValor(t.valorCentavos, perfil, REGRA_POR_PERFIL[perfilId]));
    }
  }

  const porGrupo = [...grupos.values()]
    .map((g) => ({
      nome: g.nome,
      gastoCentavos: Math.round(g.gastoCentavos),
      hojeCentavos: Math.round(g.hojeCentavos),
      reformaCentavos: Math.round(g.reformaCentavos),
    }))
    .sort((a, b) => Math.abs(b.reformaCentavos - b.hojeCentavos) - Math.abs(a.reformaCentavos - a.hojeCentavos));
  const hoje = porGrupo.reduce((s, g) => s + g.hojeCentavos, 0);
  const reforma = porGrupo.reduce((s, g) => s + g.reformaCentavos, 0);
  return { mes, gastosCentavos: gastos, hojeCentavos: hoje, reformaCentavos: reforma, diferencaCentavos: reforma - hoje, porGrupo };
}

export function obterSimulacaoReforma(mes: string): SimulacaoReforma {
  carregarClassificacoes();
  const perfis = new Map(listarCategorias('despesa').map((c) => [c.id, perfilTributarioDaCategoria(c)]));
  return calcularSimulacao(mes, listarTransacoes({ mes, tipo: 'despesa' }), perfis, listarItensDoMes(mes));
}
