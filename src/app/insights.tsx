import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BloqueioPremium } from '@/components/bloqueio-premium';
import { PainelAnalise } from '@/components/painel-analise';
import { PainelChat } from '@/components/painel-chat';
import { BotaoIcone, Segmentado } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAnalise, useAssinatura } from '@/hooks/use-dados';
import { temAcesso } from '@/services/assinatura-service';
import { mesAtual } from '@/utils/datas';

type Secao = 'analise' | 'perguntar';

/** Insights financeiros: análise automática e conversa com o EcoTrust (recursos do Plus). */
export default function InsightsScreen() {
  const [secao, setSecao] = useState<Secao>('analise');
  const plus = temAcesso('analise', useAssinatura());

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.cabecalho}>
          <View style={styles.topo}>
            <BotaoIcone icone="voltar" rotulo="Voltar" aoTocar={() => router.back()} />
            <ThemedText style={styles.titulo} accessibilityRole="header">
              Insights financeiros
            </ThemedText>
          </View>
          <Segmentado
            rotulo="Seção"
            valor={secao}
            aoMudar={setSecao}
            opcoes={[
              { valor: 'analise', texto: 'Análise' },
              { valor: 'perguntar', texto: 'Perguntar à IA' },
            ]}
          />
        </View>

        {!plus ? (
          <Convite secao={secao} />
        ) : (
          <>
            {/* Os painéis ficam montados para a conversa não se perder ao trocar de seção. */}
            <View style={[styles.flex, secao !== 'analise' && styles.oculto]}>
              <PainelAnalise />
            </View>
            <View style={[styles.flex, secao !== 'perguntar' && styles.oculto]}>
              <PainelChat />
            </View>
          </>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

/** Para quem está no plano Gratuito: uma prévia + convite para o Plus. */
function Convite({ secao }: { secao: Secao }) {
  const analise = useAnalise(mesAtual());
  return (
    <ScrollView contentContainerStyle={styles.conteudoConvite}>
      {secao === 'analise' ? (
        <BloqueioPremium
          recurso="analise"
          previa={
            <ThemedText type="smallBold" style={styles.previa}>
              {analise.resumo}
            </ThemedText>
          }
        />
      ) : (
        <BloqueioPremium recurso="chat" />
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
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  titulo: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 700,
  },
  flex: {
    flex: 1,
  },
  oculto: {
    display: 'none',
  },
  conteudoConvite: {
    padding: Spacing.three,
  },
  previa: {
    fontSize: 18,
    lineHeight: 26,
  },
});
