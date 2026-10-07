/**
 * Roteiro do chat de cadastro: o EcoTrust conversa com a pessoa e monta o perfil financeiro,
 * a situação (dívidas, reserva, investimentos) e as metas.
 *
 * Funciona como uma máquina de estados simples: `passoAtual` olha o que já foi respondido e
 * devolve a próxima pergunta; `responder` valida a resposta e devolve as respostas atualizadas.
 * Tudo é puro (sem banco) até `concluirChat`, que salva o resultado.
 */

import { salvarSituacaoFinanceira } from '@/repositories/situacao-repository';
import { ErroValidacao } from '@/services/erros';
import { adicionarMeta, obterMetas } from '@/services/metas-service';
import {
  FONTES_RENDA,
  OBJETIVOS,
  primeiroNome,
  rotuloFonteRenda,
  rotuloObjetivo,
  salvarPerfil,
  sugerirMetasEconomia,
  validarPerfilFinanceiro,
} from '@/services/perfil-financeiro-service';
import type {
  FonteRenda,
  ObjetivoFinanceiro,
  SituacaoDividas,
  SituacaoInvestimentos,
  SituacaoReserva,
} from '@/types/financas';
import { hoje, nomeDoMes, somarMesesNaData } from '@/utils/datas';
import { formatarCentavos, lerValorEmCentavos } from '@/utils/moeda';

export type MetaDesejada = {
  nome: string;
  valorCentavos?: number;
  /** null = sem prazo; undefined = ainda não respondeu */
  prazoMeses?: number | null;
  /** Valor que a pessoa já tem guardado para esta meta */
  inicialCentavos: number;
};

export type RespostasChat = {
  nome?: string;
  rendaCentavos?: number;
  fonte?: FonteRenda;
  fixasCentavos?: number;
  dividas?: SituacaoDividas;
  reserva?: SituacaoReserva;
  reservaValorCentavos?: number;
  investe?: SituacaoInvestimentos;
  objetivo?: ObjetivoFinanceiro;
  sonhos?: string[];
  outraMeta?: string;
  metas?: MetaDesejada[];
  metaEconomiaCentavos?: number;
  confirmado?: boolean;
};

export type Opcao = { valor: string; rotulo: string };

export type Entrada =
  | { tipo: 'texto'; placeholder: string; sugestoes?: Opcao[] }
  | { tipo: 'valor'; permitirZero: boolean; sugestoes?: Opcao[] }
  | { tipo: 'opcoes'; opcoes: Opcao[] }
  | { tipo: 'multipla'; opcoes: Opcao[]; exclusiva?: string };

export type PassoChat = { id: string; mensagens: string[]; entrada: Entrada };

export type ResultadoResposta = { respostas: RespostasChat; textoUsuario: string; reacao: string | null };

const OPCOES_DIVIDAS: Opcao[] = [
  { valor: 'nao', rotulo: 'Não tenho dívidas' },
  { valor: 'controlada', rotulo: 'Tenho, mas está sob controle' },
  { valor: 'pesando', rotulo: 'Tenho, e está pesando' },
];
const OPCOES_RESERVA: Opcao[] = [
  { valor: 'nao', rotulo: 'Não tenho' },
  { valor: 'parcial', rotulo: 'Tenho um pouco' },
  { valor: 'completa', rotulo: 'Tenho 6 meses ou mais' },
];
const OPCOES_INVESTE: Opcao[] = [
  { valor: 'nao', rotulo: 'Ainda não' },
  { valor: 'poupanca', rotulo: 'Só na poupança' },
  { valor: 'outros', rotulo: 'Sim, em outros investimentos' },
];
const OPCOES_PRAZO: Opcao[] = [
  { valor: '6', rotulo: 'Em 6 meses' },
  { valor: '12', rotulo: 'Em 1 ano' },
  { valor: '24', rotulo: 'Em 2 anos' },
  { valor: '60', rotulo: 'Em 5 anos' },
  { valor: 'sem', rotulo: 'Sem prazo' },
];

const RESERVA = 'Reserva de emergência';
const OUTRA = 'Outra';
const NENHUMA = 'Nenhuma por enquanto';

function rotuloDe(opcoes: Opcao[], valor: string) {
  return opcoes.find((o) => o.valor === valor)?.rotulo ?? valor;
}

function opcoesSonhos(r: RespostasChat): Opcao[] {
  const nomes = [
    ...(r.reserva !== 'completa' ? [RESERVA] : []),
    ...(r.dividas && r.dividas !== 'nao' ? ['Quitar dívidas'] : []),
    'Viagem',
    'Comprar um carro',
    'Casa própria',
    'Estudos',
    'Aposentadoria',
    OUTRA,
    NENHUMA,
  ];
  return nomes.map((n) => ({ valor: n, rotulo: n }));
}

