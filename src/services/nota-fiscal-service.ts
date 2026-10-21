/**
 * Leitura da NFC-e (cupom fiscal eletrônico) pelo QR Code.
 *
 * O QR Code aponta para a página de consulta da SEFAZ do estado e traz a chave de acesso (44 dígitos).
 * Nas notas emitidas online ele NÃO traz o valor: buscamos a página da SEFAZ e procuramos o total,
 * a data, a loja e os "Tributos Totais Incidentes (Lei 12.741/2012)". Cada estado tem um site
 * diferente, então a leitura da página é "melhor esforço": o que não for encontrado, o usuário completa.
 *
 * Segurança: o conteúdo do QR Code vem de fora. Só buscamos e abrimos endereços de governo (.gov.br).
 */

import { programaDoEstado, type ProgramaEstadual } from '@/data/programas-estaduais';
import { buscarNotaDaTransacao, gravarNotaDaTransacao, listarNotasDoPeriodo } from '@/repositories/notas-repository';
import type { ItemNota, NotaSalva } from '@/types/financas';
import { dataValida, hoje } from '@/utils/datas';
import { lerValorEmCentavos } from '@/utils/moeda';

const TEMPO_LIMITE_MS = 12_000;

const UF_POR_CODIGO: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE', '29': 'BA',
  '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR', '42': 'SC', '43': 'RS',
  '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
};

export type ChaveNota = {
  chave: string;
  uf: string;
  /** "AAAA-MM" da emissão */
  mes: string;
  cnpj: string;
  /** 65 = NFC-e (cupom), 55 = NF-e */
  modelo: string;
  numero: number;
};

export type QrNota = {
  chave: ChaveNota;
  /** Endereço de consulta (só quando é um site .gov.br) */
  url: string | null;
  /** Nas notas emitidas em contingência o QR Code já traz o valor */
  valorCentavos: number | null;
};

export type DadosNota = {
  chave: ChaveNota;
  url: string | null;
  valorCentavos: number | null;
  tributosCentavos: number | null;
  /** AAAA-MM-DD */
  data: string | null;
  emitente: string | null;
  itens: ItemNota[];
  /** A nota saiu com o CPF do consumidor? null = não deu para saber */
  cpfNaNota: boolean | null;
};

const MAX_ITENS = 300;

