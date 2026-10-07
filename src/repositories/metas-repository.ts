import { getBanco, notificarMudanca } from '@/data/database';
import type { Meta, MovimentoMeta, TipoMovimentoMeta } from '@/types/financas';

type LinhaMeta = {
  id: number;
  nome: string;
  objetivo_centavos: number;
  prazo: string | null;
  criado_em: string;
  atual: number;
};

const SELECT_META = `
  SELECT m.id, m.nome, m.objetivo_centavos, m.prazo, m.criado_em,
         COALESCE(SUM(CASE WHEN mv.tipo = 'retirada' THEN -mv.valor_centavos ELSE mv.valor_centavos END), 0) AS atual
  FROM metas m
  LEFT JOIN metas_movimentos mv ON mv.meta_id = m.id`;

function paraMeta(l: LinhaMeta): Meta {
  return {
    id: l.id,
    nome: l.nome,
    objetivoCentavos: l.objetivo_centavos,
    atualCentavos: l.atual,
    prazo: l.prazo,
    criadoEm: l.criado_em,
  };
}

export function listarMetas(): Meta[] {
  return getBanco()
    .getAllSync<LinhaMeta>(`${SELECT_META} GROUP BY m.id ORDER BY m.criado_em, m.id`)
    .map(paraMeta);
}

export function buscarMeta(id: number): Meta | null {
  const linha = getBanco().getFirstSync<LinhaMeta>(`${SELECT_META} WHERE m.id = ? GROUP BY m.id`, id);
  return linha ? paraMeta(linha) : null;
}

/** Cria a meta e, se houver, o valor já guardado (movimento "inicial"). Devolve o id. */
export function criarMeta(
  dados: { nome: string; objetivoCentavos: number; prazo: string | null },
  valorInicialCentavos: number,
  data: string,
): number {
  const banco = getBanco();
  const agora = new Date().toISOString();
  let id = 0;
  banco.withTransactionSync(() => {
    id = banco.runSync(
      'INSERT INTO metas (nome, objetivo_centavos, prazo, criado_em) VALUES (?, ?, ?, ?)',
      dados.nome,
      dados.objetivoCentavos,
      dados.prazo,
      agora,
    ).lastInsertRowId;
    if (valorInicialCentavos > 0) {
      banco.runSync(
        `INSERT INTO metas_movimentos (meta_id, tipo, valor_centavos, data, criado_em)
         VALUES (?, 'inicial', ?, ?, ?)`,
        id,
        valorInicialCentavos,
        data,
        agora,
      );
    }
  });
  notificarMudanca();
  return id;
}

export function atualizarMeta(
  id: number,
  dados: { nome: string; objetivoCentavos: number; prazo: string | null },
): boolean {
  const resultado = getBanco().runSync(
    'UPDATE metas SET nome = ?, objetivo_centavos = ?, prazo = ? WHERE id = ?',
    dados.nome,
    dados.objetivoCentavos,
    dados.prazo,
    id,
  );
  notificarMudanca();
  return resultado.changes > 0;
}

export function removerMeta(id: number) {
  getBanco().runSync('DELETE FROM metas WHERE id = ?', id);
  notificarMudanca();
}

export function criarMovimento(metaId: number, tipo: TipoMovimentoMeta, valorCentavos: number, data: string) {
  getBanco().runSync(
    'INSERT INTO metas_movimentos (meta_id, tipo, valor_centavos, data, criado_em) VALUES (?, ?, ?, ?, ?)',
    metaId,
    tipo,
    valorCentavos,
    data,
    new Date().toISOString(),
  );
  notificarMudanca();
}

/** Movimentos da meta, do mais recente para o mais antigo. */
export function listarMovimentos(metaId: number): MovimentoMeta[] {
  return getBanco()
    .getAllSync<{ id: number; tipo: TipoMovimentoMeta; valor_centavos: number; data: string }>(
      'SELECT id, tipo, valor_centavos, data FROM metas_movimentos WHERE meta_id = ? ORDER BY data DESC, id DESC',
      metaId,
    )
    .map((l) => ({ id: l.id, tipo: l.tipo, valorCentavos: l.valor_centavos, data: l.data }));
}