/** Quanto guardar por mês para cumprir todas as metas com prazo. */
export function somaMensalDasMetas(metas: MetaDesejada[] = []) {
  return metas.reduce((soma, m) => {
    if (!m.valorCentavos || !m.prazoMeses) return soma;
    return soma + Math.ceil(Math.max(0, m.valorCentavos - m.inicialCentavos) / m.prazoMeses);
  }, 0);
}

function sobra(r: RespostasChat) {
  return (r.rendaCentavos ?? 0) - (r.fixasCentavos ?? 0);
}

function linhasResumo(r: RespostasChat) {
  const linhas = [
    `Renda: ${formatarCentavos(r.rendaCentavos ?? 0)} (${rotuloFonteRenda(r.fonte ?? 'outra')})`,
    `Contas fixas: ${formatarCentavos(r.fixasCentavos ?? 0)}`,
    `Dívidas: ${rotuloDe(OPCOES_DIVIDAS, r.dividas ?? 'nao')}`,
    `Reserva: ${rotuloDe(OPCOES_RESERVA, r.reserva ?? 'nao')}`,
    `Objetivo: ${rotuloObjetivo(r.objetivo ?? 'controlar')}`,
    `Guardar por mês: ${formatarCentavos(r.metaEconomiaCentavos ?? 0)}`,
  ];
  for (const m of r.metas ?? []) {
    linhas.push(
      `Meta: ${m.nome}, ${formatarCentavos(m.valorCentavos ?? 0)}${m.prazoMeses ? ` em ${m.prazoMeses} meses` : ''}`,
    );
  }
  return linhas.map((l) => `• ${l}`).join('\n');
}