/** Dígito verificador da chave de acesso (módulo 11, pesos 2 a 9). */
function digitoVerificador(chave43: string) {
  let soma = 0;
  let peso = 2;
  for (let i = chave43.length - 1; i >= 0; i--) {
    soma += Number(chave43[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/** Valida e decompõe a chave de acesso de 44 dígitos. */
export function lerChave(chave: string): ChaveNota | null {
  if (!/^\d{44}$/.test(chave)) return null;
  if (digitoVerificador(chave.slice(0, 43)) !== Number(chave[43])) return null;
  const uf = UF_POR_CODIGO[chave.slice(0, 2)];
  const mes = Number(chave.slice(4, 6));
  if (!uf || mes < 1 || mes > 12) return null;
  return {
    chave,
    uf,
    mes: `20${chave.slice(2, 4)}-${chave.slice(4, 6)}`,
    cnpj: chave.slice(6, 20),
    modelo: chave.slice(20, 22),
    numero: Number(chave.slice(25, 34)),
  };
}

/** Só endereços de governo (as SEFAZ ficam todas em .gov.br). */
export function enderecoSeguro(texto: string): string | null {
  try {
    const url = new URL(texto.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    const host = url.hostname.toLowerCase();
    return host === 'gov.br' || host.endsWith('.gov.br') ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Interpreta o texto do QR Code. Formatos:
 * - v2/v3 online:  ...?p=CHAVE|versão|ambiente|...
 * - contingência:  ...?p=CHAVE|versão|ambiente|dia|valor|...  (o valor vem no QR Code)
 * - v1 (antigo):   ...?chNFe=CHAVE&...&vNF=12.34&...
 */
export function lerQrCode(texto: string): QrNota | null {
  const conteudo = texto.trim();
  const chaveTexto = /(?:^|\D)(\d{44})(?:\D|$)/.exec(conteudo.replace(/\s/g, ''))?.[1];
  const chave = chaveTexto ? lerChave(chaveTexto) : null;
  if (!chave) return null;

  let valorCentavos: number | null = null;
  const parametroP = /[?&]p=([^&#]+)/.exec(conteudo)?.[1];
  if (parametroP) {
    const partes = decodeURIComponent(parametroP).split('|');
    // Contingência: CHAVE|versão|ambiente|dia(1-31)|valor|...
    if (partes.length >= 5 && /^\d{1,2}$/.test(partes[3]) && /^\d+(\.\d{1,2})?$/.test(partes[4])) {
      valorCentavos = Math.round(Number(partes[4]) * 100);
    }
  } else {
    const vNF = /[?&]vNF=(\d+(?:\.\d{1,2})?)/i.exec(conteudo)?.[1];
    if (vNF) valorCentavos = Math.round(Number(vNF) * 100);
  }

  return { chave, url: enderecoSeguro(conteudo), valorCentavos: valorCentavos || null };
}

/** Acentos escritos como entidade HTML ("&atilde;" → letra + marca de acento do Unicode). */
const MARCAS: Record<string, string> = {
  acute: String.fromCharCode(0x301),
  tilde: String.fromCharCode(0x303),
  cedil: String.fromCharCode(0x327),
  circ: String.fromCharCode(0x302),
  grave: String.fromCharCode(0x300),
};

/** HTML → texto corrido (sem tags, entidades comuns decodificadas, espaços normalizados). */
function paraTexto(html: string) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&([a-z])(acute|tilde|cedil|circ|grave);/gi, (_, letra: string, marca: string) =>
      (letra + MARCAS[marca.toLowerCase()]).normalize('NFC'),
    )
    .replace(/\s+/g, ' ');
}

const VALOR = String.raw`(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})`;

/** Extrai valor, tributos, data e loja da página de consulta da SEFAZ (vários layouts estaduais). */
export function lerPaginaNota(
  html: string,
): Pick<DadosNota, 'valorCentavos' | 'tributosCentavos' | 'data' | 'emitente' | 'cpfNaNota'> {
  const texto = paraTexto(html);
  const achar = (padroes: RegExp[]) => {
    for (const p of padroes) {
      const m = p.exec(texto);
      if (m) return m[1];
    }
    return null;
  };

  const valor = achar([
    new RegExp(String.raw`Valor a pagar R\$:?\s*${VALOR}`, 'i'),
    new RegExp(String.raw`Valor total (?:da nota|R\$)[^0-9]{0,20}${VALOR}`, 'i'),
    new RegExp(String.raw`Valor Total[^0-9]{0,20}${VALOR}`, 'i'),
  ]);
  const tributos = achar([
    new RegExp(String.raw`Tributos Totais Incidentes.{0,80}?${VALOR}`, 'i'),
    new RegExp(String.raw`Valor aprox(?:imado|\.)? dos tributos[^0-9]{0,40}${VALOR}`, 'i'),
    new RegExp(String.raw`Tributos aproximados[^0-9]{0,40}${VALOR}`, 'i'),
  ]);
  const dataTexto = achar([/Emiss[ãa]o:?\s*(\d{2}\/\d{2}\/\d{4})/i, /Data de Emiss[ãa]o[^0-9]{0,10}(\d{2}\/\d{2}\/\d{4})/i]);

  let data: string | null = null;
  if (dataTexto) {
    const [dia, mes, ano] = dataTexto.split('/');
    const candidata = `${ano}-${mes}-${dia}`;
    if (dataValida(candidata) && candidata <= hoje()) data = candidata;
  }

  // Nome da loja: no layout padrão fica num elemento com a classe "txtTopo".
  const emitenteHtml = /class="[^"]*txtTopo[^"]*"[^>]*>([^<]{3,80})</i.exec(html)?.[1];
  const emitente = emitenteHtml ? paraTexto(emitenteHtml).trim() || null : null;

  // Consumidor: "Consumidor não identificado" ou "CPF: 123.***.***-00" (o CNPJ é da loja).
  let cpfNaNota: boolean | null = null;
  if (/Consumidor n[ãa]o identificado/i.test(texto)) cpfNaNota = false;
  else if (/\bCPF\b[^0-9*]{0,25}[\d*]{3}[.*]/i.test(texto)) cpfNaNota = true;

  return {
    valorCentavos: valor ? lerValorEmCentavos(valor) : null,
    tributosCentavos: tributos ? lerValorEmCentavos(tributos, true) : null,
    data,
    emitente,
    cpfNaNota,
  };
}

const NUMERO = String.raw`(\d{1,3}(?:\.\d{3})+(?:,\d{1,4})?|\d+(?:,\d{1,4})?)`;

function lerQuantidade(texto: string) {
  const n = Number(texto.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * Lista de produtos da página da SEFAZ. No layout padrão (usado pela maioria dos estados) cada item
 * é uma linha da tabela com: nome, (Código: ...), Qtde.:, UN:, Vl. Unit.: e Vl. Total.
 */
export function lerItensDaPagina(html: string): ItemNota[] {
  const itens: ItemNota[] = [];
  const linhas = html.split(/<tr[\s>]/i).slice(1);
  for (const linha of linhas) {
    if (itens.length >= MAX_ITENS) break;
    const texto = paraTexto(linha.split(/<\/tr>/i)[0]);
    const total = new RegExp(String.raw`Vl\.?\s*Total\s*:?\s*(?:R\$)?\s*${NUMERO}`, 'i').exec(texto)?.[1];
    const quantidade = new RegExp(String.raw`Qtde\.?\s*:?\s*${NUMERO}`, 'i').exec(texto)?.[1];
    if (!total || !quantidade) continue;

    const nomeHtml = /class="[^"]*txtTit[^"]*"[^>]*>([^<]{1,160})</i.exec(linha)?.[1];
    const descricao = (nomeHtml ? paraTexto(nomeHtml) : texto.split(/\(\s*C[óo]digo/i)[0]).trim().slice(0, 120);
    const valorTotal = lerValorEmCentavos(total);
    if (!descricao || valorTotal === null) continue;

    const unitario = new RegExp(String.raw`Vl\.?\s*Unit\.?\s*:?\s*(?:R\$)?\s*${NUMERO}`, 'i').exec(texto)?.[1];
    itens.push({
      descricao,
      codigo: /C[óo]digo\s*:?\s*([\w.-]{1,30})/i.exec(texto)?.[1] ?? null,
      quantidade: lerQuantidade(quantidade),
      unidade: /\bUN\s*:\s*([A-Za-z]{1,6})/.exec(texto)?.[1]?.toUpperCase() ?? null,
      valorUnitarioCentavos: unitario ? lerValorEmCentavos(unitario) : null,
      valorTotalCentavos: valorTotal,
    });
  }
  return itens;
}

/** Busca a página da SEFAZ (tenta https primeiro; muitos QR Codes ainda usam http). */
async function buscarPagina(url: string): Promise<string | null> {
  const tentativas = url.startsWith('http:') ? [url.replace(/^http:/, 'https:'), url] : [url];
  for (const endereco of tentativas) {
    const controle = new AbortController();
    const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
    try {
      const resposta = await fetch(endereco, { signal: controle.signal, headers: { Accept: 'text/html' } });
      if (resposta.ok) return await resposta.text();
    } catch {
      // Sem internet, site fora do ar ou http bloqueado pelo sistema: tenta o próximo endereço.
    } finally {
      clearTimeout(relogio);
    }
  }
  return null;
}

/** Lê o QR Code e tenta completar os dados pela página da SEFAZ. */
export async function consultarNota(qr: QrNota): Promise<DadosNota> {
  const base: DadosNota = {
    chave: qr.chave,
    url: qr.url,
    valorCentavos: qr.valorCentavos,
    tributosCentavos: null,
    data: null,
    emitente: null,
    itens: [],
    cpfNaNota: null,
  };
  if (!qr.url) return base;
  const html = await buscarPagina(qr.url);
  if (!html) return base;
  const pagina = lerPaginaNota(html);
  return {
    ...base,
    valorCentavos: pagina.valorCentavos ?? base.valorCentavos,
    // Zero = a loja não informou; maior que a compra = leitura errada da página. Nos dois casos, o app estima.
    tributosCentavos:
      pagina.tributosCentavos !== null &&
      pagina.tributosCentavos > 0 &&
      (pagina.valorCentavos ?? base.valorCentavos ?? Infinity) > pagina.tributosCentavos
        ? pagina.tributosCentavos
        : null,
    data: pagina.data,
    emitente: pagina.emitente,
    itens: lerItensDaPagina(html),
    cpfNaNota: pagina.cpfNaNota,
  };
}

/*
 * A leitura acontece na tela da câmera, mas a despesa só é criada quando o usuário salva o formulário.
 * Os itens ficam guardados aqui (em memória) até lá, pela chave da nota.
 */
const notasPendentes = new Map<string, DadosNota>();

export function guardarNotaPendente(nota: DadosNota) {
  notasPendentes.clear();
  notasPendentes.set(nota.chave.chave, nota);
}

/** Consulta a nota pendente sem retirá-la (o formulário usa os itens para estimar os impostos). */
export function verNotaPendente(chave: string): DadosNota | null {
  return notasPendentes.get(chave) ?? null;
}

export function retirarNotaPendente(chave: string): DadosNota | null {
  const nota = notasPendentes.get(chave) ?? null;
  notasPendentes.delete(chave);
  return nota;
}

/** Guarda a loja, o endereço da consulta e os itens da nota junto com o lançamento. */
export function anexarNotaAoLancamento(transacaoId: number, nota: DadosNota) {
  gravarNotaDaTransacao(transacaoId, {
    chave: nota.chave.chave,
    url: nota.url,
    emitente: nota.emitente,
    itens: nota.itens,
    cpfNaNota: nota.cpfNaNota,
  });
}

export function obterNotaDoLancamento(transacaoId: number): NotaSalva | null {
  return buscarNotaDaTransacao(transacaoId);
}

export type ResumoCpfNaNota = {
  /** Estado da maioria das notas lidas */
  uf: string;
  programa: ProgramaEstadual | null;
  total: number;
  comCpf: number;
  semCpf: number;
};

/** Notas lidas no ano: de que estado são e quantas saíram sem o CPF. null se nenhuma nota foi lida. */
export function resumirCpfNaNota(notas: { chave: string; cpfNaNota: boolean | null }[]): ResumoCpfNaNota | null {
  const porUf = new Map<string, number>();
  for (const n of notas) {
    const uf = lerChave(n.chave)?.uf;
    if (uf) porUf.set(uf, (porUf.get(uf) ?? 0) + 1);
  }
  const uf = [...porUf.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!uf) return null;
  return {
    uf,
    programa: programaDoEstado(uf),
    total: notas.length,
    comCpf: notas.filter((n) => n.cpfNaNota === true).length,
    semCpf: notas.filter((n) => n.cpfNaNota === false).length,
  };
}

export function obterResumoCpfNaNota(ano: number): ResumoCpfNaNota | null {
  return resumirCpfNaNota(listarNotasDoPeriodo(`${ano}-01-01`, `${ano}-12-31`));
}
