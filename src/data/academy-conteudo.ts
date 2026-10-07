/**
 * Conteúdo da Trust Academy, guardado no próprio app para funcionar sem internet.
 * Estrutura: categorias → cursos → aulas (texto curto + pontos-chave + uma pergunta de fixação).
 * Para adicionar conteúdo, inclua a aula em AULAS e o id dela em um curso de CURSOS.
 * Regra editorial: educativo e geral. Não citar produtos, instituições ou ativos específicos.
 */

export type QuizAula = {
  pergunta: string;
  opcoes: string[];
  /** Índice da opção correta em `opcoes` */
  correta: number;
  explicacao: string;
};

export type Aula = {
  id: string;
  titulo: string;
  resumo: string;
  minutos: number;
  /** Data de publicação (AAAA-MM-DD), usada em "Recentes" */
  publicadaEm: string;
  paragrafos: string[];
  pontosChave: string[];
  quiz: QuizAula;
};

export type CategoriaAcademy = {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  /** Fundo dos cartões; texto branco por cima tem contraste de pelo menos 5:1 */
  cor: string;
};

export type Curso = {
  id: string;
  titulo: string;
  resumo: string;
  categoriaId: string;
  /** Ids das aulas, na ordem do curso */
  aulas: string[];
};

export type Conceito = { termo: string; definicao: string };

export const CATEGORIAS_ACADEMY: CategoriaAcademy[] = [
  { id: 'basico', nome: 'Primeiros passos', descricao: 'A base para organizar o dinheiro.', icone: '🌱', cor: '#0A7A5E' },
  { id: 'orcamento', nome: 'Orçamento', descricao: 'Planejar o mês e controlar os gastos.', icone: '📊', cor: '#2958A8' },
  { id: 'dividas', nome: 'Dívidas', descricao: 'Sair do vermelho e não voltar.', icone: '🧯', cor: '#B23A2B' },
  { id: 'investimentos', nome: 'Investimentos', descricao: 'Fazer o dinheiro trabalhar por você.', icone: '📈', cor: '#6B3FB8' },
];

export const CURSOS: Curso[] = [
  {
    id: 'financas-do-zero',
    titulo: 'Finanças do zero',
    resumo: 'Entenda seus gastos, monte a reserva e crie metas que funcionam.',
    categoriaId: 'basico',
    aulas: ['para-onde-vai-o-dinheiro', 'reserva-emergencia', 'metas-financeiras'],
  },
  {
    id: 'orcamento-sem-sofrimento',
    titulo: 'Orçamento sem sofrimento',
    resumo: 'Divida a renda, controle as contas fixas e gaste sem culpa.',
    categoriaId: 'orcamento',
    aulas: ['regra-50-30-20', 'gastos-recorrentes', 'gastos-superfluos'],
  },
  {
    id: 'saindo-do-vermelho',
    titulo: 'Saindo do vermelho',
    resumo: 'Use o cartão sem armadilhas, organize e negocie suas dívidas.',
    categoriaId: 'dividas',
    aulas: ['juros-do-cartao', 'sair-das-dividas', 'negociar-dividas'],
  },
  {
    id: 'comecando-a-investir',
    titulo: 'Começando a investir',
    resumo: 'Inflação, juros compostos e os primeiros passos para investir.',
    categoriaId: 'investimentos',
    aulas: ['inflacao', 'juros-compostos', 'primeiros-investimentos'],
  },
];

