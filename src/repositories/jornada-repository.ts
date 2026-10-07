/** Dados da jornada (gamificação): contagens de hábitos, conquistas alcançadas e histórico da saúde. */

import { getBanco, notificarMudanca } from '@/data/database';

/** Momentos (ISO) em que cada lançamento foi registrado no app. */
export function listarMomentosDeRegistro(): string[] {
  return getBanco()
    .getAllSync<{ criado_em: string }>('SELECT criado_em FROM transacoes')
    .map((l) => l.criado_em);
}

export function contarDepositosEmMetas(): number {
  return (
    getBanco().getFirstSync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM metas_movimentos WHERE tipo = 'deposito'",
    )?.n ?? 0
  );
}

export function contarOrcamentos(): number {
  return getBanco().getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM orcamentos')?.n ?? 0;
}

export function listarConquistasAlcancadas(): Map<string, string> {
  const linhas = getBanco().getAllSync<{ id: string; alcancada_em: string }>(
    'SELECT id, alcancada_em FROM conquistas',
  );
  return new Map(linhas.map((l) => [l.id, l.alcancada_em]));
}

/** Registra conquistas novas (as que já existem são ignoradas). Avisa as telas só se algo mudou. */
export function registrarConquistas(ids: string[]) {
  if (ids.length === 0) return;
  const agora = new Date().toISOString();
  const banco = getBanco();
  banco.withTransactionSync(() => {
    for (const id of ids) {
      banco.runSync('INSERT OR IGNORE INTO conquistas (id, alcancada_em) VALUES (?, ?)', id, agora);
    }
  });
  notificarMudanca();
}

export type PontoHistoricoSaude = {
  mes: string;
  nota: number;
  /** Pontos de cada fator naquele mês (id do fator → pontos), se conhecidos */
  fatores: Record<string, number> | null;
  /** true quando o mês foi calculado depois, a partir dos lançamentos */
  estimado: boolean;
};

export function listarHistoricoSaude(): PontoHistoricoSaude[] {
  return getBanco()
    .getAllSync<{ mes: string; nota: number; fatores: string | null; estimado: number }>(
      'SELECT mes, nota, fatores, estimado FROM saude_historico ORDER BY mes',
    )
    .map((l) => ({
      mes: l.mes,
      nota: l.nota,
      fatores: l.fatores ? (JSON.parse(l.fatores) as Record<string, number>) : null,
      estimado: l.estimado === 1,
    }));
}

/**
 * Guarda a nota do mês. Um mês estimado nunca sobrescreve um mês real.
 * Retorna true se mudou (para avisar as telas só quando necessário).
 */
export function salvarNotaDoMes(mes: string, nota: number, fatores: Record<string, number>, estimado = false): boolean {
  const atual = getBanco().getFirstSync<{ nota: number; fatores: string | null; estimado: number }>(
    'SELECT nota, fatores, estimado FROM saude_historico WHERE mes = ?',
    mes,
  );
  const fatoresJson = JSON.stringify(fatores);
  if (atual && estimado && atual.estimado === 0) return false;
  if (atual && atual.nota === nota && atual.fatores === fatoresJson && (atual.estimado === 1) === estimado) return false;
  getBanco().runSync(
    `INSERT INTO saude_historico (mes, nota, fatores, estimado, atualizado_em) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (mes) DO UPDATE SET nota = excluded.nota, fatores = excluded.fatores,
       estimado = excluded.estimado, atualizado_em = excluded.atualizado_em`,
    mes,
    nota,
    fatoresJson,
    estimado ? 1 : 0,
    new Date().toISOString(),
  );
  notificarMudanca();
  return true;
}
