import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Layout das telas de acesso (cadastro e entrar): marca no topo e formulário rolável. */
export function TelaAcesso({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
            <View style={styles.marca}>
              <View style={[styles.logo, { backgroundColor: theme.accent }]}>
                <ThemedText style={[styles.letraLogo, { color: theme.onAccent }]}>E</ThemedText>
              </View>
              <ThemedText style={styles.nomeMarca}>EcoTrust</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Seu assistente financeiro pessoal
              </ThemedText>
            </View>
            <View style={styles.cabecalho}>
              <ThemedText style={styles.titulo} accessibilityRole="header">
                {titulo}
              </ThemedText>
              <ThemedText themeColor="textSecondary">{subtitulo}</ThemedText>
            </View>
            {children}
          </ScrollView>
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
  conteudo: {
    padding: Spacing.four,
    gap: Spacing.three,
    flexGrow: 1,
    justifyContent: 'center',
  },
  marca: {
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letraLogo: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: 800,
  },
  nomeMarca: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: 800,
  },
  cabecalho: {
    gap: Spacing.one,
  },
  titulo: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: 700,
  },
});
