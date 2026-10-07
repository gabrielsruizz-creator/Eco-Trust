import { getBanco, notificarMudanca } from '@/data/database';

export type TopicoForum = {
  id: number;
  categoriaId: string;
  titulo: string;
  texto: string;
  autor: string;
  criadoEm: string;
  exemplo: boolean;
  meu: boolean;
  respostas: number;
  /** Data da última atividade (tópico ou resposta mais recente) */
  ultimaAtividade: string;
};

export type RespostaForum = {
  id: number;
  topicoId: number;
  texto: string;
  autor: string;
  criadoEm: string;
  exemplo: boolean;
  meu: boolean;
};

type LinhaTopico = {
  id: number;
  categoria_id: string;
  titulo: string;
  texto: string;
  autor: string;
  criado_em: string;
  exemplo: number;
  meu: number;
  respostas: number;
  ultima_atividade: string;
};

const SELECT_TOPICOS = `
  SELECT t.*, COUNT(r.id) AS respostas, MAX(t.criado_em, IFNULL(MAX(r.criado_em), '')) AS ultima_atividade
  FROM forum_topicos t LEFT JOIN forum_respostas r ON r.topico_id = t.id`;

function paraTopico(l: LinhaTopico): TopicoForum {
  return {
    id: l.id,
    categoriaId: l.categoria_id,
    titulo: l.titulo,
    texto: l.texto,
    autor: l.autor,
    criadoEm: l.criado_em,
    exemplo: l.exemplo === 1,
    meu: l.meu === 1,
    respostas: l.respostas,
    ultimaAtividade: l.ultima_atividade,
  };
}

/** Tópicos com atividade mais recente primeiro. Sem categoria, lista todos. */
export function listarTopicos(categoriaId: string | null = null): TopicoForum[] {
  const filtro = categoriaId ? 'WHERE t.categoria_id = ?' : '';
  const params = categoriaId ? [categoriaId] : [];
  return getBanco()
    .getAllSync<LinhaTopico>(`${SELECT_TOPICOS} ${filtro} GROUP BY t.id ORDER BY ultima_atividade DESC, t.id DESC`, ...params)
    .map(paraTopico);
}

export function buscarTopico(id: number): TopicoForum | null {
  const l = getBanco().getFirstSync<LinhaTopico>(`${SELECT_TOPICOS} WHERE t.id = ? GROUP BY t.id`, id);
  return l ? paraTopico(l) : null;
}

export function contarTopicos(): number {
  return getBanco().getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM forum_topicos')?.n ?? 0;
}

export function listarRespostas(topicoId: number): RespostaForum[] {
  return getBanco()
    .getAllSync<{ id: number; topico_id: number; texto: string; autor: string; criado_em: string; exemplo: number; meu: number }>(
      'SELECT * FROM forum_respostas WHERE topico_id = ? ORDER BY criado_em, id',
      topicoId,
    )
    .map((r) => ({
      id: r.id,
      topicoId: r.topico_id,
      texto: r.texto,
      autor: r.autor,
      criadoEm: r.criado_em,
      exemplo: r.exemplo === 1,
      meu: r.meu === 1,
    }));
}

export function inserirTopico(t: { categoriaId: string; titulo: string; texto: string; autor: string }): number {
  const { lastInsertRowId } = getBanco().runSync(
    'INSERT INTO forum_topicos (categoria_id, titulo, texto, autor, criado_em, meu) VALUES (?, ?, ?, ?, ?, 1)',
    t.categoriaId,
    t.titulo,
    t.texto,
    t.autor,
    new Date().toISOString(),
  );
  notificarMudanca();
  return lastInsertRowId;
}

export function inserirResposta(r: { topicoId: number; texto: string; autor: string }): number {
  const { lastInsertRowId } = getBanco().runSync(
    'INSERT INTO forum_respostas (topico_id, texto, autor, criado_em, meu) VALUES (?, ?, ?, ?, 1)',
    r.topicoId,
    r.texto,
    r.autor,
    new Date().toISOString(),
  );
  notificarMudanca();
  return lastInsertRowId;
}

/** Só apaga o que é do próprio usuário (meu = 1). Devolve se apagou. */
export function apagarTopicoMeu(id: number): boolean {
  const { changes } = getBanco().runSync('DELETE FROM forum_topicos WHERE id = ? AND meu = 1', id);
  if (changes > 0) notificarMudanca();
  return changes > 0;
}

export function apagarRespostaMinha(id: number): boolean {
  const { changes } = getBanco().runSync('DELETE FROM forum_respostas WHERE id = ? AND meu = 1', id);
  if (changes > 0) notificarMudanca();
  return changes > 0;
}
