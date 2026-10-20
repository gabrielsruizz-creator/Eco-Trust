import { getBanco, notificarMudanca } from '@/data/database';
import type { NotaSalva } from '@/types/financas';

type LinhaItem = {
  descricao: string;
  codigo: string | null;
  quantidade: number;
  unidade: string | null;
  valor_unitario_centavos: number | null;
  valor_total_centavos: number;
};

export function buscarNotaDaTransacao(transacaoId: number): NotaSalva | null {
  const nota = getBanco().getFirstSync<{ chave: string; url: string | null; emitente: string | null }>(
    'SELECT chave, url, emitente FROM notas_fiscais WHERE transacao_id = ?',
    transacaoId,
  );
  if (!nota) return null;
  const itens = getBanco()
    .getAllSync<LinhaItem>(
      `SELECT descricao, codigo, quantidade, unidade, valor_unitario_centavos, valor_total_centavos
       FROM itens_nota WHERE transacao_id = ? ORDER BY ordem`,
      transacaoId,
    )
    .map((l) => ({
      descricao: l.descricao,
      codigo: l.codigo,
      quantidade: l.quantidade,
      unidade: l.unidade,
      valorUnitarioCentavos: l.valor_unitario_centavos,
      valorTotalCentavos: l.valor_total_centavos,
    }));
  return { ...nota, itens };
}

/** Grava (ou substitui) a nota e os itens de um lançamento, tudo de uma vez. */
export function gravarNotaDaTransacao(transacaoId: number, nota: NotaSalva) {
  const db = getBanco();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM itens_nota WHERE transacao_id = ?', transacaoId);
    db.runSync(
      `INSERT INTO notas_fiscais (transacao_id, chave, url, emitente, importada_em) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (transacao_id) DO UPDATE SET
         chave = excluded.chave, url = excluded.url, emitente = excluded.emitente, importada_em = excluded.importada_em`,
      transacaoId,
      nota.chave,
      nota.url,
      nota.emitente,
      new Date().toISOString(),
    );
    nota.itens.forEach((item, ordem) => {
      db.runSync(
        `INSERT INTO itens_nota (transacao_id, ordem, descricao, codigo, quantidade, unidade,
           valor_unitario_centavos, valor_total_centavos)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        transacaoId,
        ordem,
        item.descricao,
        item.codigo,
        item.quantidade,
        item.unidade,
        item.valorUnitarioCentavos,
        item.valorTotalCentavos,
      );
    });
  });
  notificarMudanca();
}
