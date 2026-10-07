/**
 * Conexão única com o banco SQLite do app e aviso de mudanças para as telas.
 * Só os repositórios devem usar este módulo.
 */

import { deleteDatabaseSync, openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';

import { executarMigracoes } from '@/data/migracoes';

const NOME_BANCO = 'ecotrust.db';

let banco: SQLiteDatabase | null = null;

export function getBanco(): SQLiteDatabase {
  if (!banco) {
    const novo = openDatabaseSync(NOME_BANCO);
    novo.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    executarMigracoes(novo);
    banco = novo;
  }
  return banco;
}

/**
 * Apaga TODOS os dados financeiros deste aparelho (usado ao excluir a conta).
 * Também remove os dados da primeira versão do app, para eles não serem importados de novo.
 */
export function apagarTodosOsDados() {
  if (banco) {
    banco.closeSync();
    banco = null;
  }
  deleteDatabaseSync(NOME_BANCO);
  for (const chave of ['lancamentos', 'perfil']) {
    try {
      Storage.removeItemSync(chave);
    } catch {
      // Sem dados antigos: nada a remover.
    }
  }
  notificarMudanca();
}

let versaoDados = 0;
const ouvintes = new Set<() => void>();

/** Chamado pelos repositórios depois de qualquer escrita, para as telas recarregarem os dados. */
export function notificarMudanca() {
  versaoDados++;
  ouvintes.forEach((ouvinte) => ouvinte());
}

export function assinarMudancas(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

export function lerVersaoDados() {
  return versaoDados;
}
