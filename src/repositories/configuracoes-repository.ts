import { getBanco, notificarMudanca } from '@/data/database';

export function lerConfiguracao(chave: string): string | null {
  return (
    getBanco().getFirstSync<{ valor: string }>('SELECT valor FROM configuracoes WHERE chave = ?', chave)
      ?.valor ?? null
  );
}

export function salvarConfiguracao(chave: string, valor: string) {
  getBanco().runSync(
    `INSERT INTO configuracoes (chave, valor, atualizado_em) VALUES (?, ?, ?)
     ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor, atualizado_em = excluded.atualizado_em`,
    chave,
    valor,
    new Date().toISOString(),
  );
  notificarMudanca();
}
