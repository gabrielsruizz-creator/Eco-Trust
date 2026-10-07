/**
 * Trust Academy: cursos (com progresso), categorias, conteúdos recentes e recomendações.
 * As funções "calcular..." e "recomendar..." são puras; "obter..." juntam os dados do banco.
 */

import {
  AULAS,
  CATEGORIAS_ACADEMY,
  CONCEITOS,
  CURSOS,
  DICAS,
  type Aula,
  type CategoriaAcademy,
  type Curso,
} from '@/data/academy-conteudo';
import {
  adicionarMeuCurso,
  listarAulasConcluidas,
  listarMeusCursos,
  registrarAulaConcluida,
  removerMeuCurso,
  type AulaConcluida,
} from '@/repositories/academy-repository';
import { contarTopicos } from '@/repositories/forum-repository';
import { obterPerfilFinanceiro } from '@/repositories/perfil-financeiro-repository';
import { ErroValidacao } from '@/services/erros';
import { obterMetas } from '@/services/metas-service';
import { obterSaude, type FatorSaude } from '@/services/saude-service';
import type { PerfilFinanceiro, ProgressoMeta } from '@/types/financas';
import { diasEntre, hoje } from '@/utils/datas';

const MAX_RECENTES = 4;

export type ProgressoCurso = {
  curso: Curso;
  categoria: CategoriaAcademy;
  aulas: Aula[];
  concluidas: number;
  total: number;
  /** De 0 a 100 */
  percentual: number;
  concluido: boolean;
  /** Primeira aula ainda não concluída (ou a primeira, se o curso já terminou) */
  proximaAula: Aula;
  noMeusCursos: boolean;
};

export type ResumoCategoria = CategoriaAcademy & { cursos: number; aulas: number };

export type AulaRecente = { aula: Aula; curso: Curso; categoria: CategoriaAcademy; concluida: boolean };

export type Recomendacao = { curso: Curso; aula: Aula; motivo: string };

export type EntradaRecomendacao = {
  fatores: FatorSaude[];
  perfil: PerfilFinanceiro | null;
  metas: ProgressoMeta[];
};

export function buscarAula(id: string): Aula | null {
  return AULAS.find((a) => a.id === id) ?? null;
}

export function buscarCurso(id: string): Curso | null {
  return CURSOS.find((c) => c.id === id) ?? null;
}

export function buscarCategoria(id: string): CategoriaAcademy | null {
  return CATEGORIAS_ACADEMY.find((c) => c.id === id) ?? null;
}

/** Curso ao qual a aula pertence (cada aula está em um curso só). */
export function cursoDaAula(aulaId: string): Curso | null {
  return CURSOS.find((c) => c.aulas.includes(aulaId)) ?? null;
}

function aulasDoCurso(curso: Curso): Aula[] {
  return curso.aulas.map(buscarAula).filter((a): a is Aula => a !== null);
}

export function calcularProgressoCurso(
  curso: Curso,
  concluidas: Set<string>,
  meusCursos: Set<string>,
): ProgressoCurso {
  const aulas = aulasDoCurso(curso);
  const feitas = aulas.filter((a) => concluidas.has(a.id)).length;
  const total = aulas.length;
  return {
    curso,
    categoria: buscarCategoria(curso.categoriaId) ?? CATEGORIAS_ACADEMY[0],
    aulas,
    concluidas: feitas,
    total,
    percentual: total === 0 ? 0 : Math.round((feitas / total) * 100),
    concluido: total > 0 && feitas === total,
    proximaAula: aulas.find((a) => !concluidas.has(a.id)) ?? aulas[0],
    noMeusCursos: meusCursos.has(curso.id),
  };
}

export function resumirCategorias(): ResumoCategoria[] {
  return CATEGORIAS_ACADEMY.map((c) => {
    const cursos = CURSOS.filter((curso) => curso.categoriaId === c.id);
    return { ...c, cursos: cursos.length, aulas: cursos.reduce((soma, curso) => soma + curso.aulas.length, 0) };
  });
}

/** As aulas publicadas mais recentemente (as mais novas primeiro). */
export function listarRecentes(concluidas: Set<string>, limite = MAX_RECENTES): AulaRecente[] {
  return [...AULAS]
    .sort((a, b) => b.publicadaEm.localeCompare(a.publicadaEm))
    .flatMap((aula) => {
      const curso = cursoDaAula(aula.id);
      const categoria = curso && buscarCategoria(curso.categoriaId);
      return curso && categoria ? [{ aula, curso, categoria, concluida: concluidas.has(aula.id) }] : [];
    })
    .slice(0, limite);
}

/** Até `limite` cursos sugeridos, do mais urgente para o menos, cada um com o motivo. */
export function recomendarCursos({ fatores, perfil, metas }: EntradaRecomendacao, limite = 2): Recomendacao[] {
  const fator = (id: FatorSaude['id']) => fatores.find((f) => f.id === id);
  const regras: [string, boolean, string][] = [
    [
      'sair-das-dividas',
      perfil?.objetivo === 'dividas' || fator('poupanca')?.resumo === 'Gastando mais do que ganha',
      perfil?.objetivo === 'dividas' ? 'Seu objetivo é sair das dívidas.' : 'Você está gastando mais do que ganha.',
    ],
    [
      'reserva-emergencia',
      !metas.some((m) => m.nome.toLocaleLowerCase('pt-BR').includes('reserva') && m.concluida),
      'Você ainda não tem uma reserva de emergência completa.',
    ],
    ['gastos-superfluos', fator('nao-essenciais')?.situacao !== undefined && fator('nao-essenciais')?.situacao !== 'bom', 'Seus gastos não essenciais estão altos.'],
    ['gastos-recorrentes', fator('fixas')?.situacao !== undefined && fator('fixas')?.situacao !== 'bom', 'Suas despesas fixas pesam na renda.'],
    ['regra-50-30-20', fator('orcamento')?.resumo === 'Sem orçamento definido', 'Um bom ponto de partida para o seu primeiro orçamento.'],
    ['metas-financeiras', metas.length === 0, 'Você ainda não tem metas.'],
    ['primeiros-investimentos', perfil?.objetivo === 'investir', 'Seu objetivo é começar a investir.'],
  ];

  const recomendados: Recomendacao[] = [];
  for (const [aulaId, vale, motivo] of regras) {
    const aula = buscarAula(aulaId);
    const curso = cursoDaAula(aulaId);
    // Um curso aparece uma vez só, com o motivo mais urgente.
    if (vale && aula && curso && !recomendados.some((r) => r.curso.id === curso.id)) {
      recomendados.push({ curso, aula, motivo });
    }
    if (recomendados.length === limite) break;
  }
  return recomendados;
}

