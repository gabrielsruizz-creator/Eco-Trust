/**
 * Tipos do domínio financeiro do EcoTrust.
 * Valores em dinheiro são sempre inteiros em centavos (R$ 42,90 = 4290) para evitar erros de arredondamento.
 * Datas são strings "AAAA-MM-DD" e meses são "AAAA-MM", no fuso do celular.
 */

import type { PerfilTributarioId } from '@/data/carga-tributaria';

export type TipoTransacao = 'receita' | 'despesa';

export type Categoria = {
  id: number;
  nome: string;
  tipo: TipoTransacao;
  /** Categoria criada pelo app (true) ou pelo usuário (false) */
  padrao: boolean;
  /** Tipo de consumo para estimar os impostos (null = palpite pelo nome da categoria) */
  perfilTributario: PerfilTributarioId | null;
};

export type Transacao = {
  id: number;
  tipo: TipoTransacao;
  valorCentavos: number;
  descricao: string;
  categoriaId: number;
  categoriaNome: string;
  data: string;
  recorrente: boolean;
  /** Tributos informados na nota fiscal ("Valor aprox. dos tributos"). null = o app estima */
  tributosCentavos: number | null;
  /** Momento em que foi registrado (ISO), quando disponível */
  criadoEm?: string;
};

export type NovaTransacao = Omit<Transacao, 'id' | 'categoriaNome' | 'criadoEm'>;

export type FiltroTransacoes = {
  mes?: string;
  tipo?: TipoTransacao;
  categoriaId?: number;
};

export type ResumoMes = {
  mes: string;
  receitasCentavos: number;
  despesasCentavos: number;
  saldoCentavos: number;
  /** Despesas por categoria, da maior para a menor */
  despesasPorCategoria: { categoriaId: number; categoria: string; totalCentavos: number }[];
};

export type FonteRenda = 'clt' | 'autonomo' | 'empresario' | 'aposentadoria' | 'estudante' | 'outra';

export type ObjetivoFinanceiro = 'controlar' | 'reserva' | 'dividas' | 'conquista' | 'investir';

/** Perfil criado no onboarding: a base para os cálculos e recomendações do app. */
export type PerfilFinanceiro = {
  nome: string;
  rendaMensalCentavos: number;
  fonteRenda: FonteRenda;
  /** Aluguel, contas, escola, assinaturas... valor aproximado informado pelo usuário */
  despesasFixasCentavos: number;
  objetivo: ObjetivoFinanceiro;
  metaEconomiaCentavos: number;
};

export type Insight = {
  /** Identificador estável do tipo de insight (útil para testes e, no futuro, para a EcoTrust IA) */
  id: string;
  tom: 'alerta' | 'positivo' | 'neutro';
  texto: string;
};

export type Dashboard = {
  mes: string;
  /** Tudo que entrou menos tudo que saiu, desde o primeiro lançamento */
  saldoDisponivelCentavos: number;
  receitasCentavos: number;
  despesasCentavos: number;
  /** Receitas menos despesas do mês (negativo quando gastou mais do que recebeu) */
  economizadoCentavos: number;
  metaEconomiaCentavos: number;
  /** Quanto da meta já foi economizado, em % (pode passar de 100). null sem meta */
  percentualMeta: number | null;
  /**
   * Quanto dá para gastar no mês: o orçamento geral, se existir; senão a renda menos a meta.
   * null sem orçamento e sem renda.
   */
  limiteGastosCentavos: number | null;
  origemLimite: 'orcamento' | 'renda' | null;
  /** Limite menos o que já foi gasto (negativo quando passou do limite). null sem renda */
  disponivelParaGastarCentavos: number | null;
  categorias: { categoriaId: number; categoria: string; totalCentavos: number; percentual: number }[];
  insights: Insight[];
  /** Variação em % contra o mês anterior (null quando o mês anterior foi zero) */
  variacaoReceitas: number | null;
  variacaoDespesas: number | null;
};

export type SituacaoDividas = 'nao' | 'controlada' | 'pesando';
export type SituacaoReserva = 'nao' | 'parcial' | 'completa';
export type SituacaoInvestimentos = 'nao' | 'poupanca' | 'outros';

export type Moradia = 'aluguel' | 'propria' | 'financiada' | 'familia' | 'outra';

export type SituacaoFinanceira = {
  dividas: SituacaoDividas;
  reserva: SituacaoReserva;
  investe: SituacaoInvestimentos;
  /** Perguntas opcionais (preenchidas no Perfil) */
  moradia?: Moradia | null;
  rendaExtra?: boolean | null;
};

export type EstadoCivil = 'solteiro' | 'casado' | 'uniao' | 'divorciado' | 'viuvo';

export type PerfilPessoal = {
  /** Emoji escolhido como avatar (null = iniciais do nome) */
  avatar: string | null;
  corAvatar: number;
  /** Data de nascimento (AAAA-MM-DD). Quem cadastrou antes só tem o ano. */
  dataNascimento: string | null;
  /** Ano de nascimento (vem da data, quando ela existe) */
  anoNascimento: number | null;
  cidade: string | null;
  profissao: string | null;
  estadoCivil: EstadoCivil | null;
  dependentes: number | null;
};

export type TipoMovimentoMeta ='inicial' | 'deposito' | 'retirada';

export type MovimentoMeta = {
  id: number;
  tipo: TipoMovimentoMeta;
  valorCentavos: number;
  data: string;
};

export type Meta = {
  id: number;
  nome: string;
  objetivoCentavos: number;
  /** Soma dos movimentos: inicial + guardados − retirados */
  atualCentavos: number;
  /** "AAAA-MM-DD" ou null (sem prazo) */
  prazo: string | null;
  /** Data e hora em ISO */
  criadoEm: string;
};

export type ProgressoMeta = Meta & {
  /** De 0 a 100 (limitado a 100) */
  percentual: number;
  faltaCentavos: number;
  concluida: boolean;
  /** Meses até o prazo (mínimo 1); null sem prazo ou com prazo vencido */
  mesesAtePrazo: number | null;
  prazoVencido: boolean;
  /** Quanto guardar por mês para chegar no prazo; null sem prazo, vencida ou concluída */
  porMesNecessarioCentavos: number | null;
  /** Média guardada por mês recentemente (sem contar o valor inicial); null sem histórico */
  ritmoMensalCentavos: number | null;
  /** Meses para concluir no ritmo atual; null sem ritmo ou já concluída */
  previsaoMeses: number | null;
};

export type TipoPerfilInvestidor = 'conservador' | 'moderado' | 'arrojado';

export type PerfilInvestidor = {
  tipo: TipoPerfilInvestidor;
  pontos: number;
  /** Índice da opção escolhida em cada pergunta do questionário */
  respostas: number[];
  temReserva: boolean;
  /** Data e hora em ISO */
  respondidoEm: string;
};
