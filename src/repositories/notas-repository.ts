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
  const linha = getBanco().getFirstSync<{ chave: string; url: string | null; emitente: string | null; cpf_na_nota: number | null }>(
    'SELECT chave, url, emitente, cpf_na_nota FROM notas_fiscais WHERE transacao_id = ?',
    transacaoId,
  );
  if (!linha) return null;
  const nota = {
    chave: linha.chave,
    url: linha.url,
    emitente: linha.emitente,
    cpfNaNota: linha.cpf_na_nota === null ? null : linha.cpf_na_nota === 1,
  };
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
      `INSERT INTO notas_fiscais (transacao_id, chave, url, emitente, cpf_na_nota, importada_em) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (transacao_id) DO UPDATE SET
         chave = excluded.chave, url = excluded.url, emitente = excluded.emitente,
         cpf_na_nota = excluded.cpf_na_nota, importada_em = excluded.importada_em`,
      transacaoId,
      nota.chave,
      nota.url,
      nota.emitente,
      nota.cpfNaNota === undefined || nota.cpfNaNota === null ? null : nota.cpfNaNota ? 1 : 0,
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

/** Itens das notas das despesas de um mês, por lançamento (para estimar os impostos produto a produto). */
export function listarItensDoMes(mes: string): Map<number, { descricao: string; valorTotalCentavos: number }[]> {
  const linhas = getBanco().getAllSync<{ transacao_id: number; descricao: string; valor_total_centavos: number }>(
    `SELECT i.transacao_id, i.descricao, i.valor_total_centavos
     FROM itens_nota i JOIN transacoes t ON t.id = i.transacao_id
     WHERE t.data BETWEEN ? AND ?
     ORDER BY i.transacao_id, i.ordem`,
    `${mes}-01`,
    `${mes}-31`,
  );
  const porLancamento = new Map<number, { descricao: string; valorTotalCentavos: number }[]>();
  for (const l of linhas) {
    const itens = porLancamento.get(l.transacao_id) ?? [];
    itens.push({ descricao: l.descricao, valorTotalCentavos: l.valor_total_centavos });
    porLancamento.set(l.transacao_id, itens);
  }
  return porLancamento;
}

/** Estado (código IBGE no começo da chave) e CPF das notas lidas num período. */
export function listarNotasDoPeriodo(inicio: string, fim: string): { chave: string; cpfNaNota: boolean | null }[] {
  return getBanco()
    .getAllSync<{ chave: string; cpf_na_nota: number | null }>(
      `SELECT n.chave, n.cpf_na_nota FROM notas_fiscais n JOIN transacoes t ON t.id = n.transacao_id
       WHERE t.data BETWEEN ? AND ?`,
      inicio,
      fim,
    )
    .map((l) => ({ chave: l.chave, cpfNaNota: l.cpf_na_nota === null ? null : l.cpf_na_nota === 1 }));
}
