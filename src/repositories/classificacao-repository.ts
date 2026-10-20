import type { EscolhaProduto } from '@/data/carga-tributaria';
import { getBanco, notificarMudanca } from '@/data/database';

export function listarClassificacoes(): Map<string, EscolhaProduto> {
  const linhas = getBanco().getAllSync<{ nome: string; tipo: EscolhaProduto }>('SELECT nome, tipo FROM classificacao_produtos');
  return new Map(linhas.map((l) => [l.nome, l.tipo]));
}

export function gravarClassificacao(nome: string, tipo: EscolhaProduto) {
  getBanco().runSync(
    `INSERT INTO classificacao_produtos (nome, tipo, atualizado_em) VALUES (?, ?, ?)
     ON CONFLICT (nome) DO UPDATE SET tipo = excluded.tipo, atualizado_em = excluded.atualizado_em`,
    nome,
    tipo,
    new Date().toISOString(),
  );
  notificarMudanca();
}

export function removerClassificacao(nome: string) {
  getBanco().runSync('DELETE FROM classificacao_produtos WHERE nome = ?', nome);
  notificarMudanca();
}
