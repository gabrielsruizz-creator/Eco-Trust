/**
 * Conta local do EcoTrust e sessão (quem está "logado" agora).
 *
 * - A conta (nome, e-mail, hash da senha) fica no cofre seguro do celular; os dados financeiros
 *   continuam no SQLite. Nada sai do aparelho.
 * - Senha: SHA-256 com sal aleatório, repetido milhares de vezes (o expo-crypto não tem PBKDF2).
 * - A sessão vive só na memória: ao abrir o app de novo (ou após 5 min em segundo plano),
 *   é preciso entrar outra vez, com senha ou biometria.
 */

import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';

import { apagarConta, gravarConta, lerConta } from '@/data/conta-storage';
import { apagarTodosOsDados } from '@/data/database';
import { ErroValidacao } from '@/services/erros';

const ITERACOES = 2000;
const MAX_TENTATIVAS = 5;
const ESPERA_BLOQUEIO_MS = 30_000;
/** Depois de quanto tempo em segundo plano o app pede para entrar de novo */
export const BLOQUEIO_SEGUNDO_PLANO_MS = 5 * 60_000;

// ---------- Sessão (estado observável pelas telas) ----------

export type Sessao = { temConta: boolean; logado: boolean };

let sessao: Sessao | null = null;
const ouvintes = new Set<() => void>();

export function lerSessao(): Sessao {
  if (!sessao) sessao = { temConta: lerConta() !== null, logado: false };
  return sessao;
}

function atualizarSessao(parcial: Partial<Sessao>) {
  sessao = { ...lerSessao(), ...parcial };
  ouvintes.forEach((o) => o());
}

export function assinarSessao(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

// ---------- Senha ----------

function paraHex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function calcularHash(senha: string, sal: string, iteracoes: number) {
  let hash = `${sal}:${senha}`;
  for (let i = 0; i < iteracoes; i++) {
    hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${hash}:${sal}`);
  }
  return hash;
}

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type DadosCadastro = { nome: string; email: string; senha: string; confirmacao: string };

export function validarCadastro(dados: DadosCadastro) {
  const nome = dados.nome.trim().replace(/\s+/g, ' ');
  const email = dados.email.trim().toLowerCase();
  if (nome.length < 2) throw new ErroValidacao('Digite seu nome.');
  if (nome.length > 40) throw new ErroValidacao('Use no máximo 40 letras no nome.');
  if (!EMAIL_VALIDO.test(email)) throw new ErroValidacao('Digite um e-mail válido.');
  if (dados.senha.length < 8) throw new ErroValidacao('A senha precisa ter pelo menos 8 caracteres.');
  if (!/[a-zA-Z]/.test(dados.senha) || !/\d/.test(dados.senha)) {
    throw new ErroValidacao('Use letras e números na senha.');
  }
  if (dados.senha !== dados.confirmacao) throw new ErroValidacao('As senhas não são iguais.');
  return { nome, email, senha: dados.senha };
}

// ---------- Conta ----------

export type ContaPublica = { nome: string; email: string; biometria: boolean; criadoEm: string };

export function obterConta(): ContaPublica | null {
  const conta = lerConta();
  if (!conta) return null;
  return { nome: conta.nome, email: conta.email, biometria: conta.biometria, criadoEm: conta.criadoEm };
}

/** Cria a conta deste aparelho e já entra nela. */
export async function criarConta(dados: DadosCadastro) {
  if (lerConta()) throw new ErroValidacao('Já existe uma conta neste aparelho.');
  const { nome, email, senha } = validarCadastro(dados);
  const sal = paraHex(Crypto.getRandomBytes(16));
  const hash = await calcularHash(senha, sal, ITERACOES);
  gravarConta({ nome, email, sal, hash, iteracoes: ITERACOES, biometria: false, criadoEm: new Date().toISOString() });
  atualizarSessao({ temConta: true, logado: true });
}

let tentativasErradas = 0;
let bloqueadoAte = 0;

/** Segundos que faltam para poder tentar de novo (0 = liberado). */
export function segundosBloqueado(agora = Date.now()) {
  return Math.max(0, Math.ceil((bloqueadoAte - agora) / 1000));
}

export async function entrar(email: string, senha: string) {
  const espera = segundosBloqueado();
  if (espera > 0) throw new ErroValidacao(`Muitas tentativas. Tente de novo em ${espera} segundos.`);
  const conta = lerConta();
  if (!conta) throw new ErroValidacao('Nenhuma conta neste aparelho. Crie uma conta.');

  const hash = await calcularHash(senha, conta.sal, conta.iteracoes);
  if (email.trim().toLowerCase() !== conta.email || hash !== conta.hash) {
    tentativasErradas++;
    if (tentativasErradas >= MAX_TENTATIVAS) {
      tentativasErradas = 0;
      bloqueadoAte = Date.now() + ESPERA_BLOQUEIO_MS;
      throw new ErroValidacao('Muitas tentativas erradas. Aguarde 30 segundos.');
    }
    throw new ErroValidacao('E-mail ou senha incorretos.');
  }
  tentativasErradas = 0;
  atualizarSessao({ logado: true });
}

export function sair() {
  atualizarSessao({ logado: false });
}

/** Apaga a conta e todos os dados financeiros deste aparelho. Não pode ser desfeito. */
export async function apagarContaEDados() {
  await apagarConta();
  apagarTodosOsDados();
  tentativasErradas = 0;
  bloqueadoAte = 0;
  atualizarSessao({ temConta: false, logado: false });
}

// ---------- Biometria ----------

/** true se o aparelho tem digital/Face ID cadastrados. */
export async function biometriaDisponivel() {
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch {
    return false;
  }
}

/** Liga a entrada por biometria (confirmando com a própria biometria) ou desliga. */
export async function definirBiometria(ativar: boolean) {
  const conta = lerConta();
  if (!conta) return false;
  if (ativar) {
    const resultado = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirme para ativar a entrada por biometria',
      cancelLabel: 'Cancelar',
    });
    if (!resultado.success) return false;
  }
  gravarConta({ ...conta, biometria: ativar });
  atualizarSessao({});
  return true;
}

/** Tenta entrar com biometria. Retorna false se a pessoa cancelar ou falhar. */
export async function entrarComBiometria() {
  const conta = lerConta();
  if (!conta?.biometria) return false;
  const resultado = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Entrar no EcoTrust',
    cancelLabel: 'Usar senha',
  });
  if (resultado.success) atualizarSessao({ logado: true });
  return resultado.success;
}
