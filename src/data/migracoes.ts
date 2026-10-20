/**
 * Estrutura do banco. Cada migração roda uma única vez, em ordem, dentro de uma transação;
 * a versão aplicada fica em `PRAGMA user_version`.
 * Para mudar o banco, ADICIONE uma nova função no fim da lista. Nunca edite uma migração já publicada.
 */

import Storage from 'expo-sqlite/kv-store';
import type { SQLiteDatabase } from 'expo-sqlite';

import { paraDataLocal } from '@/utils/datas';

type Migracao = (db: SQLiteDatabase) => void;

const CATEGORIAS_INICIAIS = {
  despesa: [
    'Alimentação',
    'Transporte',
    'Moradia',
    'Saúde',
    'Educação',
    'Lazer',
    'Compras',
    'Assinaturas',
    'Viagens',
    'Outros',
  ],
  receita: ['Salário', 'Freelance', 'Investimentos', 'Outros'],
};

function v1CriarTabelas(db: SQLiteDatabase) {
  db.execSync(`
    CREATE TABLE categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
      padrao INTEGER NOT NULL DEFAULT 0,
      ordem INTEGER NOT NULL DEFAULT 0,
      UNIQUE (nome, tipo)
    );

    CREATE TABLE transacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
      valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
      descricao TEXT NOT NULL DEFAULT '',
      categoria_id INTEGER NOT NULL REFERENCES categorias (id),
      data TEXT NOT NULL,
      recorrente INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL
    );
    CREATE INDEX idx_transacoes_data ON transacoes (data);

    CREATE TABLE perfil_investidor (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      tipo TEXT NOT NULL,
      pontos INTEGER NOT NULL,
      respostas TEXT NOT NULL,
      tem_reserva INTEGER NOT NULL,
      respondido_em TEXT NOT NULL
    );
  `);

  for (const tipo of ['despesa', 'receita'] as const) {
    CATEGORIAS_INICIAIS[tipo].forEach((nome, ordem) => {
      db.runSync('INSERT INTO categorias (nome, tipo, padrao, ordem) VALUES (?, ?, 1, ?)', nome, tipo, ordem);
    });
  }
}

/** Formato antigo (até a versão com expo-sqlite/kv-store), salvo como JSON. */
type LancamentoAntigo = {
  tipo: 'receita' | 'despesa';
  valor: number;
  categoria: string;
  descricao?: string;
  data: string;
};

type PerfilAntigo = {
  tipo: string;
  pontos: number;
  respostas: number[];
  temReserva: boolean;
  data: string;
};

/** Nomes de categorias antigas que mudaram no plano do EcoTrust. */
const CATEGORIA_RENOMEADA: Record<string, string> = {
  'receita:Rendimentos': 'Investimentos',
  'receita:Presente': 'Outros',
};

