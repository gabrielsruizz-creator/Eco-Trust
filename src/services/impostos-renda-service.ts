/**
 * Impostos da renda e do patrimônio (os que não vêm embutidos nas despesas).
 * São valores fixos por mês: INSS e IR do salário, IPVA e IPTU divididos por 12 e outros (ex.: DAS do MEI).
 */

import { calcularINSS, calcularIRRF } from '@/data/tributos-renda';
import {
  buscarImpostosFixos,
  gravarImpostosFixos,
  removerImpostosFixos,
} from '@/repositories/impostos-fixos-repository';
import { ErroValidacao } from '@/services/erros';
import type { ImpostosFixos } from '@/types/financas';

/** R$ 10 milhões: protege contra valores digitados por engano */
const MAX_VALOR_CENTAVOS = 1_000_000_000;
const MAX_DEPENDENTES = 20;

export type ImpostosFixosMes = {
  inssCentavos: number;
  irCentavos: number;
  /** IPVA e IPTU anuais divididos por 12 */
  ipvaCentavos: number;
  iptuCentavos: number;
  outrosCentavos: number;
  totalCentavos: number;
  /** INSS e IR calculados pelo salário bruto, ou seja, descontados no holerite */
  descontadosNaFonte: boolean;
};

export function obterImpostosFixos(): ImpostosFixos | null {
  return buscarImpostosFixos();
}

/** Valores de um mês. null quando não há nada configurado. */
export function calcularImpostosFixosDoMes(f: ImpostosFixos | null): ImpostosFixosMes | null {
  if (!f) return null;
  const peloSalario = f.salarioBrutoCentavos !== null && f.salarioBrutoCentavos > 0;
  const inss = peloSalario ? calcularINSS(f.salarioBrutoCentavos!) : (f.inssCentavos ?? 0);
  const ir = peloSalario ? calcularIRRF(f.salarioBrutoCentavos!, inss, f.dependentes) : (f.irCentavos ?? 0);
  const ipva = Math.round(f.ipvaAnualCentavos / 12);
  const iptu = Math.round(f.iptuAnualCentavos / 12);
  const total = inss + ir + ipva + iptu + f.outrosMensalCentavos;
  if (total === 0) return null;
  return {
    inssCentavos: inss,
    irCentavos: ir,
    ipvaCentavos: ipva,
    iptuCentavos: iptu,
    outrosCentavos: f.outrosMensalCentavos,
    totalCentavos: total,
    descontadosNaFonte: peloSalario,
  };
}

function validarValor(valor: number | null, nome: string) {
  if (valor === null) return;
  if (!Number.isInteger(valor) || valor < 0) throw new ErroValidacao(`Valor de ${nome} inválido.`);
  if (valor > MAX_VALOR_CENTAVOS) throw new ErroValidacao(`O valor de ${nome} parece alto demais. Confira o número.`);
}

export function salvarImpostosFixos(f: ImpostosFixos) {
  validarValor(f.salarioBrutoCentavos, 'salário bruto');
  validarValor(f.inssCentavos, 'INSS');
  validarValor(f.irCentavos, 'Imposto de Renda');
  validarValor(f.ipvaAnualCentavos, 'IPVA');
  validarValor(f.iptuAnualCentavos, 'IPTU');
  validarValor(f.outrosMensalCentavos, 'outros impostos');
  if (!Number.isInteger(f.dependentes) || f.dependentes < 0 || f.dependentes > MAX_DEPENDENTES) {
    throw new ErroValidacao('Número de dependentes inválido.');
  }
  const peloSalario = f.salarioBrutoCentavos !== null && f.salarioBrutoCentavos > 0;
  gravarImpostosFixos({
    ...f,
    salarioBrutoCentavos: peloSalario ? f.salarioBrutoCentavos : null,
    // Com salário bruto, INSS e IR vêm da tabela; os valores digitados deixam de valer.
    inssCentavos: peloSalario ? null : f.inssCentavos,
    irCentavos: peloSalario ? null : f.irCentavos,
    dependentes: peloSalario ? f.dependentes : 0,
  });
}

export function limparImpostosFixos() {
  removerImpostosFixos();
}
