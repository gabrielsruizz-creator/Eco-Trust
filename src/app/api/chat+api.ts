/**
 * Rota de servidor: recebe a conversa do app e consulta o Claude.
 * Roda no computador (servidor do Expo), então a chave da API nunca vai para o celular.
 */

import Anthropic from '@anthropic-ai/sdk';

const MAX_MENSAGENS = 20;
const MAX_CARACTERES = 4000;
/** O resumo dos dados (perfil, meses, orçamentos, metas e análise) pode ser maior que uma mensagem. */
const MAX_CONTEXTO = 12000;

const INSTRUCOES = `Você é o EcoTrust, o assistente financeiro pessoal de um aplicativo brasileiro de organização financeira. Você conversa com pessoas comuns, muitas sem experiência com investimentos, e as ajuda a organizar o orçamento e a entender como investir de acordo com o perfil delas.

Como trabalhar:
- Use os dados financeiros e o perfil de investidor do usuário (enviados abaixo) para personalizar as respostas. Cite números reais dele quando ajudar.
- Os dados incluem orçamentos, metas e uma "análise automática" que o app já mostra na tela. Mantenha coerência com esses números; pode aprofundar e explicar, mas não contradiga a análise sem explicar o porquê.
- Siga a ordem de prioridades de educação financeira: primeiro quitar dívidas caras (cartão, cheque especial), depois montar uma reserva de emergência (cerca de 6 meses de gastos, em aplicação segura e com resgate rápido), e só então investir para objetivos de médio e longo prazo.
- Ao falar de investimentos, explique classes de ativos (Tesouro Direto, CDB, LCI/LCA, fundos, ações, FIIs etc.), seus riscos, liquidez e tributação, e quais costumam combinar com o perfil do usuário.
- Se a pessoa não respondeu o questionário de perfil, sugira que responda na aba "Perfil" antes de falar de investimentos com risco.
- O app tem um Impostômetro pessoal: mostra quanto das despesas foi imposto sobre consumo (ICMS, PIS/Cofins, IPI, ISS, IOF e tributos embutidos no preço). Use esses números para explicar a carga tributária do dia a dia e onde ela pesa mais. Deixe claro que os valores sem nota fiscal são estimativas e não incentive sonegação nem compras sem nota.

Limites (importante, por causa das regras da CVM):
- Seu papel é educativo. Não recomende ativos específicos (tickers, fundos ou produtos de uma instituição específica) nem diga para comprar ou vender algo. Se pedirem, explique as características do tipo de ativo e sugira consultar um profissional certificado ou a plataforma da corretora.
- Não prometa rentabilidade. Deixe claro que investimentos com risco podem perder valor.
- Para dúvidas fora de finanças pessoais, responda brevemente e volte ao tema.

Formato:
- Responda em português do Brasil, com linguagem simples e acolhedora.
- Seja breve: a resposta aparece na tela de um celular. Prefira parágrafos curtos e listas simples com hífen.
- Não use Markdown (sem **, #, tabelas), porque o app mostra texto puro.`;

type MensagemApp = { role: 'user' | 'assistant'; content: string };

function validarMensagens(valor: unknown): MensagemApp[] | null {
  if (!Array.isArray(valor) || valor.length === 0) return null;
  const mensagens = valor.slice(-MAX_MENSAGENS);
  for (const m of mensagens) {
    if (
      typeof m !== 'object' ||
      m === null ||
      (m.role !== 'user' && m.role !== 'assistant') ||
      typeof m.content !== 'string' ||
      m.content.length > MAX_CARACTERES
    ) {
      return null;
    }
  }
  // A conversa enviada ao Claude precisa começar com uma mensagem do usuário.
  while (mensagens.length > 0 && mensagens[0].role !== 'user') mensagens.shift();
  return mensagens.length > 0 ? (mensagens as MensagemApp[]) : null;
}

export async function POST(request: Request) {
  let corpo: { mensagens?: unknown; contexto?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: 'Requisição inválida.' }, { status: 400 });
  }

  const mensagens = validarMensagens(corpo.mensagens);
  const contexto = typeof corpo.contexto === 'string' ? corpo.contexto.slice(0, MAX_CONTEXTO) : '';
  if (!mensagens) {
    return Response.json({ erro: 'Mensagens inválidas.' }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { erro: 'A chave da API não foi configurada. Coloque ANTHROPIC_API_KEY no arquivo .env.local e reinicie o "npx expo start".' },
      { status: 500 },
    );
  }

  try {
    const client = new Anthropic();
    const resposta = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      output_config: { effort: 'medium' },
      // Se o modelo recusar por segurança, a API tenta automaticamente outro modelo.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [
        { type: 'text', text: INSTRUCOES },
        { type: 'text', text: `Dados do usuário:\n${contexto || 'Nenhum dado disponível.'}` },
      ],
      messages: mensagens,
    });

    if (resposta.stop_reason === 'refusal') {
      return Response.json({
        resposta: 'Não posso ajudar com esse pedido. Que tal perguntar sobre seus gastos ou sobre como começar a investir?',
      });
    }

    const texto = resposta.content
      .filter((bloco) => bloco.type === 'text')
      .map((bloco) => bloco.text)
      .join('\n')
      .trim();

    return Response.json({ resposta: texto || 'Não consegui gerar uma resposta. Tente perguntar de outro jeito.' });
  } catch (erro) {
    if (erro instanceof Anthropic.AuthenticationError) {
      return Response.json({ erro: 'A chave da API é inválida. Confira o arquivo .env.local.' }, { status: 500 });
    }
    if (erro instanceof Anthropic.RateLimitError) {
      return Response.json({ erro: 'Muitas perguntas seguidas. Espere alguns segundos e tente de novo.' }, { status: 429 });
    }
    if (erro instanceof Anthropic.APIError) {
      console.error('Erro da API do Claude:', erro.status, erro.message);
      return Response.json({ erro: 'O assistente está indisponível no momento. Tente de novo em instantes.' }, { status: 502 });
    }
    console.error('Erro inesperado no /api/chat:', erro);
    return Response.json({ erro: 'Erro inesperado no servidor.' }, { status: 500 });
  }
}
