/**
 * Tabela do Impostômetro: quanto do preço pago pelo consumidor é imposto, por tipo de consumo.
 *
 * Os percentuais são ESTIMATIVAS MÉDIAS sobre o preço final (o que você paga no caixa), montadas a
 * partir das alíquotas usuais de 2026 e de estudos públicos de carga tributária sobre consumo
 * (no estilo do "De Olho no Imposto" / IBPT). O valor real muda conforme o produto, o estado e o
 * regime da empresa — por isso o usuário pode informar o valor exato que vem na nota fiscal
 * (Lei 12.741/2012: "Valor aproximado dos tributos").
 *
 * Reforma tributária: em 2026 a CBS e o IBS estão em fase de teste (compensados no PIS/Cofins),
 * então a carga continua a mesma. Quando PIS/Cofins virarem CBS (2027) e ICMS/ISS virarem IBS
 * (até 2033), basta atualizar esta tabela.
 */

export type TributoId = 'icms' | 'pisCofins' | 'ipi' | 'iss' | 'iof' | 'embutidos';

export type Esfera = 'federal' | 'estadual' | 'municipal';

export type Tributo = {
  id: TributoId;
  sigla: string;
  nome: string;
  esfera: Esfera;
  descricao: string;
};

/** Na ordem em que aparecem nas telas. */
export const TRIBUTOS: Tributo[] = [
  {
    id: 'icms',
    sigla: 'ICMS',
    nome: 'Imposto sobre Circulação de Mercadorias e Serviços',
    esfera: 'estadual',
    descricao: 'Cobrado pelo estado sobre mercadorias, combustível, energia e telefonia.',
  },
  {
    id: 'pisCofins',
    sigla: 'PIS/Cofins',
    nome: 'Contribuições sobre o faturamento',
    esfera: 'federal',
    descricao: 'Cobradas pela União sobre o que as empresas vendem. Inclui a Cide dos combustíveis.',
  },
  {
    id: 'ipi',
    sigla: 'IPI',
    nome: 'Imposto sobre Produtos Industrializados',
    esfera: 'federal',
    descricao: 'Cobrado pela União sobre produtos que passaram por uma indústria.',
  },
  {
    id: 'iss',
    sigla: 'ISS',
    nome: 'Imposto sobre Serviços',
    esfera: 'municipal',
    descricao: 'Cobrado pela prefeitura sobre serviços: escola, academia, salão, streaming...',
  },
  {
    id: 'iof',
    sigla: 'IOF',
    nome: 'Imposto sobre Operações Financeiras',
    esfera: 'federal',
    descricao: 'Aparece em compras em moeda estrangeira, câmbio e crédito.',
  },
  {
    id: 'embutidos',
    sigla: 'Embutidos',
    nome: 'Tributos embutidos nos preços',
    esfera: 'federal',
    descricao:
      'IRPJ, CSLL e INSS que as empresas pagam e repassam no preço. Você não vê, mas paga.',
  },
];

export const NOME_ESFERA: Record<Esfera, string> = {
  federal: 'União',
  estadual: 'Estado',
  municipal: 'Município',
};

export type PerfilTributarioId =
  | 'supermercado'
  | 'alimentacao'
  | 'restaurante'
  | 'bebidas'
  | 'combustivel'
  | 'transporte'
  | 'moradia'
  | 'contas'
  | 'telecom'
  | 'saude'
  | 'educacao'
  | 'lazer'
  | 'servicos'
  | 'compras'
  | 'assinaturas'
  | 'viagens'
  | 'geral'
  | 'isento';

export type PerfilTributario = {
  id: PerfilTributarioId;
  nome: string;
  exemplos: string;
  /** Percentual do preço final que vai para cada tributo (ex.: 12 = 12%). */
  aliquotas: Partial<Record<TributoId, number>>;
};

