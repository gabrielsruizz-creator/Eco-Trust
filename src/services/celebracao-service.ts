/**
 * Mantém a jornada atualizada enquanto o app é usado e avisa quando há conquistas novas.
 * Sempre que os dados mudam, sincroniza (com um pequeno atraso para juntar várias escritas).
 */

import { assinarMudancas } from '@/data/database';
import { sincronizarJornada, type DefinicaoConquista } from '@/services/gamificacao-service';

const ouvintes = new Set<(novas: DefinicaoConquista[]) => void>();

export function assinarCelebracoes(ouvinte: (novas: DefinicaoConquista[]) => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

/** Liga a sincronização automática. Retorna a função para desligar. */
export function iniciarSincronizacaoJornada() {
  let agendado: ReturnType<typeof setTimeout> | null = null;
  const sincronizar = (comemorar = true) => {
    agendado = null;
    try {
      const novas = sincronizarJornada();
      if (comemorar && novas.length > 0) ouvintes.forEach((o) => o(novas));
    } catch {
      // A jornada é um extra: um erro aqui nunca pode atrapalhar o uso do app.
    }
  };
  const parar = assinarMudancas(() => {
    if (agendado === null) agendado = setTimeout(sincronizar, 400);
  });
  // Ao abrir o app, só registra o que já foi alcançado (sem uma fila de avisos de uma vez).
  sincronizar(false);
  return () => {
    parar();
    if (agendado !== null) clearTimeout(agendado);
  };
}
