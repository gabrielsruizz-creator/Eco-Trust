import { getBanco, notificarMudanca } from '@/data/database';
import type { FonteRenda, ObjetivoFinanceiro, PerfilFinanceiro } from '@/types/financas';

type LinhaPerfil = {
  nome: string;
  renda_mensal_centavos: number;
  fonte_renda: FonteRenda;
  despesas_fixas_centavos: number;
  objetivo: ObjetivoFinanceiro;
  meta_economia_centavos: number;
};

export function obterPerfilFinanceiro(): PerfilFinanceiro | null {
  const linha = getBanco().getFirstSync<LinhaPerfil>(
    `SELECT nome, renda_mensal_centavos, fonte_renda, despesas_fixas_centavos, objetivo, meta_economia_centavos
     FROM perfil_financeiro WHERE id = 1`,
  );
  if (!linha) return null;
  return {
    nome: linha.nome,
    rendaMensalCentavos: linha.renda_mensal_centavos,
    fonteRenda: linha.fonte_renda,
    despesasFixasCentavos: linha.despesas_fixas_centavos,
    objetivo: linha.objetivo,
    metaEconomiaCentavos: linha.meta_economia_centavos,
  };
}

export function salvarPerfilFinanceiro(perfil: PerfilFinanceiro) {
  const agora = new Date().toISOString();
  getBanco().runSync(
    `INSERT INTO perfil_financeiro (id, nome, renda_mensal_centavos, fonte_renda, despesas_fixas_centavos,
                                    objetivo, meta_economia_centavos, criado_em, atualizado_em)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       nome = excluded.nome,
       renda_mensal_centavos = excluded.renda_mensal_centavos,
       fonte_renda = excluded.fonte_renda,
       despesas_fixas_centavos = excluded.despesas_fixas_centavos,
       objetivo = excluded.objetivo,
       meta_economia_centavos = excluded.meta_economia_centavos,
       atualizado_em = excluded.atualizado_em`,
    perfil.nome,
    perfil.rendaMensalCentavos,
    perfil.fonteRenda,
    perfil.despesasFixasCentavos,
    perfil.objetivo,
    perfil.metaEconomiaCentavos,
    agora,
    agora,
  );
  notificarMudanca();
}
