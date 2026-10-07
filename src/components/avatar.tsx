import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AvatarColors } from '@/constants/theme';
import { iniciais } from '@/services/perfil-pessoal-service';

type Props = { nome: string; avatar: string | null; cor: number; tamanho?: number };

/** Avatar redondo: o emoji escolhido ou as iniciais do nome, sobre a cor escolhida. */
export function Avatar({ nome, avatar, cor, tamanho = 64 }: Props) {
  return (
    <View
      style={[
        styles.circulo,
        { width: tamanho, height: tamanho, borderRadius: tamanho / 2, backgroundColor: AvatarColors[cor % AvatarColors.length] },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <ThemedText
        style={[
          styles.texto,
          { fontSize: tamanho * (avatar ? 0.5 : 0.38), lineHeight: tamanho * (avatar ? 0.62 : 0.5) },
        ]}>
        {avatar ?? iniciais(nome)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  circulo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    color: '#ffffff',
    fontWeight: 700,
  },
});
