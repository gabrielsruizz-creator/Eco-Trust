import { perfilTributarioValido, type PerfilTributarioId } from '@/data/carga-tributaria';
import { getBanco, notificarMudanca } from '@/data/database';
import type { Categoria, TipoTransacao } from '@/types/financas';

type LinhaCategoria = {
  id: number;
  nome: string;
  tipo: TipoTransacao;
  padrao: number;
  perfil_tributario: string | null;
};

function paraCategoria(linha: LinhaCategoria): Categoria {
  return {
    id: linha.id,
    nome: linha.nome,
    tipo: linha.tipo,
    padrao: linha.padrao === 1,
    perfilTributario: perfilTributarioValido(linha.perfil_tributario) ? linha.perfil_tributario : null,
  };
}

const COLUNAS = 'id, nome, tipo, padrao, perfil_tributario';

/** "Outros" (padrão) sempre por último, para as categorias criadas pelo usuário aparecerem antes dele. */
const ORDEM = `CASE WHEN padrao = 1 AND nome = 'Outros' THEN 1 ELSE 0 END, ordem, nome`;

export function listarCategorias(tipo?: TipoTransacao): Categoria[] {
  const linhas = tipo
    ? getBanco().getAllSync<LinhaCategoria>(
        `SELECT ${COLUNAS} FROM categorias WHERE tipo = ? ORDER BY ${ORDEM}`,
        tipo,
      )
    : getBanco().getAllSync<LinhaCategoria>(
        `SELECT ${COLUNAS} FROM categorias ORDER BY tipo, ${ORDEM}`,
      );
  return linhas.map(paraCategoria);
}

export function buscarCategoria(id: number): Categoria | null {
  const linha = getBanco().getFirstSync<LinhaCategoria>(
    `SELECT ${COLUNAS} FROM categorias WHERE id = ?`,
    id,
  );
  return linha ? paraCategoria(linha) : null;
}

export function criarCategoria(nome: string, tipo: TipoTransacao): number {
  const resultado = getBanco().runSync(
    `INSERT INTO categorias (nome, tipo, padrao, ordem)
     VALUES (?, ?, 0, (SELECT COALESCE(MAX(ordem), 0) + 1 FROM categorias WHERE tipo = ?))`,
    nome,
    tipo,
    tipo,
  );
  notificarMudanca();
  return resultado.lastInsertRowId;
}

export function renomearCategoria(id: number, nome: string) {
  getBanco().runSync('UPDATE categorias SET nome = ? WHERE id = ?', nome, id);
  notificarMudanca();
}

export function definirPerfilTributario(id: number, perfil: PerfilTributarioId) {
  getBanco().runSync('UPDATE categorias SET perfil_tributario = ? WHERE id = ?', perfil, id);
  notificarMudanca();
}

export function contarTransacoesDaCategoria(id: number): number {
  return (
    getBanco().getFirstSync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM transacoes WHERE categoria_id = ?',
      id,
    )?.n ?? 0
  );
}

export function removerCategoria(id: number) {
  getBanco().runSync('DELETE FROM categorias WHERE id = ?', id);
  notificarMudanca();
}
