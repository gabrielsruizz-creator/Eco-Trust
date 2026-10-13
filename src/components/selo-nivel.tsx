/**
 * Selo hexagonal com degradê da marca (nível da jornada, conquistas).
 * Dentro vai um número (o nível) ou um ícone.
 */

import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Polygon, Stop } from 'react-native-svg';

import { Icone, type NomeIcone } from '@/components/icone';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  tamanho?: number;
  /** Número no centro (ex.: o nível) */
  numero?: number;
  icone?: NomeIcone;
  /** Selo apagado (conquista ainda não alcançada) */
  apagado?: boolean;
  rotuloAcessivel?: string;
};

function pontos(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const angulo = (Math.PI / 3) * i - Math.PI / 2;
    return `${cx + r * Math.cos(angulo)},${cy + r * Math.sin(angulo)}`;
  }).join(' ');
}

export function SeloNivel({ tamanho = 64, numero, icone, apagado = false, rotuloAcessivel }: Props) {
  const theme = useTheme();
  const c = tamanho / 2;
  const id = `selo-${tamanho}-${apagado ? 'a' : 'c'}`;

  return (
    <View
      style={{ width: tamanho, height: tamanho }}
      accessible={!!rotuloAcessivel}
      accessibilityLabel={rotuloAcessivel}
      importantForAccessibility={rotuloAcessivel ? 'yes' : 'no-hide-descendants'}>
      <Svg width={tamanho} height={tamanho}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={apagado ? theme.backgroundSelected : theme.gradienteInicio} />
            <Stop offset="1" stopColor={apagado ? theme.backgroundSelected : theme.gradienteFim} />
          </LinearGradient>
        </Defs>
        {/* Contorno claro + hexágono cheio + hexágono interno, como uma peça facetada */}
        <Polygon points={pontos(c, c, c - 1)} fill={`url(#${id})`} />
        <Polygon
          points={pontos(c, c, c * 0.68)}
          fill="rgba(255,255,255,0.12)"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth={1}
        />
      </Svg>
      <View style={styles.centro} pointerEvents="none">
        {numero !== undefined ? (
          <Text style={[styles.numero, { fontSize: tamanho * 0.32, color: apagado ? theme.textSecondary : '#FFFFFF' }]}>
            {numero}
          </Text>
        ) : icone ? (
          <Icone nome={icone} cor={apagado ? theme.textSecondary : '#FFFFFF'} tamanho={tamanho * 0.36} />
        ) : null}
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
  numero: {
    fontWeight: 800,
  },
});
