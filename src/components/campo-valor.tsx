import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  valor: string;
  aoMudar: (texto: string) => void;
  /** Lido pelo leitor de tela, ex.: "Valor da despesa em reais" */
  rotulo: string;
  autoFocus?: boolean;
  aoConfirmar?: () => void;
};

/** Campo de valor em reais com número grande, usado em formulários de dinheiro. */
export function CampoValor({ valor, aoMudar, rotulo, autoFocus, aoConfirmar }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.campo, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText style={styles.prefixo} themeColor="textSecondary">
        R$
      </ThemedText>
      <TextInput
        style={[styles.input, { color: theme.text }]}
        value={valor}
        onChangeText={aoMudar}
        placeholder="0,00"
        placeholderTextColor={theme.textSecondary}
        keyboardType="decimal-pad"
        accessibilityLabel={rotulo}
        autoFocus={autoFocus}
        returnKeyType="next"
        onSubmitEditing={aoConfirmar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  prefixo: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: 600,
  },
  input: {
    flex: 1,
    fontSize: 32,
    fontWeight: 700,
    paddingVertical: Spacing.three,
  },
});
