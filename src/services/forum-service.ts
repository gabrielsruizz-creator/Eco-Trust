/**
 * Fórum da Trust Academy (protótipo local).
 * Por enquanto tudo fica no aparelho: tópicos de exemplo + o que o usuário publica.
 * As regras de validação e privacidade já valem para quando o fórum for online.
 */

import { CATEGORIAS_ACADEMY } from '@/data/academy-conteudo';
import {
  apagarRespostaMinha,
  apagarTopicoMeu,
  buscarTopico,
  inserirResposta,
  inserirTopico,
  listarRespostas,
  listarTopicos,
} from '@/repositories/forum-repository';
import { obterConta } from '@/services/conta-service';
import { ErroValidacao } from '@/services/erros';

export const LIMITES_FORUM = {
  titulo: { min: 5, max: 120 },
  texto: { min: 10, max: 2000 },
  resposta: { min: 2, max: 1000 },
} as const;

export const REGRAS_FORUM = [
  'Seja gentil: todo mundo está aprendendo.',
  'Não publique CPF, número de cartão, conta, telefone ou e-mail.',
  'Compartilhe experiências, não recomendações de investimento.',
  'Nunca envie senhas ou códigos para ninguém, nem para "suporte".',
];

/**
 * Bloqueia dados pessoais que costumam aparecer por engano: e-mails e sequências longas
 * de números (CPF, cartão, conta, telefone), mesmo com pontos, traços ou espaços.
 */
export function contemDadosPessoais(texto: string): boolean {
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(texto)) return true;
  const soDigitosJuntos = texto.replace(/(\d)[\s.\-/()]+(?=\d)/g, '$1');
  return /\d{10,}/.test(soDigitosJuntos);
}

function validarTexto(valor: string, campo: string, limites: { min: number; max: number }) {
  const limpo = valor.trim().replace(/\n{3,}/g, '\n\n');
  if (limpo.length < limites.min) throw new ErroValidacao(`${campo} precisa ter pelo menos ${limites.min} caracteres.`);
  if (limpo.length > limites.max) throw new ErroValidacao(`${campo} pode ter no máximo ${limites.max} caracteres.`);
  if (contemDadosPessoais(limpo)) {
    throw new ErroValidacao('Para sua segurança, não publique e-mails nem números de documentos, cartões, contas ou telefones.');
  }
  return limpo;
}

/** Nome mostrado nas publicações: só o primeiro nome da conta. */
function nomeDoAutor() {
  return obterConta()?.nome.trim().split(/\s+/)[0] || 'Você';
}

export function obterForum(categoriaId: string | null) {
  return { topicos: listarTopicos(categoriaId), categorias: CATEGORIAS_ACADEMY };
}

export function obterTopico(id: number) {
  const topico = buscarTopico(id);
  if (!topico) return null;
  return {
    topico,
    categoria: CATEGORIAS_ACADEMY.find((c) => c.id === topico.categoriaId) ?? null,
    respostas: listarRespostas(id),
  };
}

export function criarTopico(dados: { categoriaId: string; titulo: string; texto: string }): number {
  if (!CATEGORIAS_ACADEMY.some((c) => c.id === dados.categoriaId)) throw new ErroValidacao('Escolha um tema.');
  const titulo = validarTexto(dados.titulo, 'O título', LIMITES_FORUM.titulo);
  const texto = validarTexto(dados.texto, 'A mensagem', LIMITES_FORUM.texto);
  return inserirTopico({ categoriaId: dados.categoriaId, titulo, texto, autor: nomeDoAutor() });
}

export function responderTopico(topicoId: number, texto: string): number {
  if (!buscarTopico(topicoId)) throw new ErroValidacao('Este tópico não existe mais.');
  const limpo = validarTexto(texto, 'A resposta', LIMITES_FORUM.resposta);
  return inserirResposta({ topicoId, texto: limpo, autor: nomeDoAutor() });
}

export function excluirTopico(id: number) {
  if (!apagarTopicoMeu(id)) throw new ErroValidacao('Você só pode excluir os seus próprios tópicos.');
}

export function excluirResposta(id: number) {
  if (!apagarRespostaMinha(id)) throw new ErroValidacao('Você só pode excluir as suas próprias respostas.');
}
