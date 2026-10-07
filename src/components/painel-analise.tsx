import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CartaoInsight } from '@/components/cartao-insight';
import { CartaoSaude } from '@/components/saude-financeira';
import { Botao } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAnalise } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import type { TemaInsight } from '@/services/analise-service';
import { mesAtual } from '@/utils/datas';

const NOME_TEMA: Record<TemaInsight, string> = {
  renda: 'Renda',
  gastos: 'Gastos',
  orcamento: 'Orçamento',
  metas: 'Metas',
};

/** Análise automática da vida financeira, mostrada dentro da aba EcoTrust IA. */
export function PainelAnalise() {
  const theme = useTheme();
  const analise = useAnalise(mesAtual());

  return (
    <ScrollView contentContainerStyle={styles.conteudo}>
      <Animated.View entering={FadeInDown.duration(350)}>
        <ThemedView type="backgroundElement" style={styles.resumo}>
          <View style={[styles.selo, { backgroundColor: theme.accent }]}>
            <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
              IA
            </ThemedText>
          </View>
          <View style={styles.flex}>
            <ThemedText type="smallBold" accessibilityRole="header" accessibilityLiveRegion="polite">
              {analise.resumo}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Atualizado agora, com base nos seus lançamentos, orçamentos e metas.
            </ThemedText>
          </View>
        </ThemedView>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(350)}>
        <CartaoSaude />
      </Animated.View>

      {analise.insights.map((insight, i) => (
        <Animated.View key={insight.id} entering={FadeInDown.delay(120 + i * 70).duration(350)}>
          <CartaoInsight
            tom={insight.tom}
            titulo={insight.titulo}
            texto={insight.texto}
            etiqueta={NOME_TEMA[insight.tema]}>
            {insight.acao && (
              <Botao
                texto={insight.acao.rotulo}
                variante="secundario"
                onPress={() => router.push(insight.acao!.rota)}
                style={styles.acao}
              />
            )}
          </CartaoInsight>
        </Animated.View>
      ))}

      <ThemedText type="small" themeColor="textSecondary" style={styles.rodape}>
        Esta análise usa regras sobre os seus próprios dados e é atualizada a cada lançamento. Para
        conversar sobre ela, use &quot;Perguntar&quot;.
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  resumo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  selo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
    gap: Spacing.half,
  },
  acao: {
    marginTop: Spacing.two,
  },
  rodape: {
    textAlign: 'center',
  },
});
