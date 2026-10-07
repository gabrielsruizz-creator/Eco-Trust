import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

type Props = {
  titulo: string;
  children: ReactNode;
  /** Conteúdo fixo no rodapé (ex.: botão Salvar) */
  rodape?: ReactNode;
  /** Texto do botão de voltar ("‹ Voltar" ou "Cancelar" em telas de edição) */
  textoVoltar?: string;
};

/** Tela aberta por cima das abas: cabeçalho com voltar, conteúdo rolável e rodapé opcional. */
export function TelaSecundaria({ titulo, children, rodape, textoVoltar = '‹ Voltar' }: Props) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.topo}>
            <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12} style={styles.lado}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {textoVoltar}
              </ThemedText>
            </Pressable>
            <ThemedText type="smallBold" accessibilityRole="header" numberOfLines={1} style={styles.titulo}>
              {titulo}
            </ThemedText>
            <View style={styles.lado} />
          </View>
          <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {rodape && <View style={styles.rodape}>{rodape}</View>}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
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
  flex: {
    flex: 1,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 44,
  },
  lado: {
    width: 80,
  },
  titulo: {
    flex: 1,
    textAlign: 'center',
  },
  conteudo: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  rodape: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
