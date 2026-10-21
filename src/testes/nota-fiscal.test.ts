import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  consultarNota,
  enderecoSeguro,
  lerChave,
  lerItensDaPagina,
  lerPaginaNota,
  lerQrCode,
  resumirCpfNaNota,
} from '@/services/nota-fiscal-service';

jest.mock('@/repositories/notas-repository', () => jest.requireActual<typeof import('./banco-falso')>('./banco-falso').notasRepository);

/** Monta uma chave de acesso válida (com dígito verificador). */
function chaveValida(inicio43 = '3526101234567800019065001000012345112345678') {
  let soma = 0;
  let peso = 2;
  for (let i = 42; i >= 0; i--) {
    soma += Number(inicio43[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return inicio43 + (resto < 2 ? 0 : 11 - resto);
}

const CHAVE = chaveValida();

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 9, 20, 12), advanceTimers: true });
});
afterEach(() => {
  jest.useRealTimers();
});

describe('chave de acesso', () => {
  it('decompõe UF, mês, CNPJ, modelo e número', () => {
    expect(lerChave(CHAVE)).toMatchObject({ uf: 'SP', mes: '2026-10', cnpj: '12345678000190', modelo: '65', numero: 12345 });
  });

  it('recusa dígito verificador errado', () => {
    const errada = CHAVE.slice(0, 43) + ((Number(CHAVE[43]) + 1) % 10);
    expect(lerChave(errada)).toBeNull();
  });
});

describe('QR Code', () => {
  it('lê os formatos online (v2 e v3) sem valor', () => {
    expect(lerQrCode(`https://www.nfce.fazenda.sp.gov.br/qrcode?p=${CHAVE}|2|1|1|ABCDEF`)?.valorCentavos).toBeNull();
    expect(lerQrCode(`http://www.fazenda.pr.gov.br/nfce/qrcode?p=${CHAVE}|3|1`)?.url).toBeTruthy();
  });

  it('lê o valor na contingência e no formato antigo', () => {
    expect(lerQrCode(`https://nfce.sefaz.ba.gov.br/qrcode?p=${CHAVE}|2|1|05|123.45|6a6b|1|ABC`)?.valorCentavos).toBe(12_345);
    expect(lerQrCode(`http://nfce.sefaz.rs.gov.br/qrcode?chNFe=${CHAVE}&nVersao=100&vNF=59.90`)?.valorCentavos).toBe(5_990);
  });

  it('só aceita endereços de governo', () => {
    expect(lerQrCode(`https://golpe.example.com/qrcode?p=${CHAVE}|2|1`)?.url).toBeNull();
    expect(enderecoSeguro('https://sefaz.gov.br.golpe.com/x')).toBeNull();
    expect(enderecoSeguro('javascript:alert(1)')).toBeNull();
    expect(lerQrCode('https://site.com/qualquer')).toBeNull();
  });
});

const PAGINA = `<div id="u20" class="txtTopo">SUPERMERCADO BOM PRE&Ccedil;O LTDA</div>
<table id="tabResult">
<tr id="Item + 1"><td><span class="txtTit">ARROZ TIO JOAO T1 5KG</span><span class="RCod">(Código: 7893500020110 )</span><br /><span class="Rqtd"><strong>Qtde.:</strong>2</span><span class="RUN"><strong>UN: </strong>un</span><span class="RvlUnit"><strong>Vl. Unit.:</strong>&nbsp;&nbsp;24,9</span></td><td class="txtTit noWrap">Vl. Total<br /><span class="valor">49,80</span></td></tr>
<tr id="Item + 2"><td><span class="txtTit">BANANA PRATA KG</span><span class="RCod">(Código: 2001 )</span><br /><span class="Rqtd"><strong>Qtde.:</strong>0,856</span><span class="RUN"><strong>UN: </strong>KG</span><span class="RvlUnit"><strong>Vl. Unit.:</strong>&nbsp;&nbsp;6,99</span></td><td class="txtTit noWrap">Vl. Total<br /><span class="valor">5,98</span></td></tr>
</table>
<div id="linhaTotal"><label>Valor a pagar R$:</label><span class="totalNumb txtMax">1.234,56</span></div>
<div id="linhaTotal"><label>Informação dos Tributos Totais Incidentes (Lei Federal 12.741/2012) R$</label><span class="totalNumb txtObs">287,10</span></div>
<ul><li><strong>Emissão: </strong>05/10/2026 14:22:31 - Via Consumidor</li></ul>`;

describe('página da SEFAZ', () => {
  it('lê valor, tributos, data e loja', () => {
    expect(lerPaginaNota(PAGINA)).toEqual({
      valorCentavos: 123_456,
      tributosCentavos: 28_710,
      data: '2026-10-05',
      emitente: 'SUPERMERCADO BOM PREÇO LTDA',
      cpfNaNota: null,
    });
  });

  it('lê os itens', () => {
    const itens = lerItensDaPagina(PAGINA);
    expect(itens).toHaveLength(2);
    expect(itens[0]).toEqual({ descricao: 'ARROZ TIO JOAO T1 5KG', codigo: '7893500020110', quantidade: 2, unidade: 'UN', valorUnitarioCentavos: 2_490, valorTotalCentavos: 4_980 });
    expect(itens[1]).toMatchObject({ quantidade: 0.856, unidade: 'KG', valorTotalCentavos: 598 });
  });

  it('descarta data no futuro', () => {
    expect(lerPaginaNota('Emissão: 05/10/2099').data).toBeNull();
  });

  it('tributos R$ 0,00 contam como não informados', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, text: async () => PAGINA.replace('287,10', '0,00') })) as unknown as typeof fetch;
    const nota = await consultarNota(lerQrCode(`https://www.nfce.fazenda.sp.gov.br/qrcode?p=${CHAVE}|2|1|1|X`)!);
    expect(nota.valorCentavos).toBe(123_456);
    expect(nota.tributosCentavos).toBeNull();
    expect(nota.itens).toHaveLength(2);
  });
});

describe('CPF na nota', () => {
  it('detecta consumidor identificado ou não', () => {
    expect(lerPaginaNota('<div>CONSUMIDOR NÃO IDENTIFICADO</div>').cpfNaNota).toBe(false);
    expect(lerPaginaNota('<li><strong>CPF:</strong> 123.***.***-00</li>').cpfNaNota).toBe(true);
    expect(lerPaginaNota('<div>CNPJ: 12.345.678/0001-90</div>').cpfNaNota).toBeNull();
  });

  it('resume o estado das notas e o programa', () => {
    const outraUf = chaveValida('4126101234567800019065001000012345112345678'); // PR
    const r = resumirCpfNaNota([
      { chave: CHAVE, cpfNaNota: false },
      { chave: CHAVE, cpfNaNota: true },
      { chave: outraUf, cpfNaNota: null },
    ])!;
    expect(r).toMatchObject({ uf: 'SP', total: 3, comCpf: 1, semCpf: 1 });
    expect(r.programa?.nome).toBe('Nota Fiscal Paulista');
    expect(resumirCpfNaNota([])).toBeNull();
  });
});
