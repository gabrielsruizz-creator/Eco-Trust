/**
 * Backup em arquivo: exporta todos os dados financeiros para um .json (que o usuário guarda onde
 * quiser: iCloud, Google Drive, e-mail...) e restaura a partir dele. A conta e a senha não vão no
 * arquivo: ficam só no cofre seguro do aparelho.
 */

import { getDocumentAsync } from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';

import {
  lerTodasAsTabelas,
  substituirTodasAsTabelas,
  versaoDoBanco,
  type Tabelas,
  type ValorSimples,
} from '@/repositories/backup-repository';
import { lerConfiguracao, salvarConfiguracao } from '@/repositories/configuracoes-repository';
import { ErroValidacao } from '@/services/erros';
import { hoje } from '@/utils/datas';

const FORMATO = 1;
const CHAVE_ULTIMO_BACKUP = 'ultimo_backup';
/** 20 MB: muito acima de anos de uso, e protege contra arquivos errados */
const TAMANHO_MAXIMO = 20 * 1024 * 1024;

export type ArquivoBackup = {
  app: 'EcoTrust';
  formato: number;
  versaoBanco: number;
  criadoEm: string;
  tabelas: Tabelas;
};

export type ResumoBackup = {
  criadoEm: string;
  lancamentos: number;
  metas: number;
  notas: number;
};

export function montarBackup(tabelas: Tabelas, versaoBanco: number, agora = new Date()): ArquivoBackup {
  return { app: 'EcoTrust', formato: FORMATO, versaoBanco, criadoEm: agora.toISOString(), tabelas };
}

function valorSimples(v: unknown): v is ValorSimples {
  return v === null || typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v));
}

/** Confere se o texto é um backup do EcoTrust que esta versão do app consegue restaurar. */
export function lerArquivoBackup(texto: string, versaoAtual: number): ArquivoBackup {
  let dados: unknown;
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new ErroValidacao('Este arquivo não é um backup do EcoTrust.');
  }
  const b = dados as Partial<ArquivoBackup>;
  if (!b || b.app !== 'EcoTrust' || typeof b.tabelas !== 'object' || b.tabelas === null || Array.isArray(b.tabelas)) {
    throw new ErroValidacao('Este arquivo não é um backup do EcoTrust.');
  }
  if (b.formato !== FORMATO || typeof b.versaoBanco !== 'number') {
    throw new ErroValidacao('Formato de backup desconhecido.');
  }
  if (b.versaoBanco > versaoAtual) {
    throw new ErroValidacao('Este backup foi feito numa versão mais nova do EcoTrust. Atualize o app e tente de novo.');
  }
  for (const linhas of Object.values(b.tabelas)) {
    const valido =
      Array.isArray(linhas) &&
      linhas.every((l) => l && typeof l === 'object' && !Array.isArray(l) && Object.values(l).every(valorSimples));
    if (!valido) throw new ErroValidacao('O backup está corrompido.');
  }
  return b as ArquivoBackup;
}

export function resumirBackup(b: ArquivoBackup): ResumoBackup {
  return {
    criadoEm: b.criadoEm,
    lancamentos: b.tabelas.transacoes?.length ?? 0,
    metas: b.tabelas.metas?.length ?? 0,
    notas: b.tabelas.notas_fiscais?.length ?? 0,
  };
}

/** Gera o arquivo e abre a janela de compartilhar do sistema para o usuário escolher onde guardar. */
export async function exportarBackup() {
  if (!(await isAvailableAsync())) throw new ErroValidacao('Este aparelho não permite compartilhar arquivos.');
  const backup = montarBackup(lerTodasAsTabelas(), versaoDoBanco());
  const arquivo = new File(Paths.cache, `ecotrust-backup-${hoje()}.json`);
  if (arquivo.exists) arquivo.delete();
  arquivo.create();
  arquivo.write(JSON.stringify(backup));
  await shareAsync(arquivo.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Guardar backup do EcoTrust',
  });
  salvarConfiguracao(CHAVE_ULTIMO_BACKUP, new Date().toISOString());
}

/** Momento (ISO) do último backup exportado neste aparelho. */
export function obterUltimoBackup(): string | null {
  return lerConfiguracao(CHAVE_ULTIMO_BACKUP);
}

/** Abre o seletor de arquivos e lê o backup escolhido (sem restaurar ainda). null = cancelou. */
export async function escolherBackup(): Promise<ArquivoBackup | null> {
  const resultado = await getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (resultado.canceled || !resultado.assets[0]) return null;
  const asset = resultado.assets[0];
  if (asset.size !== undefined && asset.size > TAMANHO_MAXIMO) throw new ErroValidacao('Arquivo grande demais para ser um backup.');
  const texto = await new File(asset.uri).text();
  return lerArquivoBackup(texto, versaoDoBanco());
}

/** Troca TODOS os dados deste aparelho pelos do backup. */
export function restaurarBackup(backup: ArquivoBackup) {
  substituirTodasAsTabelas(backup.tabelas);
}
