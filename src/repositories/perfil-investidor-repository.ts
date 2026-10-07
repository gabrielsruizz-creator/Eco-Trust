import { getBanco, notificarMudanca } from '@/data/database';
import type { PerfilInvestidor, TipoPerfilInvestidor } from '@/types/financas';

type LinhaPerfil = {
  tipo: TipoPerfilInvestidor;
  pontos: number;
  respostas: string;
  tem_reserva: number;
  respondido_em: string;
};

export function obterPerfilInvestidor(): PerfilInvestidor | null {
  const linha = getBanco().getFirstSync<LinhaPerfil>(
    'SELECT tipo, pontos, respostas, tem_reserva, respondido_em FROM perfil_investidor WHERE id = 1',
  );
  if (!linha) return null;
  return {
    tipo: linha.tipo,
    pontos: linha.pontos,
    respostas: JSON.parse(linha.respostas) as number[],
    temReserva: linha.tem_reserva === 1,
    respondidoEm: linha.respondido_em,
  };
}

export function salvarPerfilInvestidor(perfil: PerfilInvestidor) {
  getBanco().runSync(
    `INSERT INTO perfil_investidor (id, tipo, pontos, respostas, tem_reserva, respondido_em)
     VALUES (1, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       tipo = excluded.tipo,
       pontos = excluded.pontos,
       respostas = excluded.respostas,
       tem_reserva = excluded.tem_reserva,
       respondido_em = excluded.respondido_em`,
    perfil.tipo,
    perfil.pontos,
    JSON.stringify(perfil.respostas),
    perfil.temReserva ? 1 : 0,
    perfil.respondidoEm,
  );
  notificarMudanca();
}
