/**
 * Categorias: as padrão do EcoTrust são fixas; o usuário pode criar, renomear e excluir as próprias.
 */

import { perfilPorNome, perfilTributarioValido, type PerfilTributarioId } from '@/data/carga-tributaria';
import {
  buscarCategoria,
  contarTransacoesDaCategoria,
  criarCategoria,
  definirPerfilTributario,
  listarCategorias,
  removerCategoria,
  renomearCategoria,
} from '@/repositories/categorias-repository';
import { ErroValidacao } from '@/services/erros';
import type { Categoria, TipoTransacao } from '@/types/financas';

export const MAX_NOME_CATEGORIA = 30;

export function obterCategorias(tipo?: TipoTransacao): Categoria[] {
  return listarCategorias(tipo);
}

/** Tira espaços extras e deixa a primeira letra maiúscula: "  pets  da casa " → "Pets da casa". */
export function normalizarNomeCategoria(nome: string) {
  const limpo = nome.trim().replace(/\s+/g, ' ');
  return limpo.charAt(0).toLocaleUpperCase('pt-BR') + limpo.slice(1);
}

function mesmoNome(a: string, b: string) {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }) === 0;
}

function validarNome(nome: string, tipo: TipoTransacao, ignorarId?: number) {
  const normalizado = normalizarNomeCategoria(nome);
  if (!normalizado) throw new ErroValidacao('Digite o nome da categoria.');
  if (normalizado.length > MAX_NOME_CATEGORIA) {
    throw new ErroValidacao(`Use no máximo ${MAX_NOME_CATEGORIA} letras no nome da categoria.`);
  }
  const existente = listarCategorias(tipo).find((c) => c.id !== ignorarId && mesmoNome(c.nome, normalizado));
  if (existente) {
    throw new ErroValidacao(`Você já tem a categoria "${existente.nome}".`);
  }
  return normalizado;
}

function buscarCategoriaDoUsuario(id: number) {
  const categoria = buscarCategoria(id);
  if (!categoria) throw new ErroValidacao('Esta categoria não existe mais.');
  if (categoria.padrao) throw new ErroValidacao('As categorias padrão do EcoTrust não podem ser alteradas.');
  return categoria;
}

/** Cria uma categoria do usuário e devolve o id. */
export function adicionarCategoria(nome: string, tipo: TipoTransacao): number {
  return criarCategoria(validarNome(nome, tipo), tipo);
}

export function alterarNomeCategoria(id: number, nome: string) {
  const categoria = buscarCategoriaDoUsuario(id);
  renomearCategoria(id, validarNome(nome, categoria.tipo, id));
}

/** Tipo de consumo usado no Impostômetro: o escolhido pelo usuário ou um palpite pelo nome. */
export function perfilTributarioDaCategoria(categoria: Pick<Categoria, 'nome' | 'perfilTributario'>) {
  return categoria.perfilTributario ?? perfilPorNome(categoria.nome);
}

/**
 * Categoria de despesa mais provável para uma loja (ex.: nome do emitente da nota fiscal).
 * Procura uma categoria com o mesmo tipo de consumo, dando preferência às padrão.
 */
export function sugerirCategoriaPorLoja(nomeLoja: string): number | null {
  const perfil = perfilPorNome(nomeLoja);
  if (perfil === 'geral') return null;
  const candidatas = listarCategorias('despesa').filter((c) => perfilTributarioDaCategoria(c) === perfil);
  return (candidatas.find((c) => c.padrao) ?? candidatas[0])?.id ?? null;
}

/** Muda o tipo de consumo de uma categoria de despesa (vale também para as padrão). */
export function alterarPerfilTributario(id: number, perfil: PerfilTributarioId) {
  const categoria = buscarCategoria(id);
  if (!categoria || categoria.tipo !== 'despesa') throw new ErroValidacao('Esta categoria não existe mais.');
  if (!perfilTributarioValido(perfil)) throw new ErroValidacao('Escolha um tipo de consumo válido.');
  definirPerfilTributario(id, perfil);
}

/** Só exclui categorias sem lançamentos, para não perder histórico. */
export function excluirCategoria(id: number) {
  buscarCategoriaDoUsuario(id);
  const quantidade = contarTransacoesDaCategoria(id);
  if (quantidade > 0) {
    throw new ErroValidacao(
      `Esta categoria tem ${quantidade} ${quantidade === 1 ? 'lançamento' : 'lançamentos'}. Mude a categoria deles antes de excluí-la.`,
    );
  }
  removerCategoria(id);
}
