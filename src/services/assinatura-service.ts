/**
 * Planos do EcoTrust: Gratuito e EcoTrust Plus.
 *
 * IMPORTANTE (MVP): não existe cobrança real. "Assinar" ativa o Plus localmente, como simulação,
 * para validar o interesse pela assinatura. A integração com App Store / Google Play (e a checagem
 * do plano no servidor, para proteger a rota do chat) fica para uma etapa futura.
 */

import { lerConfiguracao, salvarConfiguracao } from '@/repositories/configuracoes-repository';

export type Plano = 'gratuito' | 'plus';

export type RecursoPremium = 'analise' | 'saude' | 'chat' | 'academy';

export const NOME_PLANO_PLUS = 'EcoTrust Plus';

/** O que a assinatura inclui (usado no paywall e nos bloqueios). */
export const RECURSOS_PREMIUM: Record<RecursoPremium, { nome: string; descricao: string }> = {
  analise: {
    nome: 'Análise completa da EcoTrust IA',
    descricao: 'Todos os pontos de atenção, boas notícias, projeção do mês e onde reduzir gastos.',
  },
  saude: {
    nome: 'Saúde financeira',
    descricao: 'Sua nota de 0 a 100, com cada fator explicado e o que fazer para melhorar.',
  },
  chat: {
    nome: 'Perguntas ao EcoTrust',
    descricao: 'Converse com o assistente sobre os seus números, metas e próximos passos.',
  },
  academy: {
    nome: 'Trust Academy',
    descricao: 'Cursos curtos com quiz, conteúdos novos e o fórum da comunidade, com sugestões para a sua situação.',
  },
};

/** O que continua grátis (mostrado no paywall para deixar claro). */
export const RECURSOS_GRATUITOS = [
  'Lançamentos e histórico',
  'Resumo do mês e insight do dia',
  'Orçamentos e metas',
  'Categorias personalizadas',
];

const CHAVE_PLANO = 'plano';
const CHAVE_ATIVADO_EM = 'plano_ativado_em';

export type Assinatura = { plano: Plano; ativadoEm: string | null; simulada: boolean };

export function obterAssinatura(): Assinatura {
  const plano = lerConfiguracao(CHAVE_PLANO) === 'plus' ? 'plus' : 'gratuito';
  return {
    plano,
    ativadoEm: plano === 'plus' ? lerConfiguracao(CHAVE_ATIVADO_EM) : null,
    // Enquanto não houver loja integrada, toda assinatura é simulada.
    simulada: true,
  };
}

export function temAcesso(_recurso: RecursoPremium, assinatura = obterAssinatura()) {
  // Hoje todos os recursos premium fazem parte do mesmo plano.
  return assinatura.plano === 'plus';
}

/** Ativa o Plus sem cobrança (simulação do MVP). */
export function ativarPlusSimulado() {
  salvarConfiguracao(CHAVE_ATIVADO_EM, new Date().toISOString());
  salvarConfiguracao(CHAVE_PLANO, 'plus');
}

export function cancelarPlus() {
  salvarConfiguracao(CHAVE_PLANO, 'gratuito');
}
