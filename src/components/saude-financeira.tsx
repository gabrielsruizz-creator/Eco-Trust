import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnelProgresso } from '@/components/anel-progresso';
import { BloqueioPremium } from '@/components/bloqueio-premium';
import { IconeSituacao } from '@/components/situacao-orcamento';
import { Cartao } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAssinatura, useSaude } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import { temAcesso } from '@/services/assinatura-service';
import type { FaixaSaude, FatorSaude, SituacaoFator } from '@/services/saude-service';

/** Converte a situação do fator para o ícone de situação já usado no app (✓ ! ✕). */
export const ICONE_FATOR: Record<SituacaoFator, 'dentro' | 'atencao' | 'ultrapassou'> = {
  bom: 'dentro',
  atencao: 'atencao',
  ruim: 'ultrapassou',
};

export function useCorFaixa() {
  const theme = useTheme();
  return (faixa: FaixaSaude | null) =>
    faixa === 'excelente' || faixa === 'boa'
      ? theme.statusGood
      : faixa === 'regular'
        ? theme.statusWarning
        : faixa === 'atencao'
          ? theme.statusCritical
          : theme.chartBaseline;
}

export function useCorFator() {
  const theme = useTheme();
  return (s: SituacaoFator) =>
    s === 'bom' ? theme.statusGood : s === 'atencao' ? theme.statusWarning : theme.statusCritical;
}

/** Linha de fator: ícone + texto (a situação nunca depende só da cor). */
export function LinhaFator({ fator }: { fator: FatorSaude }) {
  const cor = useCorFator()(fator.situacao);
  return (
    <View style={styles.linhaFator}>
      <IconeSituacao situacao={ICONE_FATOR[fator.situacao]} cor={cor} />
      <ThemedText type="small" style={styles.flex}>
        {fator.resumo}
      </ThemedText>
    </View>
  );
}

/** Cartão compacto da saúde financeira (Início e EcoTrust IA). Toque abre os detalhes. */
export function CartaoSaude() {
  const assinatura = useAssinatura();
  if (!temAcesso('saude', assinatura)) {
    return (
      <BloqueioPremium
        recurso="saude"
        compacto
        previa={<ThemedText type="small">Descubra sua nota de saúde financeira de 0 a 100.</ThemedText>}
      />
    );
  }
  return <CartaoSaudeCompleto />;
}

function CartaoSaudeCompleto() {
  const theme = useTheme();
  const saude = useSaude();
  const corFaixa = useCorFaixa();

  // Mostra o melhor e os dois piores fatores, para a pessoa ver o que vai bem e o que melhorar.
  const ordenados = [...saude.fatores].sort((a, b) => b.pontos / b.maximo - a.pontos / a.maximo);
  const destaques =
    ordenados.length > 3 ? [ordenados[0], ...ordenados.slice(-2).reverse()] : ordenados;

  return (
    <Pressable
      onPress={() => router.push('/saude-financeira')}
      accessibilityRole="button"
      accessibilityLabel={
        saude.nota === null
          ? 'Saúde financeira: ainda sem dados. Abre os detalhes.'
          : `Saúde financeira: ${saude.nota} de 100, ${saude.rotuloFaixa}. Abre os detalhes.`
      }
      style={({ pressed }) => pressed && styles.pressionado}>
      <Cartao>
        <ThemedText type="smallBold">Saúde financeira</ThemedText>
        <View style={styles.linha}>
          <AnelProgresso
            percentual={saude.nota ?? 0}
            cor={corFaixa(saude.faixa)}
            tamanho={96}
            espessura={10}
            rotulo={saude.nota === null ? '–' : String(saude.nota)}
            subrotulo="de 100"
          />
          <View style={styles.flex}>
            <ThemedText type="smallBold">{saude.rotuloFaixa}</ThemedText>
            {saude.nota === null ? (
              <ThemedText type="small" themeColor="textSecondary">
                Registre seus lançamentos para o EcoTrust calcular sua nota.
              </ThemedText>
            ) : (
              destaques.map((f) => <LinhaFator key={f.id} fator={f} />)
            )}
          </View>
        </View>
        <ThemedText type="smallBold" style={{ color: theme.accentText }}>
          Ver detalhes ›
        </ThemedText>
      </Cartao>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
    gap: Spacing.one,
  },
  linhaFator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pressionado: {
    opacity: 0.7,
  },
});