/** Todas as aulas. A ordem dentro de cada curso fica em CURSOS. */
export const AULAS: Aula[] = [
  {
    id: 'reserva-emergencia',
    titulo: 'Como montar uma reserva de emergência',
    resumo: 'O primeiro passo para ter tranquilidade com dinheiro.',
    publicadaEm: '2026-08-04',
    quiz: {
      pergunta: 'Qual é a característica mais importante do lugar onde fica a reserva de emergência?',
      opcoes: ['Render o máximo possível', 'Ser seguro e permitir resgate rápido', 'Ficar travado por alguns anos'],
      correta: 1,
      explicacao: 'A reserva existe para imprevistos: precisa estar disponível quando você precisar, mesmo rendendo menos.',
    },
    minutos: 3,
    paragrafos: [
      'A reserva de emergência é um dinheiro guardado só para imprevistos: perder o emprego, um problema de saúde, o carro que quebrou. Ela evita que um susto vire dívida no cartão ou no cheque especial.',
      'Uma referência comum é guardar de 3 a 6 meses dos seus gastos essenciais. Quem tem renda variável (autônomos, por exemplo) costuma precisar de mais, perto de 12 meses.',
      'Esse dinheiro precisa estar em um lugar seguro e que permita resgatar rápido, de preferência no mesmo dia. Rentabilidade alta não é o objetivo: o importante é estar disponível quando você precisar.',
      'Comece pequeno. Definir um valor fixo por mês, mesmo baixo, e guardar assim que o salário cai funciona melhor do que esperar sobrar no fim do mês.',
    ],
    pontosChave: [
      'Objetivo: cobrir imprevistos sem se endividar.',
      'Meta comum: 3 a 6 meses de gastos essenciais.',
      'Segurança e resgate rápido importam mais que rendimento.',
      'Guarde no início do mês, não com o que sobra.',
    ],
  },
  {
    id: 'regra-50-30-20',
    titulo: '50/30/20: como funciona?',
    resumo: 'Um jeito simples de dividir o seu dinheiro todo mês.',
    publicadaEm: '2026-08-11',
    quiz: {
      pergunta: 'Na regra 50/30/20, para onde vão os 20%?',
      opcoes: ['Lazer e compras', 'Contas da casa', 'Reserva, dívidas e investimentos'],
      correta: 2,
      explicacao: 'Os 20% são o dinheiro do futuro: reserva de emergência, quitar dívidas e investir.',
    },
    minutos: 3,
    paragrafos: [
      'A regra 50/30/20 divide a renda líquida (o que cai na conta) em três partes: 50% para necessidades, 30% para desejos e 20% para objetivos financeiros.',
      'Necessidades são gastos que você não consegue evitar: moradia, contas básicas, mercado, transporte, saúde. Desejos são o que deixa a vida melhor, mas pode ser ajustado: lazer, compras, restaurantes, assinaturas.',
      'Os 20% vão para o futuro: reserva de emergência, quitar dívidas e investir para seus objetivos.',
      'Os números são um ponto de partida, não uma regra rígida. Se as necessidades passam de 50%, tente reduzir os desejos primeiro. No EcoTrust, você pode usar o orçamento por categoria para colocar esse plano em prática.',
    ],
    pontosChave: [
      '50% necessidades, 30% desejos, 20% futuro.',
      'Use a renda líquida como base.',
      'Ajuste os percentuais à sua realidade.',
    ],
  },
  {
    id: 'gastos-recorrentes',
    titulo: 'Como controlar gastos recorrentes',
    resumo: 'Assinaturas e contas fixas pesam mais do que parecem.',
    publicadaEm: '2026-08-13',
    quiz: {
      pergunta: 'Qual atitude reduz gastos recorrentes de forma permanente?',
      opcoes: ['Revisar e cancelar assinaturas que não usa', 'Pagar as contas com atraso', 'Trocar de cartão todo mês'],
      correta: 0,
      explicacao: 'Cada assinatura cancelada é uma economia que se repete todos os meses.',
    },
    minutos: 3,
    paragrafos: [
      'Gastos recorrentes são os que se repetem todo mês: aluguel, condomínio, internet, celular, planos e assinaturas. Como são automáticos, é fácil esquecer quanto eles somam.',
      'Uma boa referência é manter as despesas fixas em até cerca de 30% a 50% da renda. Quando elas passam disso, qualquer imprevisto aperta o orçamento.',
      'Faça uma revisão a cada poucos meses: liste tudo o que é cobrado automaticamente e pergunte se ainda usa cada serviço. Cancelar uma assinatura esquecida é economia que se repete todo mês.',
      'Também vale renegociar: planos de internet e celular costumam ter ofertas melhores para quem pede. No EcoTrust, marque as despesas que se repetem como "recorrentes" para enxergar o total.',
    ],
    pontosChave: [
      'Some tudo que é cobrado todo mês.',
      'Revise assinaturas periodicamente.',
      'Renegociar contas fixas é economia permanente.',
    ],
  },
  {
    id: 'gastos-superfluos',
    titulo: 'Gastos não essenciais: cortar sem sofrimento',
    resumo: 'Não é sobre parar de viver, é sobre escolher melhor.',
    publicadaEm: '2026-08-18',
    quiz: {
      pergunta: 'Qual é a forma mais sustentável de lidar com gastos não essenciais?',
      opcoes: ['Cortar todos de uma vez', 'Definir um limite mensal para eles', 'Ignorar e ver no fim do mês'],
      correta: 1,
      explicacao: 'Um limite dá liberdade para aproveitar sem culpa e protege suas metas.',
    },
    minutos: 3,
    paragrafos: [
      'Lazer, compras, delivery e viagens fazem parte de uma vida boa. O problema aparece quando eles crescem sem você perceber e começam a ocupar o espaço da reserva e das metas.',
      'Em vez de cortar tudo, defina um limite mensal para essas categorias. Saber quanto ainda pode gastar dá liberdade e evita a culpa.',
      'Algumas estratégias ajudam: esperar 48 horas antes de compras por impulso, preferir o que você realmente valoriza e cortar o que faz por hábito.',
      'Pequenas reduções somam. Diminuir 10% dos gastos não essenciais e direcionar esse valor para uma meta já faz diferença em poucos meses.',
    ],
    pontosChave: [
      'Defina limites, não proibições.',
      'Espere antes de compras por impulso.',
      'Direcione o que economizar para uma meta.',
    ],
  },
  {
    id: 'sair-das-dividas',
    titulo: 'Como sair das dívidas: por onde começar',
    resumo: 'Um passo a passo para organizar e quitar o que você deve.',
    publicadaEm: '2026-08-20',
    quiz: {
      pergunta: 'Ao organizar as dívidas, quais costumam ser quitadas primeiro?',
      opcoes: ['As de menor valor', 'As de juros mais altos', 'As mais antigas'],
      correta: 1,
      explicacao: 'Dívidas como o rotativo do cartão e o cheque especial crescem mais rápido, então saem primeiro.',
    },
    minutos: 4,
    paragrafos: [
      'O primeiro passo é saber exatamente o que você deve: para quem, quanto, qual a taxa de juros e o valor das parcelas. Colocar tudo numa lista tira o peso do desconhecido.',
      'Priorize as dívidas com juros mais altos, como o rotativo do cartão de crédito e o cheque especial. Elas crescem muito rápido e devem ser as primeiras a sair.',
      'Procure renegociar. Credores costumam oferecer descontos e parcelamentos com juros menores, especialmente em feirões de renegociação. Trocar uma dívida cara por uma mais barata também pode ajudar, desde que você não volte a usar o limite.',
      'Enquanto quita, evite novas dívidas e acompanhe seus gastos de perto. Depois de sair, a reserva de emergência é o que impede voltar para o vermelho.',
    ],
    pontosChave: [
      'Liste todas as dívidas com juros e parcelas.',
      'Comece pelas de juros mais altos.',
      'Renegocie antes de atrasar.',
      'Depois, monte a reserva para não voltar.',
    ],
  },
  {
    id: 'primeiros-investimentos',
    titulo: 'Primeiros passos para investir',
    resumo: 'O que entender antes de colocar o dinheiro para render.',
    publicadaEm: '2026-08-25',
    quiz: {
      pergunta: 'O que vale ter antes de começar a investir?',
      opcoes: ['Dívidas caras quitadas e reserva montada', 'Um carro novo', 'Um empréstimo para investir mais'],
      correta: 0,
      explicacao: 'Assim você não precisa resgatar um investimento na hora errada nem paga juros maiores do que ganha.',
    },
    minutos: 4,
    paragrafos: [
      'Antes de investir, vale ter as dívidas caras quitadas e a reserva de emergência montada. Assim você não precisa resgatar um investimento na hora errada.',
      'Todo investimento combina três características: rentabilidade (quanto rende), risco (quanto pode oscilar ou perder) e liquidez (quão rápido vira dinheiro na conta). Não existe opção que seja ótima nas três ao mesmo tempo.',
      'Na renda fixa, as regras de rendimento são definidas na aplicação, como títulos públicos e CDBs. Na renda variável, como ações e fundos imobiliários, o valor oscila com o mercado e pode cair.',
      'Seu perfil de investidor (conservador, moderado ou arrojado) e o prazo de cada objetivo ajudam a escolher. Diversificar, ou seja, não colocar tudo em um só lugar, reduz o risco. Este conteúdo é educativo e não é uma recomendação de investimento.',
    ],
    pontosChave: [
      'Primeiro: dívidas caras quitadas e reserva pronta.',
      'Rentabilidade, risco e liquidez andam juntos.',
      'Escolha conforme seu perfil e o prazo do objetivo.',
      'Diversifique.',
    ],
  },
  {
    id: 'metas-financeiras',
    titulo: 'Como criar metas que funcionam',
    resumo: 'Transforme vontades em planos com valor e prazo.',
    publicadaEm: '2026-08-27',
    quiz: {
      pergunta: 'O que transforma um desejo em uma meta?',
      opcoes: ['Contar para os amigos', 'Ter valor, prazo e motivo', 'Guardar o que sobrar'],
      correta: 1,
      explicacao: 'Com valor e prazo você descobre quanto guardar por mês, e o motivo mantém a motivação.',
    },
    minutos: 2,
    paragrafos: [
      '"Quero guardar dinheiro" é um desejo. "Quero juntar R$ 6.000 para uma viagem em 12 meses" é uma meta: tem valor, prazo e motivo.',
      'Com valor e prazo, fica fácil saber quanto guardar por mês. No exemplo, são R$ 500 mensais. Se o valor não cabe no orçamento, ajuste o prazo ou a meta.',
      'Acompanhar o progresso mantém a motivação. Registre cada valor guardado e comemore as etapas, como os 25% e os 50%.',
      'Comece com uma ou duas metas. Muitas metas ao mesmo tempo dividem o dinheiro e demoram a ser concluídas.',
    ],
    pontosChave: [
      'Meta = valor + prazo + motivo.',
      'Divida o valor pelo prazo para saber o mensal.',
      'Acompanhe e comemore o progresso.',
    ],
  },
  {
    id: 'para-onde-vai-o-dinheiro',
    titulo: 'Para onde vai o seu dinheiro',
    resumo: 'Registrar os gastos é o primeiro passo para decidir melhor.',
    minutos: 3,
    publicadaEm: '2026-09-08',
    quiz: {
      pergunta: 'Por que registrar os gastos do dia a dia?',
      opcoes: ['Para enxergar para onde o dinheiro vai e decidir melhor', 'Porque é obrigatório por lei', 'Para gastar mais no fim do mês'],
      correta: 0,
      explicacao: 'Os números mostram padrões que passam despercebidos, como pequenos gastos que somam muito.',
    },
    paragrafos: [
      'Muita gente sabe quanto ganha, mas não sabe quanto gasta. Sem essa informação, qualquer plano vira chute: o dinheiro some e fica a sensação de que nunca sobra.',
      'Registrar receitas e despesas por algumas semanas já revela padrões. Pequenos gastos do dia a dia, como lanches, aplicativos e taxas, costumam somar mais do que parece.',
      'Separe os gastos em categorias, como moradia, alimentação, transporte e lazer. Assim fica fácil ver onde está o maior peso e onde dá para ajustar.',
      'O objetivo não é se culpar, e sim enxergar. Com os números na mão, você decide o que é prioridade. No EcoTrust, o histórico e o resumo do mês fazem essa conta por você.',
    ],
    pontosChave: [
      'Sem registro, não há como planejar.',
      'Pequenos gastos somam muito no mês.',
      'Categorias mostram onde está o maior peso.',
    ],
  },
  {
    id: 'juros-do-cartao',
    titulo: 'Cartão de crédito sem armadilhas',
    resumo: 'Como usar o cartão a seu favor e fugir dos juros mais caros.',
    minutos: 3,
    publicadaEm: '2026-09-15',
    quiz: {
      pergunta: 'O que acontece quando você paga só o mínimo da fatura?',
      opcoes: ['Nada, o resto é perdoado', 'O restante entra no rotativo, com juros muito altos', 'O limite do cartão aumenta'],
      correta: 1,
      explicacao: 'O valor que fica para trás entra no rotativo, um dos créditos mais caros do mercado.',
    },
    paragrafos: [
      'O cartão de crédito é prático e pode até organizar as compras do mês. O problema começa quando a fatura não é paga inteira.',
      'Ao pagar menos que o total, o restante entra no rotativo, um dos créditos com juros mais altos do mercado. Parcelar a fatura também costuma ter juros elevados.',
      'Para usar bem: trate o limite como dinheiro que você já tem, e não como renda extra. Anote as compras parceladas, porque elas ocupam as faturas dos próximos meses.',
      'Se a fatura já não cabe no orçamento, procure o banco antes do vencimento para conhecer opções de parcelamento com juros menores do que o rotativo.',
    ],
    pontosChave: [
      'Pague sempre a fatura inteira.',
      'O rotativo tem juros muito altos.',
      'Parcelas de hoje ocupam a renda de amanhã.',
    ],
  },
  {
    id: 'negociar-dividas',
    titulo: 'Como negociar uma dívida',
    resumo: 'Prepare-se para conseguir condições que caibam no seu bolso.',
    minutos: 3,
    publicadaEm: '2026-09-24',
    quiz: {
      pergunta: 'Ao avaliar uma proposta de renegociação, o que é mais importante comparar?',
      opcoes: ['Só o valor da parcela', 'O valor total, os juros e se a parcela cabe no mês', 'A cor do boleto'],
      correta: 1,
      explicacao: 'Uma parcela baixa em muitos meses pode custar bem mais. Olhe o total e se cabe no orçamento.',
    },
    paragrafos: [
      'Antes de negociar, saiba quanto você consegue pagar por mês sem deixar faltar o essencial. Aceitar uma parcela que não cabe só adia o problema.',
      'Pergunte pelo valor total da proposta, pela taxa de juros e pelo número de parcelas. Uma parcela pequena com muitos meses pode sair bem mais cara no final.',
      'Credores costumam oferecer descontos maiores para pagamento à vista ou em feirões de renegociação. Se tiver algum dinheiro guardado fora da reserva, vale comparar.',
      'Guarde todos os comprovantes e o acordo por escrito. Negocie apenas pelos canais oficiais do credor e desconfie de quem pede pagamento antecipado para "limpar o nome".',
    ],
    pontosChave: [
      'Saiba quanto cabe no seu mês antes de negociar.',
      'Compare o valor total, não só a parcela.',
      'Use apenas canais oficiais e guarde o acordo.',
    ],
  },
  {
    id: 'inflacao',
    titulo: 'Inflação: por que o dinheiro parado perde valor',
    resumo: 'Entenda o que corrói o seu poder de compra.',
    minutos: 3,
    publicadaEm: '2026-09-29',
    quiz: {
      pergunta: 'Se a inflação do ano foi 5% e seu dinheiro rendeu 3%, o que aconteceu?',
      opcoes: ['Você ganhou poder de compra', 'Você perdeu poder de compra', 'Nada mudou'],
      correta: 1,
      explicacao: 'O rendimento ficou abaixo da inflação, então o dinheiro passou a comprar menos.',
    },
    paragrafos: [
      'Inflação é o aumento geral dos preços ao longo do tempo. Com ela, a mesma quantia de dinheiro compra menos coisas a cada ano.',
      'Por isso, dinheiro guardado sem render nada perde valor aos poucos. Se os preços sobem 5% em um ano, R$ 100 parados compram o equivalente a cerca de R$ 95.',
      'Para proteger o poder de compra, o rendimento do dinheiro guardado precisa ser maior do que a inflação. Esse ganho acima da inflação é chamado de rendimento real.',
      'No Brasil, o índice oficial de inflação é o IPCA. Ao comparar opções de investimento, observe se elas costumam render acima dele.',
    ],
    pontosChave: [
      'Inflação = preços subindo e dinheiro comprando menos.',
      'Dinheiro parado perde poder de compra.',
      'Busque rendimento acima da inflação.',
    ],
  },
  {
    id: 'juros-compostos',
    titulo: 'Juros compostos: o tempo a seu favor',
    resumo: 'Por que começar cedo faz tanta diferença.',
    minutos: 3,
    publicadaEm: '2026-10-02',
    quiz: {
      pergunta: 'Qual fator mais aumenta o efeito dos juros compostos?',
      opcoes: ['O tempo', 'Sacar os rendimentos todo mês', 'Trocar de investimento toda semana'],
      correta: 0,
      explicacao: 'Quanto mais tempo o dinheiro fica rendendo, mais os rendimentos geram novos rendimentos.',
    },
    paragrafos: [
      'Nos juros compostos, o rendimento de cada mês passa a render também nos meses seguintes. É o famoso "juros sobre juros".',
      'No começo a diferença parece pequena, mas com o tempo ela acelera. Quanto mais longo o prazo, maior a parte do total que vem dos próprios rendimentos.',
      'Por isso, começar cedo, mesmo com pouco, costuma valer mais do que começar tarde com valores maiores. A constância também conta: aportes todo mês alimentam o efeito.',
      'O mesmo mecanismo funciona contra você nas dívidas. Juros compostos fazem uma dívida no rotativo crescer muito rápido, outro motivo para quitá-las primeiro.',
    ],
    pontosChave: [
      'Rendimentos passam a render também.',
      'Tempo e constância potencializam o efeito.',
      'Nas dívidas, o efeito joga contra você.',
    ],
  },
];

