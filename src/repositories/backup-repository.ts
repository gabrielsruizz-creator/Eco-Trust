/**
 * Cópia de todas as tabelas do banco (para o backup) e restauração a partir dela.
 * O conteúdo de um backup vem de um arquivo que pode ter sido alterado: só usamos nomes de tabela e
 * coluna que existem no banco atual e só aceitamos valores simples (texto, número ou vazio).
 */

import { getBanco, notificarMudanca } from '@/data/database';

export type ValorSimples = string | number | null;
export type Tabelas = Record<string, Record<string, ValorSimples>[]>;

/** O plano de assinatura e a data do último backup são deste aparelho: não vão no backup nem são trocados. */
const CONFIGURACOES_DO_APARELHO = ['plano', 'plano_ativado_em', 'ultimo_backup'];

function tabelasDoBanco(): string[] {
  return getBanco()
    .getAllSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .map((t) => t.name);
}

function colunas(tabela: string): string[] {
  return getBanco()
    .getAllSync<{ name: string }>(`PRAGMA table_info("${tabela}")`)
    .map((c) => c.name);
}

export function versaoDoBanco(): number {
  return getBanco().getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
}

export function lerTodasAsTabelas(): Tabelas {
  const db = getBanco();
  const tabelas: Tabelas = {};
  for (const tabela of tabelasDoBanco()) {
    const linhas = db.getAllSync<Record<string, ValorSimples>>(`SELECT * FROM "${tabela}"`);
    tabelas[tabela] =
      tabela === 'configuracoes' ? linhas.filter((l) => !CONFIGURACOES_DO_APARELHO.includes(String(l.chave))) : linhas;
  }
  return tabelas;
}

/** Apaga os dados atuais e grava os do backup, tudo de uma vez (se algo falhar, nada muda). */
export function substituirTodasAsTabelas(backup: Tabelas) {
  const db = getBanco();
  const existentes = tabelasDoBanco();
  // As chaves estrangeiras são conferidas no fim; durante a cópia a ordem das tabelas não importa.
  db.execSync('PRAGMA foreign_keys = OFF');
  try {
    db.withTransactionSync(() => {
      for (const tabela of existentes) {
        if (tabela === 'configuracoes') {
          const marcadores = CONFIGURACOES_DO_APARELHO.map(() => '?').join(', ');
          db.runSync(`DELETE FROM configuracoes WHERE chave NOT IN (${marcadores})`, CONFIGURACOES_DO_APARELHO);
        } else {
          db.runSync(`DELETE FROM "${tabela}"`);
        }
      }
      for (const tabela of existentes) {
        const permitidas = new Set(colunas(tabela));
        for (const linha of backup[tabela] ?? []) {
          if (tabela === 'configuracoes' && CONFIGURACOES_DO_APARELHO.includes(String(linha.chave))) continue;
          const nomes = Object.keys(linha).filter((c) => permitidas.has(c));
          if (nomes.length === 0) continue;
          db.runSync(
            `INSERT INTO "${tabela}" (${nomes.map((c) => `"${c}"`).join(', ')}) VALUES (${nomes.map(() => '?').join(', ')})`,
            nomes.map((c) => linha[c]),
          );
        }
      }
      const problemas = db.getAllSync('PRAGMA foreign_key_check');
      if (problemas.length > 0) throw new Error('Backup com dados inconsistentes.');
    });
  } finally {
    db.execSync('PRAGMA foreign_keys = ON');
  }
  notificarMudanca();
}
