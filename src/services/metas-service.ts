/**
 * Metas financeiras: progresso, quanto guardar por mês até o prazo e previsão pelo ritmo atual.
 * `calcularProgresso` é puro; as demais funções usam o banco.
 */

import {
  atualizarMeta,
  buscarMeta,
  criarMeta,
  criarMovimento,
  listarMetas,
  listarMovimentos,
  removerMeta,
} from '@/repositories/metas-repository';
import { obterPerfilFinanceiro } from '@/repositories/perfil-financeiro-repository';
import { ErroValidacao } from '@/services/erros';
import type { Meta, MovimentoMeta, ProgressoMeta } from '@/types/financas';
import { dataValida, diasEntre, formatarData, hoje, nomeDoMes, paraDataLocal } from '@/utils/datas';
import { formatarCentavos } from '@/utils/moeda';

const MAX_NOME = 40;
const MAX_VALOR_CENTAVOS = 10_000_000_000;
const DIAS_POR_MES = 30.4375;
/** O ritmo considera no máximo os últimos 3 meses */
const MESES_RITMO = 3;

export function calcularProgresso(meta: Meta, movimentos: MovimentoMeta[], dataHoje: string): ProgressoMeta {
  const falta = Math.max(0, meta.objetivoCentavos - meta.atualCentavos);
  const concluida = meta.atualCentavos >= meta.objetivoCentavos;

  let mesesAtePrazo: number | null = null;
  const prazoVencido = meta.prazo !== null && meta.prazo < dataHoje;
  if (meta.prazo !== null && !prazoVencido) {
    mesesAtePrazo = Math.max(1, Math.ceil(diasEntre(dataHoje, meta.prazo) / DIAS_POR_MES));
  }

  // Ritmo: quanto entrou (guardado − retirado, sem o valor inicial) nos últimos meses, por mês.
  const diasDeVida = Math.max(0, diasEntre(paraDataLocal(new Date(meta.criadoEm)), dataHoje));
  const janelaMeses = Math.min(MESES_RITMO, Math.max(1, Math.ceil(diasDeVida / DIAS_POR_MES)));
  const [ano, mes, dia] = dataHoje.split('-').map(Number);
  const inicioJanela = paraDataLocal(new Date(ano, mes - 1, dia - Math.round(janelaMeses * DIAS_POR_MES)));
  const liquidoJanela = movimentos
    .filter((m) => m.tipo !== 'inicial' && m.data > inicioJanela)
    .reduce((s, m) => s + (m.tipo === 'retirada' ? -m.valorCentavos : m.valorCentavos), 0);
  const ritmo = liquidoJanela > 0 ? Math.floor(liquidoJanela / janelaMeses) : null;

  return {
    ...meta,
    percentual: Math.min(100, (meta.atualCentavos / meta.objetivoCentavos) * 100),
    faltaCentavos: falta,
    concluida,
    mesesAtePrazo,
    prazoVencido,
    porMesNecessarioCentavos: !concluida && mesesAtePrazo !== null ? Math.ceil(falta / mesesAtePrazo) : null,
    ritmoMensalCentavos: ritmo,
    previsaoMeses: !concluida && ritmo ? Math.ceil(falta / ritmo) : null,
  };
}

function meses(n: number) {
  return `${n} ${n === 1 ? 'mês' : 'meses'}`;
}

/** Frase de previsão pelo ritmo atual (a mesma usada pela futura EcoTrust IA), ou null. */
export function textoRitmo(meta: ProgressoMeta): string | null {
  if (meta.previsaoMeses === null) return null;
  return `Se continuar nesse ritmo, sua meta será alcançada em aproximadamente ${meses(meta.previsaoMeses)}.`;
}

/** Resumo de uma linha do que a pessoa precisa saber sobre a meta. */
export function descreverMeta(meta: ProgressoMeta): string {
  if (meta.concluida) return 'Meta alcançada! Parabéns.';
  const falta = formatarCentavos(meta.faltaCentavos);
  if (meta.prazoVencido && meta.prazo) return `O prazo era ${formatarData(meta.prazo)}. Faltam ${falta}.`;
  if (meta.porMesNecessarioCentavos !== null && meta.prazo) {
    return `Guarde ${formatarCentavos(meta.porMesNecessarioCentavos)} por mês até ${nomeDoMes(meta.prazo.slice(0, 7))} para chegar lá.`;
  }
  return textoRitmo(meta) ?? `Faltam ${falta}.`;
}

