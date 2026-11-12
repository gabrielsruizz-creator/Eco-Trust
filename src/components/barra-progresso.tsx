import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type Props = {
  /** De 0 a 100. Valores fora disso são limitados. */
  percentual: number;
  cor?: string;
  altura?: number;
  /** Texto lido pelo leitor de tela, ex.: "Alimentação, 35% dos gastos" */
  rotuloAcessivel?: string;
};

export function BarraProgresso({ percentual, cor, altura = 8, rotuloAcessivel }: Props) {
  const theme = useTheme();
  const limitado = Math.max(0, Math.min(100, percentual));

  return (
    <View
      style={[styles.trilho, { height: altura, borderRadius: altura / 2, backgroundColor: theme.backgroundSelected }]}
      accessibilityRole="progressbar"
      accessibilityLabel={rotuloAcessivel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(limitado) }}>
      <View
        style={[
          styles.preenchimento,
          { width: `${limitado}%`, borderRadius: altura / 2, backgroundColor: cor ?? theme.accent },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  trilho: {
    overflow: 'hidden',
  },
  preenchimento: {
    height: '100%',
  },
});
