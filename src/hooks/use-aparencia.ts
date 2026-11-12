import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform } from 'react-native';

import { usePreferencias } from '@/hooks/use-dados';

/** Liquid Glass nativo: só no iOS 26+ e quando a API existe (algumas versões beta não têm). */
function temVidroNativo() {
  if (Platform.OS !== 'ios') return false;
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
}

const VIDRO_NATIVO = temVidroNativo();

/**
 * Estilo dos cartões escolhido nas Preferências.
 * - vidro: cartões translúcidos sobre um fundo com manchas de cor (Liquid Glass);
 * - nativo: o vidro de verdade da Apple está disponível; senão o app imita com transparência.
 */
export function useAparencia() {
  const vidro = usePreferencias().vidro;
  return { vidro, nativo: vidro && VIDRO_NATIVO, vidroNativoDisponivel: VIDRO_NATIVO };
}
