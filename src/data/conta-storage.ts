/**
 * Armazena a conta local (nome, e-mail e hash da senha) no cofre seguro do sistema
 * (Keychain no iOS, Keystore no Android) via expo-secure-store. Nunca guarda a senha em si.
 */

import * as SecureStore from 'expo-secure-store';

const CHAVE_CONTA = 'ecotrust_conta';

export type ContaArmazenada = {
  nome: string;
  email: string;
  /** Sal aleatório (hex) e hash SHA-256 iterado (hex) da senha */
  sal: string;
  hash: string;
  iteracoes: number;
  biometria: boolean;
  criadoEm: string;
};

export function lerConta(): ContaArmazenada | null {
  try {
    const texto = SecureStore.getItem(CHAVE_CONTA);
    return texto ? (JSON.parse(texto) as ContaArmazenada) : null;
  } catch {
    return null;
  }
}

export function gravarConta(conta: ContaArmazenada) {
  SecureStore.setItem(CHAVE_CONTA, JSON.stringify(conta));
}

export async function apagarConta() {
  await SecureStore.deleteItemAsync(CHAVE_CONTA);
}
