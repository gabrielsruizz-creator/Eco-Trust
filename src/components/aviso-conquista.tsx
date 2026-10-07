import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { assinarCelebracoes } from '@/services/celebracao-service';
import type { DefinicaoConquista } from '@/services/gamificacao-service';
import { vibrarSucesso } from '@/utils/vibracao';

const DURACAO_MS = 3500;

/** Aviso no topo da tela quando uma conquista nova é alcançada (fila, uma de cada vez). */
export function AvisoConquista() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [fila, setFila] = useState<DefinicaoConquista[]>([]);
  const atual = fila[0];

  useEffect(() => assinarCelebracoes((novas) => setFila((f) => [...f, ...novas])), []);

  useEffect(() => {
    if (!atual) return;
    vibrarSucesso();
    const t = setTimeout(() => setFila((f) => f.slice(1)), DURACAO_MS);
    return () => clearTimeout(t);
  }, [atual]);

  if (!atual) return null;

  return (
    <View style={[styles.camada, { top: insets.top + Spacing.two }]} pointerEvents="none">
      <Animated.View
        key={atual.id}
        entering={FadeInUp.duration(350)}
        exiting={FadeOutUp.duration(250)}
        style={[styles.aviso, { backgroundColor: theme.text }]}
        accessibilityLiveRegion="polite"
        accessibilityLabel={`Nova conquista: ${atual.nome}. ${atual.descricao}`}>
        <ThemedText style={styles.icone}>{atual.icone}</ThemedText>
        <View style={styles.flex}>
          <ThemedText type="smallBold" style={{ color: theme.background }}>
            Nova conquista: {atual.nome}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.background }}>
            {atual.descricao} +50 XP
          </ThemedText>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  camada: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    zIndex: 100,
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  icone: {
    fontSize: 28,
    lineHeight: 34,
  },
  flex: {
    flex: 1,
  },
});
