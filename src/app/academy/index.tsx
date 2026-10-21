import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BloqueioPremium } from '@/components/bloqueio-premium';
import { PainelAcademy } from '@/components/painel-academy';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { AULAS, CURSOS } from '@/data/academy-conteudo';
import { useAssinatura } from '@/hooks/use-dados';
import { temAcesso } from '@/services/assinatura-service';

/** EcoTrust Academy (aberta pelo Início e pelo Perfil) (recurso do Plus; quem é Gratuito vê uma prévia). */
export default function AcademyScreen() {
  const plus = temAcesso('academy', useAssinatura());

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.cabecalho}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12} style={styles.voltar}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              ‹ Voltar
            </ThemedText>
          </Pressable>
          <ThemedText style={styles.titulo} accessibilityRole="header">
            EcoTrust Academy
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Aprenda hoje, construa o seu amanhã.
          </ThemedText>
        </View>
        {plus ? (
          <PainelAcademy />
        ) : (
          <ScrollView contentContainerStyle={styles.convite}>
            <BloqueioPremium
              recurso="academy"
              previa={
                <View style={styles.lista}>
                  {CURSOS.map((c) => (
                    <ThemedText key={c.id} type="small">
                      • {c.titulo}
                    </ThemedText>
                  ))}
                  <ThemedText type="small" themeColor="textSecondary">
                    {AULAS.length} aulas com quiz, glossário e o fórum da comunidade.
                  </ThemedText>
                </View>
              }
            />
          </ScrollView>
        )}
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
  cabecalho: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.one,
  },
  voltar: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  titulo: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: 700,
  },
  convite: {
    padding: Spacing.three,
    paddingBottom: Spacing.four,
  },
  lista: {
    gap: Spacing.half,
  },
});
