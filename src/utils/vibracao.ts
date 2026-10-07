/**
 * Toques de vibração (haptics) curtos para confirmar ações.
 * Falhas são ignoradas: em aparelhos sem motor de vibração nada acontece.
 */

import * as Haptics from 'expo-haptics';

/** Ao escolher uma opção (chips, abas internas). */
export function vibrarSelecao() {
  Haptics.selectionAsync().catch(() => {});
}

/** Toque leve (ex.: tocar no mascote). */
export function vibrarLeve() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Algo foi salvo ou conquistado. */
export function vibrarSucesso() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** O formulário tem um erro para corrigir. */
export function vibrarErro() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
