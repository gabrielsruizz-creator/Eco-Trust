/**
 * Mascote do EcoTrust (o "Eco"): um bichinho que reage aos seus hábitos financeiros, como um Tamagotchi.
 * - Humor: depende de há quantos dias você não registra nada, orçamento estourado e saúde financeira.
 * - Energia: cai 20% por dia sem registros e volta ao registrar.
 * - Estágio: cresce com o nível da jornada (Filhote → Jovem → Adulto → Sábio).
 * - Falas: frases sobre a sua situação; tocar no Eco mostra a próxima.
 * `calcularPet` é puro; `obterPet` busca os dados.
 */

import { lerConfiguracao, salvarConfiguracao } from '@/repositories/configuracoes-repository';
import { listarMomentosDeRegistro } from '@/repositories/jornada-repository';
import { ErroValidacao } from '@/services/erros';
import { obterJornada } from '@/services/gamificacao-service';
import { obterMetas } from '@/services/metas-service';
import { obterOrcamentos } from '@/services/orcamento-service';
import { primeiroNome } from '@/services/perfil-financeiro-service';
import { obterSaude } from '@/services/saude-service';
import { diasEntre, hoje, mesAtual, paraDataLocal } from '@/utils/datas';
import { formatarCentavos } from '@/utils/moeda';

export type HumorPet = 'radiante' | 'feliz' | 'tranquilo' | 'preocupado' | 'com-fome' | 'triste';
export type EstagioPet = 'filhote' | 'jovem' | 'adulto' | 'sabio';

export const ROTULO_HUMOR: Record<HumorPet, string> = {
  radiante: 'Radiante',
  feliz: 'Feliz',
  tranquilo: 'Tranquilo',
  preocupado: 'Preocupado',
  'com-fome': 'Com fome',
  triste: 'Triste',
};

const ESTAGIOS: { estagio: EstagioPet; nome: string; nivelMinimo: number }[] = [
  { estagio: 'filhote', nome: 'Filhote', nivelMinimo: 1 },
  { estagio: 'jovem', nome: 'Jovem', nivelMinimo: 3 },
  { estagio: 'adulto', nome: 'Adulto', nivelMinimo: 5 },
  { estagio: 'sabio', nome: 'Sábio', nivelMinimo: 7 },
];

export type EstadoPet = {
  nome: string;
  humor: HumorPet;
  estagio: EstagioPet;
  nomeEstagio: string;
  /** 0 a 100 */
  energia: number;
  /** A primeira é a principal; as outras aparecem ao tocar no Eco */
  falas: string[];
  /** Ex.: "Eu evoluo para Jovem no nível 3." (null no estágio máximo) */
  proximaEvolucao: string | null;
};

export type EntradaPet = {
  nomePet: string;
  nomeUsuario: string;
  /** null = nunca registrou nada */
  diasSemRegistro: number | null;
  sequenciaAtual: number;
  notaSaude: number | null;
  orcamentosUltrapassados: string[];
  /** A meta ativa mais adiantada */
  metaMaisPerto: { nome: string; faltaCentavos: number; percentual: number } | null;
  nivel: number;
  xpFaltando: number | null;
};

export function estagioDoNivel(nivel: number) {
  let atual = ESTAGIOS[0];
  for (const e of ESTAGIOS) if (nivel >= e.nivelMinimo) atual = e;
  const proximo = ESTAGIOS[ESTAGIOS.indexOf(atual) + 1] ?? null;
  return { atual, proximo };
}

