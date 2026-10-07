import { getBanco, notificarMudanca } from '@/data/database';

export type Orcamento = {
  /** null = orçamento geral do mês */
  categoriaId: number | null;
  limiteCentavos: number;
};

export function listarOrcamentos(): Orcamento[] {
  return getBanco()
    .getAllSync<{ categoria_id: number | null; limite_centavos: number }>(
      'SELECT categoria_id, limite_centavos FROM orcamentos',
    )
    .map((l) => ({ categoriaId: l.categoria_id, limiteCentavos: l.limite_centavos }));
}

/** Cria ou atualiza o orçamento (geral, quando categoriaId é null). */
export function salvarOrcamento(categoriaId: number | null, limiteCentavos: number) {
  const banco = getBanco();
  const agora = new Date().toISOString();
  banco.withTransactionSync(() => {
    const atualizado = banco.runSync(
      'UPDATE orcamentos SET limite_centavos = ?, atualizado_em = ? WHERE IFNULL(categoria_id, 0) = ?',
      limiteCentavos,
      agora,
      categoriaId ?? 0,
    );
    if (atualizado.changes === 0) {
      banco.runSync(
        'INSERT INTO orcamentos (categoria_id, limite_centavos, criado_em, atualizado_em) VALUES (?, ?, ?, ?)',
        categoriaId,
        limiteCentavos,
        agora,
        agora,
      );
    }
  });
  notificarMudanca();
}

export function removerOrcamento(categoriaId: number | null) {
  getBanco().runSync('DELETE FROM orcamentos WHERE IFNULL(categoria_id, 0) = ?', categoriaId ?? 0);
  notificarMudanca();
}
