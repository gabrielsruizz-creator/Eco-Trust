/**
 * Banco em memória para os testes: substitui os repositórios (que usam o SQLite do celular).
 * Cada arquivo de teste liga os mocks com `jest.mock('@/repositories/...', () => require(...))`
 * e preenche `banco` antes de cada caso.
 */

import { jest } from '@jest/globals';

import type { Categoria, ImpostosFixos, NotaSalva, PerfilFinanceiro, Transacao } from '@/types/financas';

export const banco: {
  categorias: Categoria[];
  transacoes: Transacao[];
  notas: Map<number, NotaSalva>;
  fixos: ImpostosFixos | null;
  perfil: Pick<PerfilFinanceiro, 'rendaMensalCentavos'> | null;
  classificacoes: Map<string, string>;
} = { categorias: [], transacoes: [], notas: new Map(), fixos: null, perfil: null, classificacoes: new Map() };

export function limparBanco() {
  banco.categorias = [];
  banco.transacoes = [];
  banco.notas = new Map();
  banco.fixos = null;
  banco.perfil = null;
  banco.classificacoes = new Map();
  jest.requireActual<typeof import('@/data/database')>('@/data/database').notificarMudanca();
}

let proximoId = 1000;

/** Atalho para criar lançamentos nos testes. */
export function despesa(dados: Partial<Transacao> & Pick<Transacao, 'valorCentavos' | 'categoriaId' | 'data'>): Transacao {
  const categoria = banco.categorias.find((c) => c.id === dados.categoriaId);
  return {
    id: proximoId++,
    tipo: 'despesa',
    descricao: '',
    categoriaNome: categoria?.nome ?? '',
    recorrente: false,
    tributosCentavos: null,
    chaveNota: null,
    ...dados,
  };
}

export const categoriasRepository = {
  listarCategorias: (tipo?: string) => banco.categorias.filter((c) => !tipo || c.tipo === tipo),
  buscarCategoria: (id: number) => banco.categorias.find((c) => c.id === id) ?? null,
  criarCategoria: () => 0,
  definirPerfilTributario: () => {},
  contarTransacoesDaCategoria: () => 0,
  removerCategoria: () => {},
  renomearCategoria: () => {},
};

export const transacoesRepository = {
  listarTransacoes: (filtro: { mes?: string; tipo?: string } = {}) =>
    banco.transacoes.filter((t) => (!filtro.mes || t.data.startsWith(filtro.mes)) && (!filtro.tipo || t.tipo === filtro.tipo)),
  buscarTransacao: (id: number) => banco.transacoes.find((t) => t.id === id) ?? null,
  buscarTransacaoPorChaveNota: (chave: string) => banco.transacoes.find((t) => t.chaveNota === chave) ?? null,
};

export const notasRepository = {
  buscarNotaDaTransacao: (id: number) => banco.notas.get(id) ?? null,
  gravarNotaDaTransacao: (id: number, nota: NotaSalva) => banco.notas.set(id, nota),
  listarItensDoMes: (mes: string) =>
    new Map(
      [...banco.notas.entries()]
        .filter(([id]) => banco.transacoes.find((t) => t.id === id)?.data.startsWith(mes))
        .map(([id, nota]) => [id, nota.itens]),
    ),
};

export const impostosFixosRepository = {
  buscarImpostosFixos: () => banco.fixos,
  gravarImpostosFixos: (f: ImpostosFixos) => {
    banco.fixos = f;
  },
  removerImpostosFixos: () => {
    banco.fixos = null;
  },
};

export const classificacaoRepository = {
  listarClassificacoes: () => new Map(banco.classificacoes),
  gravarClassificacao: (nome: string, tipo: string) => {
    banco.classificacoes.set(nome, tipo);
    jest.requireActual<typeof import('@/data/database')>('@/data/database').notificarMudanca();
  },
  removerClassificacao: (nome: string) => {
    banco.classificacoes.delete(nome);
    jest.requireActual<typeof import('@/data/database')>('@/data/database').notificarMudanca();
  },
};

export const perfilFinanceiroService = {
  obterPerfil: () => banco.perfil,
};