/** Próxima pergunta, ou null quando a conversa terminou (resumo confirmado). */
export function passoAtual(r: RespostasChat, nomeConta?: string): PassoChat | null {
  if (r.nome === undefined) {
    const sugerido = nomeConta ? primeiroNome(nomeConta) : '';
    return {
      id: 'nome',
      mensagens: [
        'Oi! Eu sou o EcoTrust, seu assistente financeiro.',
        'Vou te fazer algumas perguntas rápidas para entender sua vida financeira. Leva uns 2 minutos.',
        'Como você prefere que eu te chame?',
      ],
      entrada: {
        tipo: 'texto',
        placeholder: 'Seu nome',
        sugestoes: sugerido ? [{ valor: sugerido, rotulo: sugerido }] : undefined,
      },
    };
  }
  if (r.rendaCentavos === undefined) {
    return {
      id: 'renda',
      mensagens: [
        `Prazer, ${r.nome}!`,
        'Quanto você recebe por mês, em média? Se a sua renda varia, pense numa média dos últimos meses.',
      ],
      entrada: { tipo: 'valor', permitirZero: true },
    };
  }
  if (r.fonte === undefined) {
    return {
      id: 'fonte',
      mensagens: ['E de onde vem a maior parte desse dinheiro?'],
      entrada: { tipo: 'opcoes', opcoes: FONTES_RENDA.map((f) => ({ valor: f.valor, rotulo: f.rotulo })) },
    };
  }
  if (r.fixasCentavos === undefined) {
    return {
      id: 'fixas',
      mensagens: [
        'Quanto você gasta por mês com contas fixas?',
        'Some o que se repete todo mês: aluguel, condomínio, luz, água, internet, celular, escola, assinaturas. Um valor aproximado já ajuda.',
      ],
      entrada: { tipo: 'valor', permitirZero: true },
    };
  }
  if (r.dividas === undefined) {
    return {
      id: 'dividas',
      mensagens: ['Você tem alguma dívida hoje? Cartão, empréstimo, financiamento...'],
      entrada: { tipo: 'opcoes', opcoes: OPCOES_DIVIDAS },
    };
  }
  if (r.reserva === undefined) {
    return {
      id: 'reserva',
      mensagens: ['Você tem algum dinheiro guardado para emergências?'],
      entrada: { tipo: 'opcoes', opcoes: OPCOES_RESERVA },
    };
  }
  if (r.reserva === 'parcial' && r.reservaValorCentavos === undefined) {
    return {
      id: 'reserva-valor',
      mensagens: ['Quanto você tem guardado, mais ou menos?'],
      entrada: { tipo: 'valor', permitirZero: true },
    };
  }
  if (r.investe === undefined) {
    return {
      id: 'investe',
      mensagens: ['Você já investe o seu dinheiro?'],
      entrada: { tipo: 'opcoes', opcoes: OPCOES_INVESTE },
    };
  }
  if (r.objetivo === undefined) {
    return {
      id: 'objetivo',
      mensagens: ['Qual é o seu principal objetivo com o dinheiro agora?'],
      entrada: { tipo: 'opcoes', opcoes: OBJETIVOS.map((o) => ({ valor: o.valor, rotulo: o.rotulo })) },
    };
  }
  if (r.sonhos === undefined) {
    return {
      id: 'sonhos',
      mensagens: [
        'Agora a parte boa: quais conquistas você quer realizar?',
        'Pode escolher mais de uma. Eu crio as metas para você acompanhar.',
      ],
      entrada: { tipo: 'multipla', opcoes: opcoesSonhos(r), exclusiva: NENHUMA },
    };
  }
  if (r.sonhos.includes(OUTRA) && r.outraMeta === undefined) {
    return {
      id: 'outra-meta',
      mensagens: ['Qual é essa outra conquista?'],
      entrada: { tipo: 'texto', placeholder: 'Ex.: Festa de casamento' },
    };
  }
  const indice = (r.metas ?? []).findIndex((m) => m.valorCentavos === undefined || m.prazoMeses === undefined);
  if (indice >= 0) {
    const meta = r.metas![indice];
    if (meta.valorCentavos === undefined) {
      const sugestoes: Opcao[] = [];
      if (meta.nome === RESERVA && (r.fixasCentavos ?? 0) > 0) {
        const seisMeses = (r.fixasCentavos ?? 0) * 6;
        sugestoes.push({ valor: String(seisMeses), rotulo: `${formatarCentavos(seisMeses)} (6 meses de contas)` });
      }
      return {
        id: `meta-valor:${indice}`,
        mensagens: [`Quanto você precisa juntar para "${meta.nome}"?`],
        entrada: { tipo: 'valor', permitirZero: false, sugestoes },
      };
    }
    return {
      id: `meta-prazo:${indice}`,
      mensagens: [`E para quando você quer "${meta.nome}"?`],
      entrada: { tipo: 'opcoes', opcoes: OPCOES_PRAZO },
    };
  }
  if (r.metaEconomiaCentavos === undefined) {
    const sugestoes: Opcao[] = [];
    const paraMetas = somaMensalDasMetas(r.metas);
    if (paraMetas > 0) {
      sugestoes.push({ valor: String(paraMetas), rotulo: `${formatarCentavos(paraMetas)} (para as metas no prazo)` });
    }
    for (const s of sugerirMetasEconomia(r.rendaCentavos ?? 0, r.fixasCentavos ?? 0)) {
      if (s !== paraMetas) sugestoes.push({ valor: String(s), rotulo: formatarCentavos(s) });
    }
    sugestoes.push({ valor: '0', rotulo: 'Ainda não sei' });
    return {
      id: 'economia',
      mensagens: ['Última pergunta: quanto você quer guardar por mês?'],
      entrada: { tipo: 'valor', permitirZero: true, sugestoes },
    };
  }
  if (!r.confirmado) {
    return {
      id: 'resumo',
      mensagens: ['Pronto! Veja o que eu entendi:', linhasResumo(r), 'Está tudo certo?'],
      entrada: {
        tipo: 'opcoes',
        opcoes: [
          { valor: 'sim', rotulo: 'Está certo, vamos começar!' },
          { valor: 'refazer', rotulo: 'Quero recomeçar' },
        ],
      },
    };
  }
  return null;
}

function lerValor(texto: string, permitirZero: boolean) {
  const valor = lerValorEmCentavos(texto, permitirZero);
  if (valor === null) {
    throw new ErroValidacao(permitirZero ? 'Digite um valor, como 2500 ou 2.500,00.' : 'Digite um valor maior que zero.');
  }
  return valor;
}

function exigirOpcao(opcoes: Opcao[], valor: string) {
  if (!opcoes.some((o) => o.valor === valor)) throw new ErroValidacao('Escolha uma das opções.');
  return valor;
}

