/**
 * Classificação de produtos que aprende: o usuário corrige o tipo de um item da nota ("QUEIJO" é
 * laticínio) e o app usa essa escolha em todas as notas, antigas e novas.
 */

import { assinarMudancas } from '@/data/database';
import {
  chaveNomeProduto,
  escolhaDoUsuario,
  tipoProduto,
  usarEscolhasDeProduto,
  type EscolhaProduto,
} from '@/data/carga-tributaria';
import { gravarClassificacao, listarClassificacoes, removerClassificacao } from '@/repositories/classificacao-repository';
import { ErroValidacao } from '@/services/erros';

let carregadas = false;
// Qualquer escrita no banco (inclusive restaurar um backup) faz recarregar as escolhas.
assinarMudancas(() => {
  carregadas = false;
});

/** Garante que as contas usem as escolhas gravadas. Chame antes de calcular impostos de itens. */
export function carregarClassificacoes() {
  if (carregadas) return;
  usarEscolhasDeProduto(listarClassificacoes());
  carregadas = true;
}

/** Grava o tipo de um produto (null = esquece a escolha e volta ao palpite do app). */
export function classificarProduto(descricao: string, escolha: EscolhaProduto | null) {
  const nome = chaveNomeProduto(descricao);
  if (!nome) throw new ErroValidacao('Produto sem nome.');
  if (escolha === null) removerClassificacao(nome);
  else if (escolha === 'categoria' || tipoProduto(escolha)) gravarClassificacao(nome, escolha);
  else throw new ErroValidacao('Tipo de produto inválido.');
}

export function obterEscolhaDoProduto(descricao: string): EscolhaProduto | null {
  carregarClassificacoes();
  return escolhaDoUsuario(descricao);
}
