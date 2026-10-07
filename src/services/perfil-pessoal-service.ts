/**
 * Dados pessoais e situação financeira do Perfil: opções, rótulos e validação.
 * Todos os campos pessoais são opcionais: a pessoa preenche o que quiser.
 */

import { obterPerfilPessoal, salvarPerfilPessoal } from '@/repositories/perfil-pessoal-repository';
import { obterSituacaoFinanceira, salvarSituacaoFinanceira } from '@/repositories/situacao-repository';
import { ErroValidacao } from '@/services/erros';
import type {
  EstadoCivil,
  Moradia,
  PerfilPessoal,
  SituacaoDividas,
  SituacaoFinanceira,
  SituacaoInvestimentos,
  SituacaoReserva,
} from '@/types/financas';
import { dataValida, hoje, idadeEm } from '@/utils/datas';

type Opcao<T extends string> = { valor: T; rotulo: string };

export const AVATARES = ['🙂', '😎', '🦊', '🐼', '🦁', '🐢', '🌱', '🚀', '⭐', '🎯', '💡', '🌊'];
/** Índices de cor do avatar (as cores ficam no tema). */
export const QUANTIDADE_CORES_AVATAR = 6;

export const ESTADOS_CIVIS: Opcao<EstadoCivil>[] = [
  { valor: 'solteiro', rotulo: 'Solteiro(a)' },
  { valor: 'casado', rotulo: 'Casado(a)' },
  { valor: 'uniao', rotulo: 'União estável' },
  { valor: 'divorciado', rotulo: 'Divorciado(a)' },
  { valor: 'viuvo', rotulo: 'Viúvo(a)' },
];

export const MORADIAS: Opcao<Moradia>[] = [
  { valor: 'aluguel', rotulo: 'Aluguel' },
  { valor: 'propria', rotulo: 'Casa própria (quitada)' },
  { valor: 'financiada', rotulo: 'Financiada' },
  { valor: 'familia', rotulo: 'Com a família' },
  { valor: 'outra', rotulo: 'Outra' },
];

export const DIVIDAS: Opcao<SituacaoDividas>[] = [
  { valor: 'nao', rotulo: 'Sem dívidas' },
  { valor: 'controlada', rotulo: 'Sob controle' },
  { valor: 'pesando', rotulo: 'Pesando no orçamento' },
];

export const RESERVAS: Opcao<SituacaoReserva>[] = [
  { valor: 'nao', rotulo: 'Não tenho' },
  { valor: 'parcial', rotulo: 'Tenho um pouco' },
  { valor: 'completa', rotulo: '6 meses ou mais' },
];

export const INVESTIMENTOS: Opcao<SituacaoInvestimentos>[] = [
  { valor: 'nao', rotulo: 'Ainda não invisto' },
  { valor: 'poupanca', rotulo: 'Só poupança' },
  { valor: 'outros', rotulo: 'Outros investimentos' },
];

export function rotulo<T extends string>(opcoes: Opcao<T>[], valor: T | null | undefined) {
  return opcoes.find((o) => o.valor === valor)?.rotulo ?? 'Não informado';
}

export const PERFIL_PESSOAL_VAZIO: PerfilPessoal = {
  avatar: null,
  corAvatar: 0,
  dataNascimento: null,
  anoNascimento: null,
  cidade: null,
  profissao: null,
  estadoCivil: null,
  dependentes: null,
};

export function obterDadosPessoais(): PerfilPessoal {
  return obterPerfilPessoal() ?? PERFIL_PESSOAL_VAZIO;
}

export function idade(anoNascimento: number | null, anoAtual = new Date().getFullYear()) {
  return anoNascimento ? anoAtual - anoNascimento : null;
}

/** Idade exata quando há data de nascimento; senão, aproximada pelo ano. */
export function idadeDoPerfil(p: Pick<PerfilPessoal, 'dataNascimento' | 'anoNascimento'>, dataHoje = hoje()) {
  if (p.dataNascimento) return idadeEm(p.dataNascimento, dataHoje);
  return idade(p.anoNascimento, Number(dataHoje.slice(0, 4)));
}

/** "Gabriel Ruiz" → "GR"; "Ana" → "A" */
export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toLocaleUpperCase('pt-BR');
}

/** Quantos dos 5 dados pessoais foram preenchidos (o avatar não conta). */
export function camposPreenchidos(p: PerfilPessoal) {
  return [p.dataNascimento ?? p.anoNascimento, p.cidade, p.profissao, p.estadoCivil, p.dependentes].filter(
    (v) => v !== null && v !== '',
  ).length;
}
export const TOTAL_CAMPOS_PESSOAIS = 5;

function textoOpcional(valor: string | null, campo: string, max = 40) {
  const limpo = (valor ?? '').trim().replace(/\s+/g, ' ');
  if (!limpo) return null;
  if (limpo.length > max) throw new ErroValidacao(`Use no máximo ${max} letras em ${campo}.`);
  return limpo;
}

export function salvarDadosPessoais(p: PerfilPessoal, anoAtual = new Date().getFullYear(), dataHoje = hoje()) {
  const dataNascimento = p.dataNascimento ?? null;
  if (dataNascimento !== null) {
    const anos = dataValida(dataNascimento) ? idadeEm(dataNascimento, dataHoje) : -1;
    if (anos < 10 || anos > 110) throw new ErroValidacao('Confira a data de nascimento.');
  }
  const anoNascimento = dataNascimento !== null ? Number(dataNascimento.slice(0, 4)) : p.anoNascimento;
  if (dataNascimento === null && anoNascimento !== null) {
    if (!Number.isInteger(anoNascimento) || anoNascimento < anoAtual - 110 || anoNascimento > anoAtual - 10) {
      throw new ErroValidacao('Confira o ano de nascimento.');
    }
  }
  if (p.dependentes !== null && (!Number.isInteger(p.dependentes) || p.dependentes < 0 || p.dependentes > 20)) {
    throw new ErroValidacao('Número de dependentes inválido.');
  }
  if (p.estadoCivil !== null && !ESTADOS_CIVIS.some((e) => e.valor === p.estadoCivil)) {
    throw new ErroValidacao('Escolha um estado civil válido.');
  }
  if (p.avatar !== null && !AVATARES.includes(p.avatar)) throw new ErroValidacao('Escolha um avatar da lista.');
  salvarPerfilPessoal({
    ...p,
    dataNascimento,
    anoNascimento,
    corAvatar: Math.abs(Math.trunc(p.corAvatar)) % QUANTIDADE_CORES_AVATAR,
    cidade: textoOpcional(p.cidade, 'cidade'),
    profissao: textoOpcional(p.profissao, 'profissão'),
  });
}

export function obterSituacao(): SituacaoFinanceira | null {
  return obterSituacaoFinanceira();
}

export function salvarSituacao(s: SituacaoFinanceira) {
  if (!DIVIDAS.some((o) => o.valor === s.dividas)) throw new ErroValidacao('Informe sua situação de dívidas.');
  if (!RESERVAS.some((o) => o.valor === s.reserva)) throw new ErroValidacao('Informe se tem reserva.');
  if (!INVESTIMENTOS.some((o) => o.valor === s.investe)) throw new ErroValidacao('Informe se investe.');
  if (s.moradia && !MORADIAS.some((o) => o.valor === s.moradia)) throw new ErroValidacao('Escolha uma moradia válida.');
  salvarSituacaoFinanceira(s);
}
