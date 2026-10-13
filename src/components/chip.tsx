import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { vibrarSelecao } from '@/utils/vibracao';

type Props = {
  texto: string;
  ativo: boolean;
  aoTocar: () => void;
};

/** Opção selecionável em formato de "pílula". Use dentro de uma View com accessibilityRole="radiogroup". */
export function Chip({ texto, ativo, aoTocar }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        if (!ativo) vibrarSelecao();
        aoTocar();
      }}
      accessibilityRole="radio"
      accessibilityState={{ checked: ativo }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: ativo ? theme.accent : theme.backgroundElement,
          borderColor: ativo ? theme.accent : theme.border,
        },
        ativo && {
          experimental_backgroundImage: `linear-gradient(90deg, ${theme.gradienteInicio}, ${theme.gradienteFim})`,
        },
        pressed && styles.pressionado,
      ]}>
      <ThemedText type="small" style={ativo && { color: theme.onAccent }}>
        {texto}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
    justifyContent: 'center',
  },
  pressionado: {
    opacity: 0.7,
  },
});