/** Uma dica diferente a cada dia (a mesma durante o dia todo). */
export function dicaDoDia(data = hoje()) {
  const diaDoAno = diasEntre(`${data.slice(0, 4)}-01-01`, data);
  return DICAS[diaDoAno % DICAS.length];
}

function lerProgresso() {
  const registros = listarAulasConcluidas();
  return {
    registros,
    concluidas: new Set(registros.map((r) => r.aulaId)),
    meus: listarMeusCursos(),
  };
}

export function obterAcademy() {
  const { concluidas, meus } = lerProgresso();
  const meusIds = new Set(meus.map((m) => m.cursoId));
  const meusCursos = meus
    .map((m) => buscarCurso(m.cursoId))
    .filter((c): c is Curso => c !== null)
    .map((c) => calcularProgressoCurso(c, concluidas, meusIds))
    // Em andamento primeiro; concluídos vão para o fim.
    .sort((a, b) => Number(a.concluido) - Number(b.concluido));

  return {
    meusCursos,
    categorias: resumirCategorias(),
    recentes: listarRecentes(concluidas),
    recomendados: recomendarCursos({
      fatores: obterSaude().fatores,
      perfil: obterPerfilFinanceiro(),
      metas: obterMetas(),
    }).filter((r) => !meusIds.has(r.curso.id)),
    dica: dicaDoDia(),
    totalTopicos: contarTopicos(),
    totalConceitos: CONCEITOS.length,
  };
}

export function obterCursosDaCategoria(categoriaId: string) {
  const categoria = buscarCategoria(categoriaId);
  if (!categoria) return null;
  const { concluidas, meus } = lerProgresso();
  const meusIds = new Set(meus.map((m) => m.cursoId));
  return {
    categoria,
    cursos: CURSOS.filter((c) => c.categoriaId === categoriaId).map((c) =>
      calcularProgressoCurso(c, concluidas, meusIds),
    ),
  };
}

export function obterCurso(id: string) {
  const curso = buscarCurso(id);
  if (!curso) return null;
  const { concluidas, meus } = lerProgresso();
  return {
    progresso: calcularProgressoCurso(curso, concluidas, new Set(meus.map((m) => m.cursoId))),
    concluidas,
  };
}

export type DadosAula = {
  aula: Aula;
  curso: Curso;
  categoria: CategoriaAcademy;
  /** Posição na ordem do curso, começando em 1 */
  numero: number;
  total: number;
  proxima: Aula | null;
  registro: AulaConcluida | null;
};

export function obterAula(id: string): DadosAula | null {
  const aula = buscarAula(id);
  const curso = cursoDaAula(id);
  const categoria = curso && buscarCategoria(curso.categoriaId);
  if (!aula || !curso || !categoria) return null;
  const indice = curso.aulas.indexOf(id);
  const proximaId = curso.aulas[indice + 1];
  return {
    aula,
    curso,
    categoria,
    numero: indice + 1,
    total: curso.aulas.length,
    proxima: proximaId ? buscarAula(proximaId) : null,
    registro: listarAulasConcluidas().find((r) => r.aulaId === id) ?? null,
  };
}

export function adicionarAosMeusCursos(cursoId: string) {
  if (!buscarCurso(cursoId)) throw new ErroValidacao('Curso não encontrado.');
  adicionarMeuCurso(cursoId);
}

export function removerDosMeusCursos(cursoId: string) {
  removerMeuCurso(cursoId);
}

/**
 * Conclui a aula depois de respondida a pergunta de fixação.
 * O curso entra em "Meus cursos" automaticamente. Devolve se a resposta estava certa.
 */
export function concluirAula(aulaId: string, respostaEscolhida: number): boolean {
  const aula = buscarAula(aulaId);
  const curso = cursoDaAula(aulaId);
  if (!aula || !curso) throw new ErroValidacao('Aula não encontrada.');
  if (!Number.isInteger(respostaEscolhida) || respostaEscolhida < 0 || respostaEscolhida >= aula.quiz.opcoes.length) {
    throw new ErroValidacao('Escolha uma resposta para concluir a aula.');
  }
  const acertou = respostaEscolhida === aula.quiz.correta;
  adicionarMeuCurso(curso.id);
  registrarAulaConcluida(aulaId, curso.id, acertou);
  return acertou;
}

/** Para a jornada: quantas aulas e cursos completos o usuário tem. */
export function contarProgressoAcademy() {
  const concluidas = new Set(listarAulasConcluidas().map((r) => r.aulaId));
  return {
    aulasConcluidas: concluidas.size,
    cursosConcluidos: CURSOS.filter((c) => c.aulas.length > 0 && c.aulas.every((a) => concluidas.has(a))).length,
  };
}
