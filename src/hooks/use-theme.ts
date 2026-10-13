/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  // Sem preferência do sistema, o EcoTrust usa o tema escuro (padrão do app).
  const theme = scheme === 'unspecified' ? 'dark' : scheme;

  return Colors[theme];
}
