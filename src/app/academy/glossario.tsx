import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Cartao } from '@/components/tela';
import { TelaSecundaria } from '@/components/tela-secundaria';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { CONCEITOS } from '@/data/academy-conteudo';
import { useTheme } from '@/hooks/use-theme';

/** Glossário da Trust Academy: toque num termo para ver a explicação. */
export default function GlossarioScreen() {
  const theme = useTheme();
  const [aberto, setAberto] = useState<string | null>(null);
  const conceitos = [...CONCEITOS].sort((a, b) => a.termo.localeCompare(b.termo, 'pt-BR'));

  return (
    <TelaSecundaria titulo="Glossário">
      <ThemedText type="small" themeColor="textSecondary">
        Toque num termo para ver o que ele significa.
      </ThemedText>
      <Cartao>
        {conceitos.map((c, i) => {
          const estaAberto = aberto === c.termo;
          return (
            <Pressable
              key={c.termo}
              onPress={() => setAberto(estaAberto ? null : c.termo)}
              accessibilityRole="button"
              accessibilityState={{ expanded: estaAberto }}
              accessibilityLabel={estaAberto ? `${c.termo}. ${c.definicao}` : c.termo}
              style={[styles.conceito, i > 0 && [styles.separador, { borderTopColor: theme.border }]]}>
              <View style={styles.linha}>
                <ThemedText type="smallBold" style={styles.flex}>
                  {c.termo}
                </ThemedText>
                <ThemedText themeColor="textSecondary">{estaAberto ? '−' : '+'}</ThemedText>
              </View>
              {estaAberto && (
                <ThemedText type="small" themeColor="textSecondary">
                  {c.definicao}
                </ThemedText>
              )}
            </Pressable>
          );
        })}
      </Cartao>
    </TelaSecundaria>
  );
}

const styles = StyleSheet.create({
  conceito: {
    paddingVertical: Spacing.two,
    minHeight: 44,
    justifyContent: 'center',
    gap: Spacing.one,
  },
  separador: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
