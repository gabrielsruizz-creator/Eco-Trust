/**
 * Regras para criar, editar e remover transações. As telas chamam este serviço, nunca o repositório direto.
 */

import { buscarCategoria } from '@/repositories/categorias-repository';
import {
  atualizarTransacao,
  buscarTransacao,
  criarTransacao,
  listarDiasComLancamentos,
  listarTransacoes,
  removerTransacao,
} from '@/repositories/transacoes-repository';
import { ErroValidacao } from '@/services/erros';
import type { FiltroTransacoes, NovaTransacao, Transacao } from '@/types/financas';
import { dataValida, hoje } from '@/utils/datas';

const MAX_DESCRICAO = 120;
const DATA_MINIMA = '2000-01-01';
/** R$ 100 milhões: protege contra valores digitados por engano */
const MAX_VALOR_CENTAVOS = 10_000_000_000;

export function obterTransacoes(filtro: FiltroTransacoes = {}): Transacao[] {
  return listarTransacoes(filtro);
}

export function obterDiasComLancamentos(): Set<string> {
  return new Set(listarDiasComLancamentos());
}

export function obterTransacao(id: number): Transacao | null {
  return buscarTransacao(id);
}

/** Valida e normaliza os dados de um lançamento (usado ao criar e ao editar). */
function validarTransacao(dados: NovaTransacao): NovaTransacao {
  if (!Number.isInteger(dados.valorCentavos) || dados.valorCentavos <= 0) {
    throw new ErroValidacao('Informe um valor maior que zero.');
  }
  if (dados.valorCentavos > MAX_VALOR_CENTAVOS) {
    throw new ErroValidacao('Esse valor parece alto demais. Confira o número digitado.');
  }
  if (!dataValida(dados.data) || dados.data < DATA_MINIMA) {
    throw new ErroValidacao('Data inválida.');
  }
  if (dados.data > hoje()) {
    throw new ErroValidacao('A data não pode ser no futuro. Registre o lançamento quando ele acontecer.');
  }

  const categoria = buscarCategoria(dados.categoriaId);
  if (!categoria || categoria.tipo !== dados.tipo) {
    throw new ErroValidacao('Escolha uma categoria válida.');
  }

  return {
    ...dados,
    descricao: dados.descricao.trim().slice(0, MAX_DESCRICAO),
    // Por enquanto só despesas podem ser recorrentes (ex.: aluguel, assinaturas).
    recorrente: dados.tipo === 'despesa' && dados.recorrente,
  };
}

export function adicionarTransacao(nova: NovaTransacao): number {
  return criarTransacao(validarTransacao(nova));
}

export function editarTransacao(id: number, dados: NovaTransacao) {
  const atualizou = atualizarTransacao(id, validarTransacao(dados));
  if (!atualizou) {
    throw new ErroValidacao('Este lançamento não existe mais.');
  }
}

export function excluirTransacao(id: number) {
  removerTransacao(id);
}
