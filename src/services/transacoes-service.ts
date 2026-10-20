/**
 * Regras para criar, editar e remover transações. As telas chamam este serviço, nunca o repositório direto.
 */

import { buscarCategoria } from '@/repositories/categorias-repository';
import {
  atualizarTransacao,
  buscarTransacao,
  buscarTransacaoPorChaveNota,
  criarTransacao,
  listarDiasComLancamentos,
  listarTransacoes,
  removerTransacao,
} from '@/repositories/transacoes-repository';
import { ErroValidacao } from '@/services/erros';
import type { FiltroTransacoes, NovaTransacao, Transacao } from '@/types/financas';
import { dataValida, formatarData, hoje } from '@/utils/datas';

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

/** Lançamento já registrado com esta nota fiscal (chave de acesso da NFC-e). */
export function obterTransacaoPorChaveNota(chave: string): Transacao | null {
  return buscarTransacaoPorChaveNota(chave);
}

export function obterTransacao(id: number): Transacao | null {
  return buscarTransacao(id);
}

/** Valida e normaliza os dados de um lançamento (usado ao criar e ao editar). */
function validarTransacao(dados: NovaTransacao, idAtual?: number): NovaTransacao {
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
  const tributos = dados.tipo === 'despesa' ? dados.tributosCentavos : null;
  if (tributos !== null && (!Number.isInteger(tributos) || tributos < 0)) {
    throw new ErroValidacao('Valor dos tributos inválido.');
  }
  if (tributos !== null && tributos >= dados.valorCentavos) {
    throw new ErroValidacao('Os tributos da nota precisam ser menores que o valor da compra.');
  }
  const chaveNota = dados.tipo === 'despesa' && dados.chaveNota && /^\d{44}$/.test(dados.chaveNota) ? dados.chaveNota : null;
  if (chaveNota) {
    const existente = buscarTransacaoPorChaveNota(chaveNota);
    if (existente && existente.id !== idAtual) {
      throw new ErroValidacao(
        `Esta nota já foi registrada em ${formatarData(existente.data)} (${existente.descricao || existente.categoriaNome}).`,
      );
    }
  }

  return {
    ...dados,
    descricao: dados.descricao.trim().slice(0, MAX_DESCRICAO),
    // Por enquanto só despesas podem ser recorrentes (ex.: aluguel, assinaturas).
    recorrente: dados.tipo === 'despesa' && dados.recorrente,
    // Tributos da nota fiscal só fazem sentido em despesas.
    tributosCentavos: tributos,
    chaveNota,
  };
}

export function adicionarTransacao(nova: NovaTransacao): number {
  return criarTransacao(validarTransacao(nova));
}

export function editarTransacao(id: number, dados: NovaTransacao) {
  const atualizou = atualizarTransacao(id, validarTransacao(dados, id));
  if (!atualizou) {
    throw new ErroValidacao('Este lançamento não existe mais.');
  }
}

export function excluirTransacao(id: number) {
  removerTransacao(id);
}