function lerJsonAntigo<T>(chave: string): T | null {
  try {
    const texto = Storage.getItemSync(chave);
    return texto ? (JSON.parse(texto) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Importa os dados da primeira versão do app. Os dados antigos não são apagados,
 * só deixam de ser lidos (esta migração roda uma única vez).
 */
function v2ImportarDadosAntigos(db: SQLiteDatabase) {
  const lancamentos = lerJsonAntigo<LancamentoAntigo[]>('lancamentos') ?? [];
  const agora = new Date().toISOString();

  for (const l of lancamentos) {
    const valorCentavos = Math.round(Number(l.valor) * 100);
    const data = new Date(l.data);
    if ((l.tipo !== 'receita' && l.tipo !== 'despesa') || !(valorCentavos > 0) || isNaN(data.getTime())) {
      continue;
    }

    const nomeCategoria = CATEGORIA_RENOMEADA[`${l.tipo}:${l.categoria}`] ?? (l.categoria || 'Outros');
    db.runSync(
      `INSERT OR IGNORE INTO categorias (nome, tipo, padrao, ordem)
       VALUES (?, ?, 0, (SELECT COALESCE(MAX(ordem), 0) + 1 FROM categorias WHERE tipo = ?))`,
      nomeCategoria,
      l.tipo,
      l.tipo,
    );
    const categoria = db.getFirstSync<{ id: number }>(
      'SELECT id FROM categorias WHERE nome = ? AND tipo = ?',
      nomeCategoria,
      l.tipo,
    );
    if (!categoria) continue;

    db.runSync(
      `INSERT INTO transacoes (tipo, valor_centavos, descricao, categoria_id, data, recorrente, criado_em)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      l.tipo,
      valorCentavos,
      (l.descricao ?? '').trim(),
      categoria.id,
      paraDataLocal(data),
      agora,
    );
  }

  const perfil = lerJsonAntigo<PerfilAntigo>('perfil');
  if (perfil && ['conservador', 'moderado', 'arrojado'].includes(perfil.tipo) && Array.isArray(perfil.respostas)) {
    db.runSync(
      `INSERT INTO perfil_investidor (id, tipo, pontos, respostas, tem_reserva, respondido_em)
       VALUES (1, ?, ?, ?, ?, ?)`,
      perfil.tipo,
      perfil.pontos,
      JSON.stringify(perfil.respostas),
      perfil.temReserva ? 1 : 0,
      perfil.data,
    );
  }
}

function v3PerfilFinanceiro(db: SQLiteDatabase) {
  db.execSync(`
    CREATE TABLE perfil_financeiro (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      nome TEXT NOT NULL,
      renda_mensal_centavos INTEGER NOT NULL CHECK (renda_mensal_centavos >= 0),
      fonte_renda TEXT NOT NULL,
      despesas_fixas_centavos INTEGER NOT NULL CHECK (despesas_fixas_centavos >= 0),
      objetivo TEXT NOT NULL,
      meta_economia_centavos INTEGER NOT NULL CHECK (meta_economia_centavos >= 0),
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL
    );
  `);
}

/**
 * Orçamentos mensais: valem para todos os meses até serem alterados.
 * categoria_id NULL = orçamento geral do mês. Apagar uma categoria apaga o orçamento dela.
 */
function v4Orcamentos(db: SQLiteDatabase) {
  db.execSync(`
    CREATE TABLE orcamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoria_id INTEGER REFERENCES categorias (id) ON DELETE CASCADE,
      limite_centavos INTEGER NOT NULL CHECK (limite_centavos > 0),
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL
    );
    CREATE UNIQUE INDEX idx_orcamentos_categoria ON orcamentos (IFNULL(categoria_id, 0));
  `);
}

/**
 * Metas financeiras. O valor atual é a soma dos movimentos (inicial + guardados − retirados),
 * o que permite calcular o ritmo de economia de cada meta.
 */
function v5Metas(db: SQLiteDatabase) {
  db.execSync(`
    CREATE TABLE metas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      objetivo_centavos INTEGER NOT NULL CHECK (objetivo_centavos > 0),
      prazo TEXT,
      criado_em TEXT NOT NULL
    );

    CREATE TABLE metas_movimentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meta_id INTEGER NOT NULL REFERENCES metas (id) ON DELETE CASCADE,
      tipo TEXT NOT NULL CHECK (tipo IN ('inicial', 'deposito', 'retirada')),
      valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
      data TEXT NOT NULL,
      criado_em TEXT NOT NULL
    );
    CREATE INDEX idx_metas_movimentos_meta ON metas_movimentos (meta_id);
  `);
}

/** Configurações do app em chave/valor (ex.: plano de assinatura). */
function v6Configuracoes(db: SQLiteDatabase) {
  db.execSync(`
    CREATE TABLE configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL,
      atualizado_em TEXT NOT NULL
    );
  `);
}

/** Situação financeira respondida no chat do cadastro (dívidas, reserva, investimentos). */
function v7SituacaoFinanceira(db: SQLiteDatabase) {
  db.execSync(`
    CREATE TABLE perfil_situacao (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      dividas TEXT NOT NULL CHECK (dividas IN ('nao', 'controlada', 'pesando')),
      reserva TEXT NOT NULL CHECK (reserva IN ('nao', 'parcial', 'completa')),
      investe TEXT NOT NULL CHECK (investe IN ('nao', 'poupanca', 'outros')),
      atualizado_em TEXT NOT NULL
    );
  `);
}

/**
 * Perfil completo e jornada:
 * - dados pessoais; moradia e renda extra na situação financeira;
 * - conquistas (data em que cada uma foi alcançada pela primeira vez);
 * - histórico mensal da nota de saúde financeira (para mostrar a evolução).
 */
function v8PerfilCompletoEJornada(db: SQLiteDatabase) {
  db.execSync(`
    CREATE TABLE perfil_pessoal (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      avatar TEXT,
      cor_avatar INTEGER NOT NULL DEFAULT 0,
      ano_nascimento INTEGER,
      cidade TEXT,
      profissao TEXT,
      estado_civil TEXT,
      dependentes INTEGER,
      atualizado_em TEXT NOT NULL
    );

    ALTER TABLE perfil_situacao ADD COLUMN moradia TEXT;
    ALTER TABLE perfil_situacao ADD COLUMN renda_extra INTEGER;

    CREATE TABLE conquistas (
      id TEXT PRIMARY KEY,
      alcancada_em TEXT NOT NULL
    );

    CREATE TABLE saude_historico (
      mes TEXT PRIMARY KEY,
      nota INTEGER NOT NULL,
      atualizado_em TEXT NOT NULL
    );
  `);
}

/**
 * Evolução da saúde: guarda os pontos de cada fator por mês (para comentar o que mudou)
 * e marca os meses calculados depois, a partir dos lançamentos ("estimados").
 */
function v9EvolucaoSaude(db: SQLiteDatabase) {
  db.execSync(`
    ALTER TABLE saude_historico ADD COLUMN fatores TEXT;
    ALTER TABLE saude_historico ADD COLUMN estimado INTEGER NOT NULL DEFAULT 0;
  `);
}

/**
 * Trust Academy com cursos e fórum.
 * - academy_meus_cursos: cursos que o usuário escolheu acompanhar
 * - academy_aulas_concluidas: aulas terminadas (e se acertou a pergunta de fixação)
 * - forum_*: protótipo local do fórum. Os tópicos de exemplo (exemplo = 1) mostram como a
 *   comunidade vai funcionar; os do usuário ficam com meu = 1 e podem ser excluídos.
 */
function v10AcademyEForum(db: SQLiteDatabase) {
  db.execSync(`
    CREATE TABLE academy_meus_cursos (
      curso_id TEXT PRIMARY KEY,
      adicionado_em TEXT NOT NULL
    );
    CREATE TABLE academy_aulas_concluidas (
      aula_id TEXT PRIMARY KEY,
      curso_id TEXT NOT NULL,
      acertou_quiz INTEGER NOT NULL DEFAULT 0,
      concluida_em TEXT NOT NULL
    );
    CREATE TABLE forum_topicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoria_id TEXT NOT NULL,
      titulo TEXT NOT NULL,
      texto TEXT NOT NULL,
      autor TEXT NOT NULL,
      criado_em TEXT NOT NULL,
      exemplo INTEGER NOT NULL DEFAULT 0,
      meu INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE forum_respostas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topico_id INTEGER NOT NULL REFERENCES forum_topicos(id) ON DELETE CASCADE,
      texto TEXT NOT NULL,
      autor TEXT NOT NULL,
      criado_em TEXT NOT NULL,
      exemplo INTEGER NOT NULL DEFAULT 0,
      meu INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX forum_respostas_topico ON forum_respostas (topico_id);
  `);

  const diasAtras = (dias: number, horas = 0) =>
    new Date(Date.now() - (dias * 24 + horas) * 60 * 60 * 1000).toISOString();
  const exemplos: { categoria: string; titulo: string; texto: string; autor: string; dias: number; respostas: [string, string, number][] }[] = [
    {
      categoria: 'basico',
      titulo: 'Como vocês começaram a reserva de emergência?',
      texto: 'Ganho pouco e sempre parece que não sobra nada. Alguém conseguiu montar a reserva começando com valores baixos?',
      autor: 'Ana',
      dias: 6,
      respostas: [
        ['Comecei guardando R$ 50 no dia do pagamento. Em um ano virou um bom começo.', 'Rafael', 5],
        ['Criei uma meta no app e fui acompanhando. Ver a barra subir ajuda muito!', 'Juliana', 4],
      ],
    },
    {
      categoria: 'orcamento',
      titulo: 'A regra 50/30/20 funciona para quem paga aluguel?',
      texto: 'Só o aluguel já leva quase 40% da minha renda. Como vocês adaptam a regra?',
      autor: 'Marcos',
      dias: 3,
      respostas: [['Eu uso 60/20/20 por enquanto e vou ajustando conforme a renda melhora.', 'Beatriz', 2]],
    },
    {
      categoria: 'dividas',
      titulo: 'Vale a pena trocar a dívida do cartão por um empréstimo mais barato?',
      texto: 'Estou no rotativo há alguns meses. Pensei em pegar um empréstimo com juros menores para quitar. Alguém já fez isso?',
      autor: 'Carla',
      dias: 2,
      respostas: [
        ['Fiz isso e ajudou, mas o segredo foi não voltar a usar o limite do cartão.', 'Paulo', 1],
      ],
    },
    {
      categoria: 'investimentos',
      titulo: 'Primeira vez investindo: o que estudar antes?',
      texto: 'Já tenho a reserva pronta. Quais conceitos vocês acham importante entender antes de começar?',
      autor: 'Lucas',
      dias: 1,
      respostas: [],
    },
  ];

  for (const t of exemplos) {
    const { lastInsertRowId } = db.runSync(
      'INSERT INTO forum_topicos (categoria_id, titulo, texto, autor, criado_em, exemplo) VALUES (?, ?, ?, ?, ?, 1)',
      t.categoria,
      t.titulo,
      t.texto,
      t.autor,
      diasAtras(t.dias),
    );
    for (const [texto, autor, dias] of t.respostas) {
      db.runSync(
        'INSERT INTO forum_respostas (topico_id, texto, autor, criado_em, exemplo) VALUES (?, ?, ?, ?, 1)',
        lastInsertRowId,
        texto,
        autor,
        diasAtras(dias, 3),
      );
    }
  }
}

/** Data de nascimento completa (escolhida no calendário). O ano continua guardado à parte. */
function v11DataNascimento(db: SQLiteDatabase) {
  db.execSync('ALTER TABLE perfil_pessoal ADD COLUMN data_nascimento TEXT');
}

/**
 * Ordem e tipo de consumo das categorias padrão de despesa depois do Impostômetro
 * ("Outros" fica sempre por último). Fixo aqui, e não importado, para a migração nunca mudar.
 */
const CATEGORIAS_V12: [nome: string, perfilTributario: string][] = [
  ['Supermercado', 'supermercado'],
  ['Alimentação', 'alimentacao'],
  ['Transporte', 'transporte'],
  ['Combustível', 'combustivel'],
  ['Moradia', 'moradia'],
  ['Contas da casa', 'contas'],
  ['Telefone e internet', 'telecom'],
  ['Saúde', 'saude'],
  ['Educação', 'educacao'],
  ['Lazer', 'lazer'],
  ['Compras', 'compras'],
  ['Assinaturas', 'assinaturas'],
  ['Viagens', 'viagens'],
  ['Outros', 'geral'],
];

/**
 * Impostômetro pessoal:
 * - categorias.perfil_tributario: tipo de consumo usado para estimar os impostos (NULL = palpite pelo nome);
 * - transacoes.tributos_centavos: valor dos tributos informado na nota fiscal (NULL = estimado);
 * - novas categorias padrão de despesa, que têm carga de impostos bem diferente das demais.
 */
function v12Impostometro(db: SQLiteDatabase) {
  db.execSync(`
    ALTER TABLE categorias ADD COLUMN perfil_tributario TEXT;
    ALTER TABLE transacoes ADD COLUMN tributos_centavos INTEGER CHECK (tributos_centavos >= 0);
  `);

  // As categorias do usuário continuam depois das padrão.
  db.runSync(`UPDATE categorias SET ordem = ordem + 100 WHERE tipo = 'despesa' AND padrao = 0`);
  CATEGORIAS_V12.forEach(([nome, perfil], ordem) => {
    // Se o usuário já tinha criado uma categoria com esse nome, ela continua sendo dele.
    db.runSync(
      `INSERT OR IGNORE INTO categorias (nome, tipo, padrao, ordem) VALUES (?, 'despesa', 1, ?)`,
      nome,
      ordem,
    );
    db.runSync(
      `UPDATE categorias SET ordem = ?, perfil_tributario = ? WHERE tipo = 'despesa' AND nome = ?`,
      ordem,
      perfil,
      nome,
    );
  });
}

/**
 * Impostos além do consumo e leitura de notas:
 * - impostos_fixos: salário bruto (CLT, para calcular INSS e IR) ou valores informados de INSS/IR,
 *   IPVA e IPTU anuais e outros impostos mensais (ex.: DAS do MEI);
 * - transacoes.chave_nota: chave de acesso da NFC-e lida pelo QR Code (evita registrar a mesma nota duas vezes).
 */
function v13ImpostosFixosENotas(db: SQLiteDatabase) {
  db.execSync(`
    CREATE TABLE impostos_fixos (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      salario_bruto_centavos INTEGER CHECK (salario_bruto_centavos >= 0),
      dependentes INTEGER NOT NULL DEFAULT 0 CHECK (dependentes >= 0),
      inss_centavos INTEGER CHECK (inss_centavos >= 0),
      ir_centavos INTEGER CHECK (ir_centavos >= 0),
      ipva_anual_centavos INTEGER NOT NULL DEFAULT 0 CHECK (ipva_anual_centavos >= 0),
      iptu_anual_centavos INTEGER NOT NULL DEFAULT 0 CHECK (iptu_anual_centavos >= 0),
      outros_mensal_centavos INTEGER NOT NULL DEFAULT 0 CHECK (outros_mensal_centavos >= 0),
      atualizado_em TEXT NOT NULL
    );

    ALTER TABLE transacoes ADD COLUMN chave_nota TEXT;
    CREATE INDEX idx_transacoes_chave_nota ON transacoes (chave_nota);
  `);
}

/**
 * Notas fiscais lidas pelo QR Code: loja, endereço de consulta e os itens comprados.
 * Ficam ligadas ao lançamento e são apagadas junto com ele.
 */
function v14ItensDaNota(db: SQLiteDatabase) {
  db.execSync(`
    CREATE TABLE notas_fiscais (
      transacao_id INTEGER PRIMARY KEY REFERENCES transacoes (id) ON DELETE CASCADE,
      chave TEXT NOT NULL,
      url TEXT,
      emitente TEXT,
      importada_em TEXT NOT NULL
    );

    CREATE TABLE itens_nota (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transacao_id INTEGER NOT NULL REFERENCES transacoes (id) ON DELETE CASCADE,
      ordem INTEGER NOT NULL,
      descricao TEXT NOT NULL,
      codigo TEXT,
      quantidade REAL NOT NULL CHECK (quantidade > 0),
      unidade TEXT,
      valor_unitario_centavos INTEGER,
      valor_total_centavos INTEGER NOT NULL CHECK (valor_total_centavos >= 0)
    );
    CREATE INDEX idx_itens_nota_transacao ON itens_nota (transacao_id);
  `);
}

const MIGRACOES: Migracao[] = [
  v1CriarTabelas,
  v2ImportarDadosAntigos,
  v3PerfilFinanceiro,
  v4Orcamentos,
  v5Metas,
  v6Configuracoes,
  v7SituacaoFinanceira,
  v8PerfilCompletoEJornada,
  v9EvolucaoSaude,
  v10AcademyEForum,
  v11DataNascimento,
  v12Impostometro,
  v13ImpostosFixosENotas,
  v14ItensDaNota,
];

export function executarMigracoes(db: SQLiteDatabase) {
  const versaoAtual = db.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;

  for (let versao = versaoAtual; versao < MIGRACOES.length; versao++) {
    db.withTransactionSync(() => {
      MIGRACOES[versao](db);
      db.execSync(`PRAGMA user_version = ${versao + 1}`);
    });
  }
}