export function calcularPet(e: EntradaPet): EstadoPet {
  const nome = primeiroNome(e.nomeUsuario) || 'você';
  const dias = e.diasSemRegistro;
  const energia = dias === null ? 50 : Math.max(0, 100 - dias * 20);

  let humor: HumorPet;
  if (dias === null) humor = 'tranquilo';
  else if (dias >= 7) humor = 'triste';
  else if (dias >= 3) humor = 'com-fome';
  else if (e.orcamentosUltrapassados.length > 0 || (e.notaSaude !== null && e.notaSaude < 40)) humor = 'preocupado';
  else if ((e.notaSaude ?? 0) >= 80 && e.sequenciaAtual >= 3) humor = 'radiante';
  else if ((e.notaSaude ?? 0) >= 60 || e.sequenciaAtual >= 3) humor = 'feliz';
  else humor = 'tranquilo';

  const falas: string[] = [];
  switch (humor) {
    case 'triste':
      falas.push(`Faz ${dias} dias que você não aparece... Senti sua falta. Registra um gasto pra eu me animar?`);
      break;
    case 'com-fome':
      falas.push(`Estou com fome! 🍃 Faz ${dias} dias sem registros. Me alimente registrando seus gastos.`);
      break;
    case 'preocupado':
      falas.push(
        e.orcamentosUltrapassados.length > 0
          ? `Ei, ${nome}... o orçamento de ${e.orcamentosUltrapassados[0].toLocaleLowerCase('pt-BR')} estourou. Vamos segurar um pouco?`
          : 'Estou um pouco preocupado com as suas finanças. Que tal olhar a análise juntos?',
      );
      break;
    case 'radiante':
      falas.push(`Uau, ${nome}! Você está mandando muito bem. Estou radiante! ✨`);
      break;
    case 'feliz':
      falas.push(`Oi, ${nome}! Estou feliz com os seus hábitos. Continue assim!`);
      break;
    default:
      falas.push(
        dias === null
          ? `Oi! Eu sou o ${e.nomePet}. Registre seu primeiro gasto e eu vou crescer junto com você.`
          : `Oi, ${nome}! Tudo tranquilo por aqui. Já registrou seus gastos hoje?`,
      );
  }

  if (e.sequenciaAtual >= 2) falas.push(`🔥 ${e.sequenciaAtual} dias seguidos registrando! Não quebra a sequência!`);
  if (e.metaMaisPerto) {
    const m = e.metaMaisPerto;
    falas.push(
      m.percentual >= 50
        ? `Faltam ${formatarCentavos(m.faltaCentavos)} para "${m.nome}". Estamos quase lá!`
        : `Sua meta "${m.nome}" está em ${Math.floor(m.percentual)}%. Cada real guardado conta!`,
    );
  }

  const { atual, proximo } = estagioDoNivel(e.nivel);
  if (proximo && e.xpFaltando !== null) {
    falas.push(`Faltam ${e.xpFaltando} XP para você subir de nível. No nível ${proximo.nivelMinimo} eu viro ${proximo.nome}!`);
  }
  falas.push('Sabia que registrar os gastos todo dia é o hábito que mais ajuda a economizar?');

  return {
    nome: e.nomePet,
    humor,
    estagio: atual.estagio,
    nomeEstagio: atual.nome,
    energia,
    falas,
    proximaEvolucao: proximo ? `Eu evoluo para ${proximo.nome} no nível ${proximo.nivelMinimo}.` : null,
  };
}

const CHAVE_NOME = 'pet_nome';
export const NOME_PADRAO_PET = 'Eco';

export function nomeDoPet() {
  return lerConfiguracao(CHAVE_NOME) ?? NOME_PADRAO_PET;
}

export function renomearPet(nome: string) {
  const limpo = nome.trim().replace(/\s+/g, ' ');
  if (!limpo) throw new ErroValidacao('Dê um nome ao seu companheiro.');
  if (limpo.length > 16) throw new ErroValidacao('Use no máximo 16 letras.');
  salvarConfiguracao(CHAVE_NOME, limpo);
}

export function obterPet(nomeUsuario: string, inicioConta: string | null = null): EstadoPet {
  const dataHoje = hoje();
  const registros = listarMomentosDeRegistro().map((m) => paraDataLocal(new Date(m)));
  const ultimo = registros.sort().at(-1) ?? null;
  const jornada = obterJornada(inicioConta);
  const orcamentos = obterOrcamentos(mesAtual());
  const metaMaisPerto =
    obterMetas()
      .filter((m) => !m.concluida)
      .sort((a, b) => b.percentual - a.percentual)[0] ?? null;

  return calcularPet({
    nomePet: nomeDoPet(),
    nomeUsuario,
    diasSemRegistro: ultimo ? Math.max(0, diasEntre(ultimo, dataHoje)) : null,
    sequenciaAtual: jornada.sequenciaAtual,
    notaSaude: obterSaude().nota,
    orcamentosUltrapassados: [orcamentos.geral, ...orcamentos.categorias]
      .filter((o) => o !== null && o.situacao === 'ultrapassou')
      .map((o) => (o!.categoriaId === null ? 'mensal' : o!.nome)),
    metaMaisPerto: metaMaisPerto
      ? { nome: metaMaisPerto.nome, faltaCentavos: metaMaisPerto.faltaCentavos, percentual: metaMaisPerto.percentual }
      : null,
    nivel: jornada.nivel,
    xpFaltando: jornada.xpParaProximo !== null ? jornada.xpParaProximo - jornada.xpNoNivel : null,
  });
}
