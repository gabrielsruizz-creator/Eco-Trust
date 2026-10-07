import { getBanco, notificarMudanca } from '@/data/database';
import type { EstadoCivil, PerfilPessoal } from '@/types/financas';

type Linha = {
  avatar: string | null;
  cor_avatar: number;
  data_nascimento: string | null;
  ano_nascimento: number | null;
  cidade: string | null;
  profissao: string | null;
  estado_civil: EstadoCivil | null;
  dependentes: number | null;
};

export function obterPerfilPessoal(): PerfilPessoal | null {
  const l = getBanco().getFirstSync<Linha>(
    `SELECT avatar, cor_avatar, data_nascimento, ano_nascimento, cidade, profissao, estado_civil, dependentes
     FROM perfil_pessoal WHERE id = 1`,
  );
  if (!l) return null;
  return {
    avatar: l.avatar,
    corAvatar: l.cor_avatar,
    dataNascimento: l.data_nascimento,
    anoNascimento: l.ano_nascimento,
    cidade: l.cidade,
    profissao: l.profissao,
    estadoCivil: l.estado_civil,
    dependentes: l.dependentes,
  };
}

export function salvarPerfilPessoal(p: PerfilPessoal) {
  getBanco().runSync(
    `INSERT INTO perfil_pessoal (id, avatar, cor_avatar, data_nascimento, ano_nascimento, cidade, profissao, estado_civil, dependentes, atualizado_em)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       avatar = excluded.avatar, cor_avatar = excluded.cor_avatar, data_nascimento = excluded.data_nascimento,
       ano_nascimento = excluded.ano_nascimento,
       cidade = excluded.cidade, profissao = excluded.profissao, estado_civil = excluded.estado_civil,
       dependentes = excluded.dependentes, atualizado_em = excluded.atualizado_em`,
    p.avatar,
    p.corAvatar,
    p.dataNascimento,
    p.anoNascimento,
    p.cidade,
    p.profissao,
    p.estadoCivil,
    p.dependentes,
    new Date().toISOString(),
  );
  notificarMudanca();
}
