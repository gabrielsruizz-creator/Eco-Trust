/**
 * Perfil financeiro do onboarding: opções, validação e cálculos simples usados nas telas.
 */

import {
  obterPerfilFinanceiro,
  salvarPerfilFinanceiro,
} from '@/repositories/perfil-financeiro-repository';
import { ErroValidacao } from '@/services/erros';
import type { FonteRenda, ObjetivoFinanceiro, PerfilFinanceiro } from '@/types/financas';

const MAX_NOME = 40;
const MAX_VALOR_CENTAVOS = 10_000_000_000;

export const FONTES_RENDA: { valor: FonteRenda; rotulo: string }[] = [
  { valor: 'clt', rotulo: 'Salário (carteira assinada)' },
  { valor: 'autonomo', rotulo: 'Autônomo ou freelancer' },
  { valor: 'empresario', rotulo: 'Empresário' },
  { valor: 'aposentadoria', rotulo: 'Aposentadoria ou benefício' },
  { valor: 'estudante', rotulo: 'Bolsa ou mesada' },
  { valor: 'outra', rotulo: 'Outra' },
];

export const OBJETIVOS: { valor: ObjetivoFinanceiro; rotulo: string; descricao: string }[] = [
  { valor: 'controlar', rotulo: 'Controlar meus gastos', descricao: 'Entender para onde vai o dinheiro' },
  { valor: 'reserva', rotulo: 'Montar uma reserva', descricao: 'Ter dinheiro guardado para imprevistos' },
  { valor: 'dividas', rotulo: 'Sair das dívidas', descricao: 'Organizar e quitar o que devo' },
  { valor: 'conquista', rotulo: 'Realizar um sonho', descricao: 'Viagem, carro, casa, estudos...' },
  { valor: 'investir', rotulo: 'Começar a investir', descricao: 'Fazer o dinheiro render' },
];

export function rotuloFonteRenda(fonte: FonteRenda) {
  return FONTES_RENDA.find((f) => f.valor === fonte)?.rotulo ?? 'Outra';
}

export function rotuloObjetivo(objetivo: ObjetivoFinanceiro) {
  return OBJETIVOS.find((o) => o.valor === objetivo)?.rotulo ?? objetivo;
}

function validarValor(centavos: number, campo: string) {
  if (!Number.isInteger(centavos) || centavos < 0) {
    throw new ErroValidacao(`Informe um valor válido para ${campo}.`);
  }
  if (centavos > MAX_VALOR_CENTAVOS) {
    throw new ErroValidacao(`O valor de ${campo} parece alto demais. Confira o número digitado.`);
  }
}

export function validarPerfilFinanceiro(perfil: PerfilFinanceiro): PerfilFinanceiro {
  const nome = perfil.nome.trim().replace(/\s+/g, ' ');
  if (!nome) throw new ErroValidacao('Digite como podemos te chamar.');
  if (nome.length > MAX_NOME) throw new ErroValidacao(`Use no máximo ${MAX_NOME} letras no nome.`);
  validarValor(perfil.rendaMensalCentavos, 'renda mensal');
  validarValor(perfil.despesasFixasCentavos, 'despesas fixas');
  validarValor(perfil.metaEconomiaCentavos, 'meta de economia');
  if (!FONTES_RENDA.some((f) => f.valor === perfil.fonteRenda)) {
    throw new ErroValidacao('Escolha sua principal fonte de renda.');
  }
  if (!OBJETIVOS.some((o) => o.valor === perfil.objetivo)) {
    throw new ErroValidacao('Escolha seu objetivo financeiro.');
  }
  return { ...perfil, nome };
}

export function obterPerfil(): PerfilFinanceiro | null {
  return obterPerfilFinanceiro();
}

export function salvarPerfil(perfil: PerfilFinanceiro) {
  salvarPerfilFinanceiro(validarPerfilFinanceiro(perfil));
}

/** Quanto sobra da renda depois das despesas fixas (pode ser negativo). */
export function calcularSobraEstimada(rendaCentavos: number, despesasFixasCentavos: number) {
  return rendaCentavos - despesasFixasCentavos;
}

/**
 * Sugestões de meta mensal: 10% e 20% da renda, sem passar do que sobra,
 * arredondadas para dezenas de reais. Lista vazia se não sobra nada.
 */
export function sugerirMetasEconomia(rendaCentavos: number, despesasFixasCentavos: number) {
  const sobra = calcularSobraEstimada(rendaCentavos, despesasFixasCentavos);
  if (sobra <= 0) return [];
  const sugestoes = [0.1, 0.2].map((percentual) => {
    const valor = Math.min(rendaCentavos * percentual, sobra);
    return Math.max(1000, Math.floor(valor / 1000) * 1000);
  });
  return [...new Set(sugestoes)].filter((v) => v <= sobra);
}

export function saudacao(agora = new Date()) {
  const hora = agora.getHours();
  if (hora >= 5 && hora < 12) return 'Bom dia';
  if (hora >= 12 && hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] ?? '';
}
