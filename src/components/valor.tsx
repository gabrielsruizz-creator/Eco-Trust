import type { TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatarCentavos } from '@/utils/moeda';

/** Valor em reais com os centavos apagados: "R$ 412" forte + ",30" claro. */
export function Valor({
  centavos,
  sinal,
  style,
}: {
  centavos: number;
  /** "+" ou "−" antes do valor */
  sinal?: string;
  style?: TextStyle | TextStyle[];
}) {
  const theme = useTheme();
  const texto = formatarCentavos(Math.abs(centavos));
  const virgula = texto.lastIndexOf(',');
  return (
    <ThemedText style={style} numberOfLines={1}>
      {sinal ? `${sinal} ` : ''}
      {texto.slice(0, virgula)}
      <ThemedText style={[style, { color: theme.textMuted }]}>{texto.slice(virgula)}</ThemedText>
    </ThemedText>
  );
}
