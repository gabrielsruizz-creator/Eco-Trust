import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  /** De 0 a 100 */
  percentual: number;
  cor: string;
  tamanho?: number;
  espessura?: number;
  /** Texto do centro (padrão: a porcentagem, ex.: "40%") */
  rotulo?: string;
  /** Texto menor abaixo do rótulo (ex.: "de 100") */
  subrotulo?: string;
  /** Lido pelo leitor de tela (padrão: só o valor) */
  rotuloAcessivel?: string;
  /** Para usar sobre fundos coloridos (padrão: cores do tema) */
  corTrilho?: string;
  corTexto?: string;
};

/** Anel de progresso com um valor no centro (progresso de meta, nota de saúde financeira...). */
export function AnelProgresso({
  percentual,
  cor,
  tamanho = 140,
  espessura = 14,
  rotulo,
  subrotulo,
  rotuloAcessivel,
  corTrilho,
  corTexto,
}: Props) {
  const theme = useTheme();
  const raio = (tamanho - espessura) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const limitado = Math.max(0, Math.min(100, percentual));
  const centro = tamanho / 2;
  const fonte = Math.round(tamanho * 0.2);

  return (
    <View
      style={{ width: tamanho, height: tamanho }}
      accessibilityRole="progressbar"
      accessibilityLabel={rotuloAcessivel}
      accessibilityValue={{ min: 0, max: 100, now: Math.floor(limitado) }}>
      <Svg width={tamanho} height={tamanho}>
        <Circle cx={centro} cy={centro} r={raio} fill="none" stroke={corTrilho ?? theme.chartGrid} strokeWidth={espessura} />
        {limitado > 0 && (
          <Circle
            cx={centro}
            cy={centro}
            r={raio}
            fill="none"
            stroke={cor}
            strokeWidth={espessura}
            strokeLinecap="round"
            strokeDasharray={`${(limitado / 100) * circunferencia} ${circunferencia}`}
            transform={`rotate(-90 ${centro} ${centro})`}
          />
        )}
      </Svg>
      <View style={styles.centro} pointerEvents="none">
        <ThemedText style={[styles.texto, { fontSize: fonte, lineHeight: Math.round(fonte * 1.2) }, corTexto ? { color: corTexto } : null]}>
          {rotulo ?? `${Math.floor(limitado)}%`}
        </ThemedText>
        {subrotulo && (
          <ThemedText type="small" themeColor="textSecondary" style={corTexto ? { color: corTexto } : null}>
            {subrotulo}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    fontWeight: 700,
  },
});
