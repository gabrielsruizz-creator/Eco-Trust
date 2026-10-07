import { getBanco, notificarMudanca } from '@/data/database';

export type AulaConcluida = { aulaId: string; cursoId: string; acertouQuiz: boolean; concluidaEm: string };

export function listarMeusCursos(): { cursoId: string; adicionadoEm: string }[] {
  return getBanco()
    .getAllSync<{ curso_id: string; adicionado_em: string }>(
      'SELECT curso_id, adicionado_em FROM academy_meus_cursos ORDER BY adicionado_em DESC',
    )
    .map((r) => ({ cursoId: r.curso_id, adicionadoEm: r.adicionado_em }));
}

/** Não faz nada se o curso já estiver na lista. */
export function adicionarMeuCurso(cursoId: string) {
  const { changes } = getBanco().runSync(
    'INSERT OR IGNORE INTO academy_meus_cursos (curso_id, adicionado_em) VALUES (?, ?)',
    cursoId,
    new Date().toISOString(),
  );
  if (changes > 0) notificarMudanca();
}

export function removerMeuCurso(cursoId: string) {
  getBanco().runSync('DELETE FROM academy_meus_cursos WHERE curso_id = ?', cursoId);
  notificarMudanca();
}

export function listarAulasConcluidas(): AulaConcluida[] {
  return getBanco()
    .getAllSync<{ aula_id: string; curso_id: string; acertou_quiz: number; concluida_em: string }>(
      'SELECT aula_id, curso_id, acertou_quiz, concluida_em FROM academy_aulas_concluidas',
    )
    .map((r) => ({
      aulaId: r.aula_id,
      cursoId: r.curso_id,
      acertouQuiz: r.acertou_quiz === 1,
      concluidaEm: r.concluida_em,
    }));
}

/** Refazer a aula atualiza o resultado da pergunta, mas mantém a data da primeira conclusão. */
export function registrarAulaConcluida(aulaId: string, cursoId: string, acertouQuiz: boolean) {
  getBanco().runSync(
    `INSERT INTO academy_aulas_concluidas (aula_id, curso_id, acertou_quiz, concluida_em) VALUES (?, ?, ?, ?)
     ON CONFLICT (aula_id) DO UPDATE SET acertou_quiz = excluded.acertou_quiz`,
    aulaId,
    cursoId,
    acertouQuiz ? 1 : 0,
    new Date().toISOString(),
  );
  notificarMudanca();
}
