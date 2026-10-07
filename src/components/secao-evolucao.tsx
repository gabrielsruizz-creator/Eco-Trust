import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { GraficoEvolucao } from '@/components/grafico-evolucao';
import { Botao, Cartao } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useEvolucao } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import { ErroValidacao } from '@/services/erros';
import { pedirAnaliseDaEvolucao } from '@/services/evolucao-service';
import { formatarData, nomeDoMes, paraDataLocal } from '@/utils/datas';

/** Evolução da nota mês a mês, com comentários da EcoTrust IA (recurso do Plus). */
export function SecaoEvolucao() {
  const theme = useTheme();
  const { evolucao, analise } = useEvolucao();
  const [escolhido, setEscolhido] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const pontos = evolucao.pontos;
  const indice = escolhido !== null && escolhido < pontos.length ? escolhido : pontos.length - 1;
  const ponto = pontos[indice];

  async function pedirAnalise() {
    setErro(null);
    setCarregando(true);
    try {
      await pedirAnaliseDaEvolucao(evolucao);
    } catch (e) {
      setErro(e instanceof ErroValidacao ? e.message : 'Não foi possível gerar a análise agora.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      {/* Primeiro, em destaque: a análise do EcoTrust (Claude) */}
      <Cartao>
        <ThemedText type="smallBold">✨ Análise do EcoTrust</ThemedText>
        {analise ? (
          <>
            <ThemedText>{analise.texto}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Gerada em {formatarData(paraDataLocal(new Date(analise.geradoEm)))}.
            </ThemedText>
          </>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Peça ao EcoTrust um comentário completo sobre a sua evolução e o que priorizar no próximo
            mês.
          </ThemedText>
        )}
        {erro && (
          <ThemedText type="small" style={{ color: theme.negative }} accessibilityLiveRegion="polite">
            {erro}
          </ThemedText>
        )}
        {carregando ? (
          <View style={styles.linha}>
            <ActivityIndicator color={theme.accent} />
            <ThemedText type="small" themeColor="textSecondary">
              O EcoTrust está analisando sua evolução...
            </ThemedText>
          </View>
        ) : (
          <Botao
            texto={analise ? 'Atualizar análise' : 'Pedir análise ao EcoTrust'}
            variante={analise ? 'secundario' : 'primario'}
            onPress={pedirAnalise}
          />
        )}
      </Cartao>

      {pontos.length > 0 && (
        <Cartao>
          <ThemedText type="small" themeColor="textSecondary">
            Toque num mês para ver o que mudou.
          </ThemedText>
          <GraficoEvolucao pontos={pontos} selecionado={indice} aoSelecionar={setEscolhido} />
        </Cartao>
      )}

      {ponto && (
        <Animated.View key={ponto.mes} entering={FadeIn.duration(250)}>
          <View style={[styles.comentario, { backgroundColor: theme.accentSoft, borderLeftColor: theme.accent }]} accessible>
            <View style={styles.linha}>
              <ThemedText type="smallBold" style={[styles.flex, { color: theme.accentText }]}>
                EcoTrust IA · {nomeDoMes(ponto.mes)}
              </ThemedText>
              {ponto.delta !== null && ponto.delta !== 0 && (
                <ThemedText type="smallBold" style={{ color: ponto.delta > 0 ? theme.positive : theme.negative }}>
                  {ponto.delta > 0 ? `▲ +${ponto.delta}` : `▼ ${ponto.delta}`}
                </ThemedText>
              )}
            </View>
            <ThemedText>{ponto.comentario}</ThemedText>
          </View>
        </Animated.View>
      )}

      <ThemedText type="small" themeColor="textSecondary">
        {evolucao.resumo}
      </ThemedText>

    </>
  );
}

const styles = StyleSheet.create({
  comentario: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderLeftWidth: 4,
    gap: Spacing.one,
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
