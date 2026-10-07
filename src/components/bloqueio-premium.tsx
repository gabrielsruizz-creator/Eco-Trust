import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Botao } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { NOME_PLANO_PLUS, RECURSOS_PREMIUM, type RecursoPremium } from '@/services/assinatura-service';

type Props = {
  recurso: RecursoPremium;
  /** Prévia opcional mostrada acima do convite (ex.: "3 pontos de atenção encontrados") */
  previa?: ReactNode;
  /** Versão menor, para caber dentro de outras telas (ex.: no Início) */
  compacto?: boolean;
};

/** Convite para o EcoTrust Plus no lugar de um recurso pago. */
export function BloqueioPremium({ recurso, previa, compacto }: Props) {
  const theme = useTheme();
  const info = RECURSOS_PREMIUM[recurso];

  return (
    <View
      style={[styles.cartao, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
      accessibilityRole="summary">
      <View style={styles.cabecalho}>
        <View style={[styles.selo, { backgroundColor: theme.accent }]}>
          <ThemedText type="smallBold" style={[styles.textoSelo, { color: theme.onAccent }]}>
            PLUS
          </ThemedText>
        </View>
        <ThemedText type="smallBold" style={styles.flex}>
          {info.nome}
        </ThemedText>
      </View>
      {previa}
      <ThemedText type="small">{info.descricao}</ThemedText>
      {!compacto && (
        <ThemedText type="small" themeColor="textSecondary">
          Disponível no {NOME_PLANO_PLUS}.
        </ThemedText>
      )}
      <Botao
        texto={`Conhecer o ${NOME_PLANO_PLUS}`}
        onPress={() => router.push({ pathname: '/assinatura', params: { recurso } })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.two,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  selo: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.one,
  },
  textoSelo: {
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  flex: {
    flex: 1,
  },
});
