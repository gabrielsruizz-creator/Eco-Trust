import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Estrutura padrão das telas: título no topo e conteúdo rolável. */
export function Tela({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.conteudo}
          keyboardShouldPersistTaps="handled">
          <ThemedText style={styles.titulo}>{titulo}</ThemedText>
          {children}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

export function Cartao({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={[styles.cartao, { borderColor: theme.border }, style]}>
      {children}
    </ThemedView>
  );
}

type BotaoProps = PressableProps & {
  texto: string;
  /** "perigo" é para ações destrutivas, como excluir */
  variante?: 'primario' | 'secundario' | 'perigo';
  selecionado?: boolean;
};

export function Botao({ texto, variante = 'primario', selecionado, disabled, style, ...rest }: BotaoProps) {
  const theme = useTheme();
  const primario = variante === 'primario' || selecionado;
  const perigo = variante === 'perigo';
  const fundo = primario ? theme.accent : perigo ? theme.negativeSoft : theme.backgroundSelected;

  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, selected: selecionado }}
      style={(state) => [
        styles.botao,
        { backgroundColor: fundo },
        (state.pressed || disabled) && styles.apagado,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      <ThemedText
        type="smallBold"
        style={[primario && { color: theme.onAccent }, perigo && { color: theme.negative }]}>
        {texto}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  conteudo: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  titulo: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: 700,
  },
  cartao: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  botao: {
    paddingVertical: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  apagado: {
    opacity: 0.6,
  },
});
