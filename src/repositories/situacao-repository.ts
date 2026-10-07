import { getBanco, notificarMudanca } from '@/data/database';
import type {
  Moradia,
  SituacaoDividas,
  SituacaoFinanceira,
  SituacaoInvestimentos,
  SituacaoReserva,
} from '@/types/financas';

type Linha = {
  dividas: SituacaoDividas;
  reserva: SituacaoReserva;
  investe: SituacaoInvestimentos;
  moradia: Moradia | null;
  renda_extra: number | null;
};

export function obterSituacaoFinanceira(): SituacaoFinanceira | null {
  const l = getBanco().getFirstSync<Linha>(
    'SELECT dividas, reserva, investe, moradia, renda_extra FROM perfil_situacao WHERE id = 1',
  );
  if (!l) return null;
  return {
    dividas: l.dividas,
    reserva: l.reserva,
    investe: l.investe,
    moradia: l.moradia,
    rendaExtra: l.renda_extra === null ? null : l.renda_extra === 1,
  };
}

/** Salva a situação. Campos opcionais ausentes mantêm o valor que já estava salvo. */
export function salvarSituacaoFinanceira(s: SituacaoFinanceira) {
  const atual = obterSituacaoFinanceira();
  const moradia = s.moradia !== undefined ? s.moradia : (atual?.moradia ?? null);
  const rendaExtra = s.rendaExtra !== undefined ? s.rendaExtra : (atual?.rendaExtra ?? null);
  getBanco().runSync(
    `INSERT INTO perfil_situacao (id, dividas, reserva, investe, moradia, renda_extra, atualizado_em)
     VALUES (1, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       dividas = excluded.dividas, reserva = excluded.reserva, investe = excluded.investe,
       moradia = excluded.moradia, renda_extra = excluded.renda_extra, atualizado_em = excluded.atualizado_em`,
    s.dividas,
    s.reserva,
    s.investe,
    moradia,
    rendaExtra === null ? null : rendaExtra ? 1 : 0,
    new Date().toISOString(),
  );
  notificarMudanca();
}
