import { getBanco, notificarMudanca } from '@/data/database';
import type { FiltroTransacoes, NovaTransacao, TipoTransacao, Transacao } from '@/types/financas';

type LinhaTransacao = {
  id: number;
  tipo: TipoTransacao;
  valor_centavos: number;
  descricao: string;
  categoria_id: number;
  categoria_nome: string;
  data: string;
  recorrente: number;
};

const SELECT_TRANSACAO = `
  SELECT t.id, t.tipo, t.valor_centavos, t.descricao, t.categoria_id, c.nome AS categoria_nome,
         t.data, t.recorrente
  FROM transacoes t
  JOIN categorias c ON c.id = t.categoria_id`;

function paraTransacao(l: LinhaTransacao): Transacao {
  return {
    id: l.id,
    tipo: l.tipo,
    valorCentavos: l.valor_centavos,
    descricao: l.descricao,
    categoriaId: l.categoria_id,
    categoriaNome: l.categoria_nome,
    data: l.data,
    recorrente: l.recorrente === 1,
  };
}

export function buscarTransacao(id: number): Transacao | null {
  const linha = getBanco().getFirstSync<LinhaTransacao>(`${SELECT_TRANSACAO} WHERE t.id = ?`, id);
  return linha ? paraTransacao(linha) : null;
}

/** Lista transações, das mais recentes para as mais antigas. */
export function listarTransacoes(filtro: FiltroTransacoes = {}): Transacao[] {
  const condicoes: string[] = [];
  const parametros: (string | number)[] = [];

  if (filtro.mes) {
    condicoes.push('t.data BETWEEN ? AND ?');
    parametros.push(`${filtro.mes}-01`, `${filtro.mes}-31`);
  }
  if (filtro.tipo) {
    condicoes.push('t.tipo = ?');
    parametros.push(filtro.tipo);
  }
  if (filtro.categoriaId !== undefined) {
    condicoes.push('t.categoria_id = ?');
    parametros.push(filtro.categoriaId);
  }

  const where = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';
  const linhas = getBanco().getAllSync<LinhaTransacao>(
    `${SELECT_TRANSACAO} ${where} ORDER BY t.data DESC, t.id DESC`,
    parametros,
  );
  return linhas.map(paraTransacao);
}

/** Soma de todas as receitas e despesas já registradas (sem filtro de data). */
export function somarTotaisGerais(): { receitasCentavos: number; despesasCentavos: number } {
  const linha = getBanco().getFirstSync<{ receitas: number | null; despesas: number | null }>(
    `SELECT
       SUM(CASE WHEN tipo = 'receita' THEN valor_centavos ELSE 0 END) AS receitas,
       SUM(CASE WHEN tipo = 'despesa' THEN valor_centavos ELSE 0 END) AS despesas
     FROM transacoes`,
  );
  return { receitasCentavos: linha?.receitas ?? 0, despesasCentavos: linha?.despesas ?? 0 };
}

/** Receitas e despesas registradas até uma data (inclusive), para o saldo acumulado de um mês passado. */
export function somarTotaisAte(data: string): { receitasCentavos: number; despesasCentavos: number } {
  const linha = getBanco().getFirstSync<{ receitas: number | null; despesas: number | null }>(
    `SELECT
       SUM(CASE WHEN tipo = 'receita' THEN valor_centavos ELSE 0 END) AS receitas,
       SUM(CASE WHEN tipo = 'despesa' THEN valor_centavos ELSE 0 END) AS despesas
     FROM transacoes WHERE data <= ?`,
    data,
  );
  return { receitasCentavos: linha?.receitas ?? 0, despesasCentavos: linha?.despesas ?? 0 };
}

/** Dias (AAAA-MM-DD) que têm pelo menos um lançamento, para marcar no calendário. */
export function listarDiasComLancamentos(): string[] {
  return getBanco()
    .getAllSync<{ data: string }>('SELECT DISTINCT data FROM transacoes ORDER BY data')
    .map((l) => l.data);
}

export function criarTransacao(nova: NovaTransacao): number {
  const resultado = getBanco().runSync(
    `INSERT INTO transacoes (tipo, valor_centavos, descricao, categoria_id, data, recorrente, criado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    nova.tipo,
    nova.valorCentavos,
    nova.descricao,
    nova.categoriaId,
    nova.data,
    nova.recorrente ? 1 : 0,
    new Date().toISOString(),
  );
  notificarMudanca();
  return resultado.lastInsertRowId;
}

/** Retorna false se a transação não existe mais. */
export function atualizarTransacao(id: number, dados: NovaTransacao): boolean {
  const resultado = getBanco().runSync(
    `UPDATE transacoes
     SET tipo = ?, valor_centavos = ?, descricao = ?, categoria_id = ?, data = ?, recorrente = ?
     WHERE id = ?`,
    dados.tipo,
    dados.valorCentavos,
    dados.descricao,
    dados.categoriaId,
    dados.data,
    dados.recorrente ? 1 : 0,
    id,
  );
  notificarMudanca();
  return resultado.changes > 0;
}

export function removerTransacao(id: number) {
  getBanco().runSync('DELETE FROM transacoes WHERE id = ?', id);
  notificarMudanca();
}
