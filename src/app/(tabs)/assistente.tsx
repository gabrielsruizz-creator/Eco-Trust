import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BloqueioPremium } from '@/components/bloqueio-premium';
import { Chip } from '@/components/chip';
import { PainelAcademy } from '@/components/painel-academy';
import { PainelAnalise } from '@/components/painel-analise';
import { PainelChat } from '@/components/painel-chat';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { AULAS, CURSOS } from '@/data/academy-conteudo';
import { useAnalise, useAssinatura } from '@/hooks/use-dados';
import { temAcesso } from '@/services/assinatura-service';
import { mesAtual } from '@/utils/datas';

type Secao = 'analise' | 'perguntar' | 'academy';

/** EcoTrust IA: análise automática, chat e Trust Academy (recursos do EcoTrust Plus). */
export default function EcoTrustIAScreen() {
  const [secao, setSecao] = useState<Secao>('analise');
  const assinatura = useAssinatura();
  const plus = temAcesso('analise', assinatura);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.cabecalho}>
          <ThemedText style={styles.titulo}>EcoTrust IA</ThemedText>
          <View style={styles.seletor} accessibilityRole="radiogroup">
            <Chip texto="Análise" ativo={secao === 'analise'} aoTocar={() => setSecao('analise')} />
            <Chip texto="Perguntar" ativo={secao === 'perguntar'} aoTocar={() => setSecao('perguntar')} />
            <Chip texto="Academy" ativo={secao === 'academy'} aoTocar={() => setSecao('academy')} />
          </View>
        </View>

        {!plus ? (
          <ConviteSecao secao={secao} />
        ) : (
          <>
            {/* Os painéis ficam montados para a conversa não se perder ao trocar de seção. */}
            <View style={[styles.flex, secao !== 'analise' && styles.oculto]}>
              <PainelAnalise />
            </View>
            <View style={[styles.flex, secao !== 'perguntar' && styles.oculto]}>
              <PainelChat />
            </View>
            <View style={[styles.flex, secao !== 'academy' && styles.oculto]}>
              <PainelAcademy />
            </View>
          </>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

/** Para quem está no plano Gratuito: uma prévia de cada seção + convite para o Plus. */
function ConviteSecao({ secao }: { secao: Secao }) {
  const analise = useAnalise(mesAtual());
  return (
    <ScrollView contentContainerStyle={styles.conteudoConvite}>
      {secao === 'analise' && (
        <BloqueioPremium
          recurso="analise"
          previa={
            <ThemedText type="smallBold" style={styles.previa}>
              {analise.resumo}
            </ThemedText>
          }
        />
      )}
      {secao === 'perguntar' && <BloqueioPremium recurso="chat" />}
      {secao === 'academy' && (
        <BloqueioPremium
          recurso="academy"
          previa={
            <View style={styles.listaPrevia}>
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
      )}
    </ScrollView>
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
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  titulo: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: 700,
  },
  seletor: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  oculto: {
    display: 'none',
  },
  conteudoConvite: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  previa: {
    fontSize: 18,
    lineHeight: 26,
  },
  listaPrevia: {
    gap: Spacing.half,
  },
});
