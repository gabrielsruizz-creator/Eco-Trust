/**
 * Questionário simplificado de perfil de investidor (inspirado no "suitability").
 * Cada resposta vale de 1 a 3 pontos; a soma define o perfil.
 */

import {
  obterPerfilInvestidor,
  salvarPerfilInvestidor,
} from '@/repositories/perfil-investidor-repository';
import type { PerfilInvestidor, TipoPerfilInvestidor } from '@/types/financas';

export type Pergunta = {
  texto: string;
  opcoes: { texto: string; pontos: number }[];
};

export const PERGUNTAS: Pergunta[] = [
  {
    texto: 'Qual é o seu principal objetivo ao investir?',
    opcoes: [
      { texto: 'Proteger meu dinheiro, sem correr riscos', pontos: 1 },
      { texto: 'Equilibrar segurança e rentabilidade', pontos: 2 },
      { texto: 'Fazer o dinheiro crescer bastante, mesmo com risco', pontos: 3 },
    ],
  },
  {
    texto: 'Por quanto tempo você pretende deixar o dinheiro investido?',
    opcoes: [
      { texto: 'Menos de 1 ano', pontos: 1 },
      { texto: 'De 1 a 5 anos', pontos: 2 },
      { texto: 'Mais de 5 anos', pontos: 3 },
    ],
  },
  {
    texto: 'Se seus investimentos caíssem 20% em um mês, o que você faria?',
    opcoes: [
      { texto: 'Venderia tudo para não perder mais', pontos: 1 },
      { texto: 'Esperaria o mercado se recuperar', pontos: 2 },
      { texto: 'Aproveitaria para investir mais', pontos: 3 },
    ],
  },
  {
    texto: 'Qual a sua experiência com investimentos?',
    opcoes: [
      { texto: 'Nenhuma, ou só poupança', pontos: 1 },
      { texto: 'Já investi em renda fixa (CDB, Tesouro) ou fundos', pontos: 2 },
      { texto: 'Já investi em ações, FIIs ou criptomoedas', pontos: 3 },
    ],
  },
  {
    texto: 'Você tem uma reserva de emergência?',
    opcoes: [
      { texto: 'Não tenho', pontos: 1 },
      { texto: 'Tenho, mas cobre menos de 6 meses de gastos', pontos: 2 },
      { texto: 'Sim, cobre 6 meses ou mais', pontos: 3 },
    ],
  },
  {
    texto: 'Quanto da sua renda mensal sobra para investir?',
    opcoes: [
      { texto: 'Menos de 10%', pontos: 1 },
      { texto: 'Entre 10% e 30%', pontos: 2 },
      { texto: 'Mais de 30%', pontos: 3 },
    ],
  },
];

const INDICE_RESERVA = 4;

export function calcularPerfil(respostas: number[]): PerfilInvestidor {
  if (
    respostas.length !== PERGUNTAS.length ||
    respostas.some((opcao, i) => !Number.isInteger(opcao) || !PERGUNTAS[i].opcoes[opcao])
  ) {
    throw new Error('Responda todas as perguntas do questionário.');
  }
  const pontos = respostas.reduce((soma, opcao, i) => soma + PERGUNTAS[i].opcoes[opcao].pontos, 0);
  const tipo: TipoPerfilInvestidor = pontos <= 10 ? 'conservador' : pontos <= 14 ? 'moderado' : 'arrojado';
  return {
    tipo,
    pontos,
    respostas,
    temReserva: respostas[INDICE_RESERVA] > 0,
    respondidoEm: new Date().toISOString(),
  };
}

export function obterPerfil(): PerfilInvestidor | null {
  return obterPerfilInvestidor();
}

/** Calcula o perfil a partir das respostas e salva no banco. */
export function responderQuestionario(respostas: number[]): PerfilInvestidor {
  const perfil = calcularPerfil(respostas);
  salvarPerfilInvestidor(perfil);
  return perfil;
}

export const DESCRICAO_PERFIL: Record<TipoPerfilInvestidor, { titulo: string; texto: string }> = {
  conservador: {
    titulo: 'Conservador',
    texto:
      'Você prioriza segurança e liquidez. Costuma combinar com renda fixa de baixo risco, como Tesouro Selic e CDBs com liquidez diária.',
  },
  moderado: {
    titulo: 'Moderado',
    texto:
      'Você aceita algum risco em troca de mais rentabilidade. Costuma combinar uma base de renda fixa com uma parte menor em fundos e renda variável.',
  },
  arrojado: {
    titulo: 'Arrojado',
    texto:
      'Você tolera oscilações para buscar retornos maiores no longo prazo. Pode ter uma fatia relevante em renda variável, sempre com diversificação.',
  },
};