/** Registra a resposta do passo atual. Lança ErroValidacao com a mensagem para mostrar no chat. */
export function responder(r: RespostasChat, passo: PassoChat, resposta: string | string[]): ResultadoResposta {
  const texto = Array.isArray(resposta) ? '' : resposta.trim();
  const [id, indiceTexto] = passo.id.split(':');

  switch (id) {
    case 'nome': {
      const nome = texto.replace(/\s+/g, ' ');
      if (nome.length < 1 || nome.length > 40) throw new ErroValidacao('Digite como quer ser chamado (até 40 letras).');
      return { respostas: { ...r, nome }, textoUsuario: nome, reacao: null };
    }
    case 'renda': {
      const renda = lerValor(texto, true);
      return {
        respostas: { ...r, rendaCentavos: renda },
        textoUsuario: formatarCentavos(renda),
        reacao: renda === 0 ? 'Tudo bem. Dá para organizar as finanças mesmo assim.' : null,
      };
    }
    case 'fonte': {
      const fonte = exigirOpcao(FONTES_RENDA.map((f) => ({ valor: f.valor, rotulo: f.rotulo })), texto) as FonteRenda;
      return { respostas: { ...r, fonte }, textoUsuario: rotuloFonteRenda(fonte), reacao: null };
    }
    case 'fixas': {
      const fixas = lerValor(texto, true);
      const novas = { ...r, fixasCentavos: fixas };
      const resto = sobra(novas);
      let reacao: string | null = null;
      if ((r.rendaCentavos ?? 0) > 0) {
        reacao =
          resto >= 0
            ? `Então sobram cerca de ${formatarCentavos(resto)} por mês depois das contas fixas.`
            : 'Suas contas fixas passam da sua renda. Vamos trabalhar nisso juntos.';
      }
      return { respostas: novas, textoUsuario: formatarCentavos(fixas), reacao };
    }
    case 'dividas': {
      const dividas = exigirOpcao(OPCOES_DIVIDAS, texto) as SituacaoDividas;
      return {
        respostas: { ...r, dividas },
        textoUsuario: rotuloDe(OPCOES_DIVIDAS, dividas),
        reacao:
          dividas === 'pesando'
            ? 'Obrigado pela sinceridade. Organizar as dívidas vai ser prioridade.'
            : dividas === 'controlada'
              ? 'Que bom que está sob controle.'
              : null,
      };
    }
    case 'reserva': {
      const reserva = exigirOpcao(OPCOES_RESERVA, texto) as SituacaoReserva;
      return {
        respostas: { ...r, reserva, reservaValorCentavos: reserva === 'parcial' ? undefined : 0 },
        textoUsuario: rotuloDe(OPCOES_RESERVA, reserva),
        reacao:
          reserva === 'nao'
            ? 'Sem problemas: montar uma reserva costuma ser o primeiro passo.'
            : reserva === 'completa'
              ? 'Excelente! Isso dá muita segurança.'
              : null,
      };
    }
    case 'reserva-valor': {
      const valor = lerValor(texto, true);
      return { respostas: { ...r, reservaValorCentavos: valor }, textoUsuario: formatarCentavos(valor), reacao: null };
    }
    case 'investe': {
      const investe = exigirOpcao(OPCOES_INVESTE, texto) as SituacaoInvestimentos;
      return { respostas: { ...r, investe }, textoUsuario: rotuloDe(OPCOES_INVESTE, investe), reacao: null };
    }
    case 'objetivo': {
      const objetivo = exigirOpcao(OBJETIVOS.map((o) => ({ valor: o.valor, rotulo: o.rotulo })), texto) as ObjetivoFinanceiro;
      return { respostas: { ...r, objetivo }, textoUsuario: rotuloObjetivo(objetivo), reacao: null };
    }
    case 'sonhos': {
      const escolhidos = Array.isArray(resposta) ? resposta : [];
      const validos = opcoesSonhos(r).map((o) => o.valor);
      if (escolhidos.length === 0 || escolhidos.some((s) => !validos.includes(s))) {
        throw new ErroValidacao('Escolha pelo menos uma opção.');
      }
      const sonhos = escolhidos.includes(NENHUMA) ? [] : escolhidos;
      const metas: MetaDesejada[] = sonhos
        .filter((s) => s !== OUTRA)
        .map((nome) => ({ nome, inicialCentavos: nome === RESERVA ? (r.reservaValorCentavos ?? 0) : 0 }));
      return {
        respostas: { ...r, sonhos, metas },
        textoUsuario: escolhidos.join(', '),
        reacao: sonhos.length === 0 ? 'Tudo bem! Você pode criar metas quando quiser, na aba Planejar.' : null,
      };
    }
    case 'outra-meta': {
      const nome = texto.replace(/\s+/g, ' ');
      if (nome.length < 1 || nome.length > 40) throw new ErroValidacao('Dê um nome para a conquista (até 40 letras).');
      return {
        respostas: { ...r, outraMeta: nome, metas: [...(r.metas ?? []), { nome, inicialCentavos: 0 }] },
        textoUsuario: nome,
        reacao: null,
      };
    }
    case 'meta-valor': {
      const i = Number(indiceTexto);
      const valor = lerValor(texto, false);
      const metas = (r.metas ?? []).map((m, k) => (k === i ? { ...m, valorCentavos: valor } : m));
      return { respostas: { ...r, metas }, textoUsuario: formatarCentavos(valor), reacao: null };
    }
    case 'meta-prazo': {
      const i = Number(indiceTexto);
      const escolha = exigirOpcao(OPCOES_PRAZO, texto);
      const prazoMeses = escolha === 'sem' ? null : Number(escolha);
      const metas = (r.metas ?? []).map((m, k) => (k === i ? { ...m, prazoMeses } : m));
      const meta = metas[i];
      let reacao: string | null = null;
      if (prazoMeses && meta.valorCentavos) {
        const porMes = Math.ceil(Math.max(0, meta.valorCentavos - meta.inicialCentavos) / prazoMeses);
        const data = somarMesesNaData(hoje(), prazoMeses);
        reacao =
          porMes > 0
            ? `Para chegar lá até ${nomeDoMes(data.slice(0, 7))}, seria cerca de ${formatarCentavos(porMes)} por mês.`
            : 'Você já tem o valor desta meta. Ótimo!';
      }
      return { respostas: { ...r, metas }, textoUsuario: rotuloDe(OPCOES_PRAZO, escolha), reacao };
    }
    case 'economia': {
      const valor = lerValor(texto, true);
      const resto = sobra(r);
      const reacao =
        valor > 0 && (r.rendaCentavos ?? 0) > 0 && valor > Math.max(resto, 0)
          ? `Isso é mais do que sobra hoje depois das contas fixas (${formatarCentavos(Math.max(resto, 0))}). Vamos ver juntos onde ajustar.`
          : null;
      return {
        respostas: { ...r, metaEconomiaCentavos: valor },
        textoUsuario: valor === 0 ? 'Ainda não sei' : formatarCentavos(valor),
        reacao,
      };
    }
    case 'resumo': {
      if (texto === 'refazer') {
        return { respostas: {}, textoUsuario: 'Quero recomeçar', reacao: 'Sem problemas, vamos de novo!' };
      }
      exigirOpcao([{ valor: 'sim', rotulo: '' }], texto);
      return { respostas: { ...r, confirmado: true }, textoUsuario: 'Está certo, vamos começar!', reacao: null };
    }
    default:
      throw new ErroValidacao('Pergunta desconhecida.');
  }
}