export const DICAS: string[] = [
  'Guarde no dia em que o salário cai, não com o que sobra no fim do mês.',
  'Antes de uma compra por impulso, espere 48 horas. Muitas vezes a vontade passa.',
  'Revise suas assinaturas a cada três meses e cancele o que não usa.',
  'Pagar só o mínimo do cartão leva aos juros do rotativo, entre os mais altos do mercado.',
  'Registrar os gastos todo dia leva menos de um minuto e mostra para onde o dinheiro vai.',
  'Comparar preços de serviços fixos (internet, celular, seguros) pode gerar economia todo mês.',
  'Uma meta com prazo é mais fácil de cumprir do que "guardar o que der".',
  'Antes de investir, monte sua reserva de emergência.',
];

export const CONCEITOS: Conceito[] = [
  {
    termo: 'Reserva de emergência',
    definicao: 'Dinheiro guardado para imprevistos, em aplicação segura e de resgate rápido. Referência comum: 3 a 6 meses de gastos essenciais.',
  },
  {
    termo: 'Liquidez',
    definicao: 'A facilidade e a rapidez para transformar um investimento em dinheiro disponível, sem perder valor.',
  },
  {
    termo: 'Juros compostos',
    definicao: 'Juros calculados sobre o valor inicial mais os juros já acumulados. Fazem investimentos crescerem mais com o tempo, e também fazem dívidas crescerem rápido.',
  },
  {
    termo: 'Selic',
    definicao: 'A taxa básica de juros da economia brasileira, definida pelo Comitê de Política Monetária (Copom) do Banco Central. Influencia todos os outros juros.',
  },
  {
    termo: 'CDI',
    definicao: 'Taxa usada em empréstimos entre bancos. Fica muito próxima da Selic e é a principal referência de rendimento da renda fixa.',
  },
  {
    termo: 'Inflação (IPCA)',
    definicao: 'O aumento geral dos preços. O IPCA, medido pelo IBGE, é o índice oficial. Se um investimento rende menos que a inflação, você perde poder de compra.',
  },
  {
    termo: 'Renda fixa',
    definicao: 'Investimentos cujas regras de rendimento são conhecidas na aplicação, como títulos públicos e CDBs.',
  },
  {
    termo: 'Renda variável',
    definicao: 'Investimentos cujo valor muda com o mercado, como ações e fundos imobiliários. Podem render mais, mas também podem cair.',
  },
  {
    termo: 'FGC',
    definicao: 'Fundo Garantidor de Créditos. Protege alguns investimentos (como CDBs e poupança) até R$ 250 mil por CPF por instituição, se o banco quebrar.',
  },
  {
    termo: 'Rotativo do cartão',
    definicao: 'O crédito usado quando você paga menos que o total da fatura. Tem juros muito altos. Desde 2024, juros e encargos do rotativo não podem passar do valor original da dívida.',
  },
];
