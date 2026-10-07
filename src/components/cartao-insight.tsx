import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TomInsight = 'alerta' | 'positivo' | 'neutro';

const TITULO_PADRAO: Record<TomInsight, string> = {
  alerta: 'Atenção',
  positivo: 'Muito bem',
  neutro: 'EcoTrust analisou',
};

type Props = {
  tom: TomInsight;
  texto: string;
  /** Sem título, usa "Atenção" / "Muito bem" / "EcoTrust analisou" conforme o tom */
  titulo?: string;
  /** Etiqueta pequena acima do título, ex.: "Gastos" */
  etiqueta?: string;
  /** Conteúdo extra no fim do cartão (ex.: um botão de ação) */
  children?: ReactNode;
};

/** Cartão de insight: fundo suave e borda na cor do tom, sempre com título em texto (não só cor). */
export function CartaoInsight({ tom, texto, titulo, etiqueta, children }: Props) {
  const theme = useTheme();
  const cores = {
    alerta: { fundo: theme.negativeSoft, destaque: theme.negative },
    positivo: { fundo: theme.positiveSoft, destaque: theme.positive },
    neutro: { fundo: theme.accentSoft, destaque: theme.accent },
  }[tom];
  const tituloFinal = titulo ?? TITULO_PADRAO[tom];

  return (
    <View
      style={[styles.cartao, { backgroundColor: cores.fundo, borderLeftColor: cores.destaque }]}
      accessible={!children}
      accessibilityLabel={
        children ? undefined : titulo ? `${TITULO_PADRAO[tom]}. ${titulo}. ${texto}` : `${tituloFinal}. ${texto}`
      }>
      {etiqueta && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.etiqueta}>
          {etiqueta}
        </ThemedText>
      )}
      <ThemedText type="smallBold" style={{ color: cores.destaque }}>
        {tituloFinal}
      </ThemedText>
      <ThemedText>{texto}</ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderLeftWidth: 4,
    gap: Spacing.one,
  },
  etiqueta: {
    textTransform: 'uppercase',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
  },
});