/**
 * Salva tudo o que a conversa coletou. As metas e a situação são salvas antes do perfil,
 * porque salvar o perfil libera o app (o Expo Router sai do cadastro sozinho).
 * Ao refazer a conversa depois, `pularMetasExistentes` evita duplicar metas com o mesmo nome.
 */
export function concluirChat(r: RespostasChat, opcoes: { pularMetasExistentes?: boolean } = {}) {
  if (
    !r.confirmado ||
    r.nome === undefined ||
    r.rendaCentavos === undefined ||
    r.fonte === undefined ||
    r.fixasCentavos === undefined ||
    r.dividas === undefined ||
    r.reserva === undefined ||
    r.investe === undefined ||
    r.objetivo === undefined ||
    r.metaEconomiaCentavos === undefined
  ) {
    throw new ErroValidacao('A conversa ainda não terminou.');
  }

  const perfil = validarPerfilFinanceiro({
    nome: r.nome,
    rendaMensalCentavos: r.rendaCentavos,
    fonteRenda: r.fonte,
    despesasFixasCentavos: r.fixasCentavos,
    objetivo: r.objetivo,
    metaEconomiaCentavos: r.metaEconomiaCentavos,
  });

  salvarSituacaoFinanceira({ dividas: r.dividas, reserva: r.reserva, investe: r.investe });
  const existentes = new Set(
    opcoes.pularMetasExistentes ? obterMetas().map((m) => m.nome.toLocaleLowerCase('pt-BR')) : [],
  );
  for (const m of r.metas ?? []) {
    if (!m.valorCentavos || existentes.has(m.nome.toLocaleLowerCase('pt-BR'))) continue;
    adicionarMeta(
      {
        nome: m.nome,
        objetivoCentavos: m.valorCentavos,
        prazo: m.prazoMeses ? somarMesesNaData(hoje(), m.prazoMeses) : null,
      },
      Math.min(m.inicialCentavos, m.valorCentavos),
    );
  }
  salvarPerfil(perfil);
}
