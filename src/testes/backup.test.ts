import { describe, expect, it, jest } from '@jest/globals';

import { lerArquivoBackup, montarBackup, resumirBackup } from '@/services/backup-service';

jest.mock('@/repositories/backup-repository', () => ({}));
jest.mock('@/repositories/configuracoes-repository', () => ({}));

const tabelas = {
  transacoes: [{ id: 1, tipo: 'despesa', valor_centavos: 4881, chave_nota: null }],
  metas: [],
  notas_fiscais: [{ transacao_id: 1, chave: 'x' }],
};

describe('arquivo de backup', () => {
  it('ida e volta', () => {
    const texto = JSON.stringify(montarBackup(tabelas, 14, new Date('2026-10-20T12:00:00Z')));
    const lido = lerArquivoBackup(texto, 14);
    expect(lido.tabelas).toEqual(tabelas);
    expect(resumirBackup(lido)).toEqual({ criadoEm: '2026-10-20T12:00:00.000Z', lancamentos: 1, metas: 0, notas: 1 });
  });

  it('aceita backup de versão anterior do banco', () => {
    expect(() => lerArquivoBackup(JSON.stringify(montarBackup(tabelas, 11)), 14)).not.toThrow();
  });

  it.each([
    ['texto qualquer', 'não é um backup'],
    [JSON.stringify({ app: 'Outro', tabelas: {} }), 'não é um backup'],
    [JSON.stringify({ app: 'EcoTrust', formato: 99, versaoBanco: 1, tabelas: {} }), 'Formato'],
    [JSON.stringify(montarBackup({}, 15)), 'versão mais nova'],
    [JSON.stringify(montarBackup({ transacoes: [{ id: { malicioso: true } }] } as never, 14)), 'corrompido'],
    [JSON.stringify(montarBackup({ transacoes: 'x' } as never, 14)), 'corrompido'],
  ])('recusa arquivos inválidos (%#)', (texto, mensagem) => {
    expect(() => lerArquivoBackup(texto, 14)).toThrow(mensagem);
  });
});
