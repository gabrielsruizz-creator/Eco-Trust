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
};

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
export function lerPaginaNota(html: string): Pick<DadosNota, 'valorCentavos' | 'tributosCentavos' | 'data' | 'emitente'> {
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

  return {
    valorCentavos: valor ? lerValorEmCentavos(valor) : null,
    tributosCentavos: tributos ? lerValorEmCentavos(tributos, true) : null,
    data,
    emitente,
  };
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
  };
  if (!qr.url) return base;
  const html = await buscarPagina(qr.url);
  if (!html) return base;
  const pagina = lerPaginaNota(html);
  return {
    ...base,
    valorCentavos: pagina.valorCentavos ?? base.valorCentavos,
    // Tributos maiores que a compra seriam leitura errada da página.
    tributosCentavos:
      pagina.tributosCentavos !== null &&
      (pagina.valorCentavos ?? base.valorCentavos ?? Infinity) > pagina.tributosCentavos
        ? pagina.tributosCentavos
        : null,
    data: pagina.data,
    emitente: pagina.emitente,
  };
}