/** Prévia no formulário: quanto guardar por mês para juntar o que falta até o prazo. */
export function estimarPorMes(objetivoCentavos: number, atualCentavos: number, prazo: string, dataHoje = hoje()) {
  if (prazo <= dataHoje) return null;
  const falta = Math.max(0, objetivoCentavos - atualCentavos);
  const mesesAtePrazo = Math.max(1, Math.ceil(diasEntre(dataHoje, prazo) / DIAS_POR_MES));
  return Math.ceil(falta / mesesAtePrazo);
}

export function obterMetas(): ProgressoMeta[] {
  const dataHoje = hoje();
  return listarMetas().map((m) => calcularProgresso(m, listarMovimentos(m.id), dataHoje));
}

export function obterMeta(id: number): { meta: ProgressoMeta; movimentos: MovimentoMeta[] } | null {
  const meta = buscarMeta(id);
  if (!meta) return null;
  const movimentos = listarMovimentos(id);
  return { meta: calcularProgresso(meta, movimentos, hoje()), movimentos };
}

export type DadosMeta = { nome: string; objetivoCentavos: number; prazo: string | null };

function validarValor(centavos: number, mensagem: string) {
  if (!Number.isInteger(centavos) || centavos <= 0) throw new ErroValidacao(mensagem);
  if (centavos > MAX_VALOR_CENTAVOS) {
    throw new ErroValidacao('Esse valor parece alto demais. Confira o número digitado.');
  }
}

function validarDados(dados: DadosMeta, prazoAnterior?: string | null): DadosMeta {
  const nome = dados.nome.trim().replace(/\s+/g, ' ');
  if (!nome) throw new ErroValidacao('Dê um nome para a meta.');
  if (nome.length > MAX_NOME) throw new ErroValidacao(`Use no máximo ${MAX_NOME} letras no nome.`);
  validarValor(dados.objetivoCentavos, 'Informe quanto você quer juntar.');
  if (dados.prazo !== null) {
    if (!dataValida(dados.prazo)) throw new ErroValidacao('Prazo inválido.');
    // Um prazo novo precisa ser no futuro; ao editar, manter o prazo antigo é permitido.
    if (dados.prazo !== prazoAnterior && dados.prazo <= hoje()) {
      throw new ErroValidacao('O prazo precisa ser uma data no futuro.');
    }
  }
  return { ...dados, nome };
}

export function adicionarMeta(dados: DadosMeta, valorInicialCentavos = 0): number {
  const validos = validarDados(dados);
  if (!Number.isInteger(valorInicialCentavos) || valorInicialCentavos < 0) {
    throw new ErroValidacao('Valor já guardado inválido.');
  }
  if (valorInicialCentavos > MAX_VALOR_CENTAVOS) {
    throw new ErroValidacao('Esse valor parece alto demais. Confira o número digitado.');
  }
  return criarMeta(validos, valorInicialCentavos, hoje());
}

export function editarMeta(id: number, dados: DadosMeta) {
  const atual = buscarMeta(id);
  if (!atual) throw new ErroValidacao('Esta meta não existe mais.');
  atualizarMeta(id, validarDados(dados, atual.prazo));
}

export function excluirMeta(id: number) {
  removerMeta(id);
}

export function guardarNaMeta(id: number, valorCentavos: number) {
  if (!buscarMeta(id)) throw new ErroValidacao('Esta meta não existe mais.');
  validarValor(valorCentavos, 'Informe um valor maior que zero.');
  criarMovimento(id, 'deposito', valorCentavos, hoje());
}

export function retirarDaMeta(id: number, valorCentavos: number) {
  const meta = buscarMeta(id);
  if (!meta) throw new ErroValidacao('Esta meta não existe mais.');
  validarValor(valorCentavos, 'Informe um valor maior que zero.');
  if (valorCentavos > meta.atualCentavos) {
    throw new ErroValidacao('Você não pode retirar mais do que já guardou nesta meta.');
  }
  criarMovimento(id, 'retirada', valorCentavos, hoje());
}

/** Modelos para criar uma meta com um toque. A reserva de emergência usa 6× as contas fixas do perfil. */
export function modelosDeMeta(): { nome: string; objetivoCentavos: number | null }[] {
  const fixas = obterPerfilFinanceiro()?.despesasFixasCentavos ?? 0;
  return [
    { nome: 'Reserva de emergência', objetivoCentavos: fixas > 0 ? fixas * 6 : null },
    { nome: 'Viagem', objetivoCentavos: null },
    { nome: 'Comprar um carro', objetivoCentavos: null },
    { nome: 'Guardar R$ 10.000', objetivoCentavos: 1_000_000 },
  ];
}