export const PERFIS_TRIBUTARIOS: PerfilTributario[] = [
  {
    id: 'supermercado',
    nome: 'Supermercado',
    exemplos: 'Compras do mês, feira, padaria, produtos de limpeza',
    aliquotas: { icms: 12, pisCofins: 6, ipi: 1, embutidos: 4 },
  },
  {
    id: 'alimentacao',
    nome: 'Alimentação em geral',
    exemplos: 'Mistura de mercado e refeições fora de casa',
    aliquotas: { icms: 12, pisCofins: 7, ipi: 1, embutidos: 6 },
  },
  {
    id: 'restaurante',
    nome: 'Restaurantes e delivery',
    exemplos: 'Almoço, lanche, iFood, bares',
    aliquotas: { icms: 10, pisCofins: 8, embutidos: 12 },
  },
  {
    id: 'bebidas',
    nome: 'Bebidas alcoólicas e cigarro',
    exemplos: 'Cerveja, vinho, destilados, cigarro',
    aliquotas: { icms: 25, pisCofins: 10, ipi: 15, embutidos: 5 },
  },
  {
    id: 'combustivel',
    nome: 'Combustível',
    exemplos: 'Gasolina, etanol, diesel, GNV',
    aliquotas: { icms: 23, pisCofins: 13, embutidos: 2 },
  },
  {
    id: 'transporte',
    nome: 'Transporte',
    exemplos: 'Ônibus, metrô, app de corrida, estacionamento, manutenção',
    aliquotas: { icms: 8, pisCofins: 7, iss: 2, embutidos: 5 },
  },
  {
    id: 'moradia',
    nome: 'Aluguel e condomínio',
    exemplos: 'Aluguel, condomínio (quase não tem imposto sobre consumo)',
    aliquotas: { pisCofins: 1, iss: 1, embutidos: 4 },
  },
  {
    id: 'contas',
    nome: 'Contas da casa',
    exemplos: 'Luz, água, gás de cozinha',
    aliquotas: { icms: 13, pisCofins: 7, embutidos: 4 },
  },
  {
    id: 'telecom',
    nome: 'Telefone e internet',
    exemplos: 'Plano de celular, internet, TV por assinatura',
    aliquotas: { icms: 18, pisCofins: 4, embutidos: 8 },
  },
  {
    id: 'saude',
    nome: 'Saúde',
    exemplos: 'Farmácia, consultas, exames, plano de saúde',
    aliquotas: { icms: 9, pisCofins: 7, iss: 2, embutidos: 6 },
  },
  {
    id: 'educacao',
    nome: 'Educação',
    exemplos: 'Escola, faculdade, cursos, material escolar',
    aliquotas: { pisCofins: 4, iss: 4, embutidos: 7 },
  },
  {
    id: 'lazer',
    nome: 'Lazer',
    exemplos: 'Cinema, shows, passeios, jogos',
    aliquotas: { icms: 5, pisCofins: 6, iss: 4, embutidos: 8 },
  },
  {
    id: 'servicos',
    nome: 'Serviços pessoais',
    exemplos: 'Salão, academia, consertos, lavanderia',
    aliquotas: { pisCofins: 5, iss: 4, embutidos: 9 },
  },
  {
    id: 'compras',
    nome: 'Compras',
    exemplos: 'Roupas, calçados, eletrônicos, coisas para a casa',
    aliquotas: { icms: 17, pisCofins: 9, ipi: 5, embutidos: 6 },
  },
  {
    id: 'assinaturas',
    nome: 'Assinaturas digitais',
    exemplos: 'Streaming de vídeo e música, apps, jogos',
    aliquotas: { pisCofins: 9, iss: 3, embutidos: 6 },
  },
  {
    id: 'viagens',
    nome: 'Viagens',
    exemplos: 'Passagens, hotel, compras no exterior',
    aliquotas: { icms: 3, pisCofins: 7, iss: 4, iof: 2, embutidos: 7 },
  },
  {
    id: 'geral',
    nome: 'Consumo em geral',
    exemplos: 'Média de bens e serviços, quando não dá para saber o tipo',
    aliquotas: { icms: 10, pisCofins: 7, ipi: 2, iss: 2, embutidos: 5 },
  },
  {
    id: 'isento',
    nome: 'Sem imposto sobre consumo',
    exemplos: 'Pix para família, doações, aluguel pago a pessoa física',
    aliquotas: {},
  },
];

const POR_ID = new Map(PERFIS_TRIBUTARIOS.map((p) => [p.id, p]));

export function perfilTributario(id: PerfilTributarioId): PerfilTributario {
  return POR_ID.get(id) ?? POR_ID.get('geral')!;
}

export function perfilTributarioValido(id: string | null | undefined): id is PerfilTributarioId {
  return !!id && POR_ID.has(id as PerfilTributarioId);
}

/** Carga total do perfil, em % do preço final. */
export function cargaTotal(perfil: PerfilTributario) {
  return Object.values(perfil.aliquotas).reduce((soma, p) => soma + (p ?? 0), 0);
}

/** Perfil de cada categoria padrão de despesa do EcoTrust (o mesmo gravado pela migração v12). */
export const PERFIL_DAS_CATEGORIAS_PADRAO: Record<string, PerfilTributarioId> = {
  Supermercado: 'supermercado',
  Alimentação: 'alimentacao',
  Transporte: 'transporte',
  Combustível: 'combustivel',
  Moradia: 'moradia',
  'Contas da casa': 'contas',
  'Telefone e internet': 'telecom',
  Saúde: 'saude',
  Educação: 'educacao',
  Lazer: 'lazer',
  Compras: 'compras',
  Assinaturas: 'assinaturas',
  Viagens: 'viagens',
  Outros: 'geral',
};

/** Palavras no nome de uma categoria criada pelo usuário → perfil mais provável. */
const PALAVRAS: [RegExp, PerfilTributarioId][] = [
  [/mercado|feira|padaria|acougue|hortifruti|atacad/, 'supermercado'],
  [/restaurante|lanche|ifood|delivery|almoco|jantar|cafe|bar\b|pizza/, 'restaurante'],
  [/cerveja|bebida|vinho|cigarro|tabaco/, 'bebidas'],
  [/gasolina|combust|posto|etanol|diesel/, 'combustivel'],
  [/uber|onibus|metro|transporte|estacionamento|pedagio|carro|moto/, 'transporte'],
  [/aluguel|condominio|moradia/, 'moradia'],
  [/\bluz\b|energia|agua|\bgas\b|conta/, 'contas'],
  [/celular|internet|telefone|\btv\b/, 'telecom'],
  [/farmacia|remedio|saude|medic|dentista|plano/, 'saude'],
  [/escola|faculdade|curso|educa|livro/, 'educacao'],
  [/academia|salao|cabelo|beleza|barbe|conserto|lavanderia|pet/, 'servicos'],
  [/roupa|calcado|sapato|eletron|casa|presente|compra/, 'compras'],
  [/netflix|spotify|streaming|assinatura|app/, 'assinaturas'],
  [/viage|passage|hotel|hosped/, 'viagens'],
  [/cinema|show|lazer|passeio|jogo|festa/, 'lazer'],
  [/pix|doacao|dizimo|familia|mesada/, 'isento'],
];

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

/** Palpite do perfil pelo nome da categoria (para categorias do usuário ainda sem perfil escolhido). */
export function perfilPorNome(nome: string): PerfilTributarioId {
  const padrao = PERFIL_DAS_CATEGORIAS_PADRAO[nome];
  if (padrao) return padrao;
  const n = normalizar(nome);
  return PALAVRAS.find(([padrao]) => padrao.test(n))?.[1] ?? 'geral';
}
