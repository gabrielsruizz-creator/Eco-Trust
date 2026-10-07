import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { SituacaoOrcamento } from '@/services/orcamento-service';

export const ICONE_SITUACAO: Record<SituacaoOrcamento, string> = {
  dentro: '✓',
  atencao: '!',
  ultrapassou: '✕',
};

export const ROTULO_SITUACAO: Record<SituacaoOrcamento, string> = {
  dentro: 'Dentro',
  atencao: 'Atenção',
  ultrapassou: 'Ultrapassou',
};

export function useCorSituacao() {
  const theme = useTheme();
  return (situacao: SituacaoOrcamento) =>
    situacao === 'dentro'
      ? theme.statusGood
      : situacao === 'atencao'
        ? theme.statusWarning
        : theme.statusCritical;
}

/** Círculo na cor da situação com o símbolo dentro (✓ ! ✕). */
export function IconeSituacao({ situacao, cor }: { situacao: SituacaoOrcamento; cor: string }) {
  return (
    <View style={[styles.icone, { backgroundColor: cor }]} importantForAccessibility="no">
      {/* O amarelo de "atenção" é claro demais para texto branco */}
      <ThemedText style={[styles.textoIcone, situacao === 'atencao' && styles.textoIconeEscuro]}>
        {ICONE_SITUACAO[situacao]}
      </ThemedText>
    </View>
  );
}

/** Ícone colorido + texto: a situação nunca depende só da cor. */
export function EtiquetaSituacao({ situacao, texto }: { situacao: SituacaoOrcamento; texto?: string }) {
  const cor = useCorSituacao()(situacao);
  return (
    <View style={styles.etiqueta}>
      <IconeSituacao situacao={situacao} cor={cor} />
      <ThemedText type="small" themeColor="textSecondary">
        {texto ?? ROTULO_SITUACAO[situacao]}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  icone: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoIcone: {
    color: '#ffffff',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: 800,
  },
  textoIconeEscuro: {
    color: '#0b0b0b',
  },
});
