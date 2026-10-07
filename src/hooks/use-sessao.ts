// Fora do React Compiler pelo mesmo motivo de use-dados.ts: estas leituras dependem de um estado
// externo (sessão/cofre seguro) e precisam ser refeitas sempre que a sessão avisa uma mudança.
'use no memo';

import { useSyncExternalStore } from 'react';

import { assinarSessao, lerSessao, obterConta } from '@/services/conta-service';

/** Estado da sessão: se existe conta neste aparelho e se a pessoa já entrou. */
export function useSessao() {
  return useSyncExternalStore(assinarSessao, lerSessao);
}

/** Dados públicos da conta (nome, e-mail, biometria). Atualiza quando a conta muda. */
export function useConta() {
  useSessao();
  return obterConta();
}
