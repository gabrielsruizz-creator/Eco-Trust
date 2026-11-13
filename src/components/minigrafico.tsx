import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

/** Linha pequena da evolução de um valor (sem eixos), com um ponto no último mês. */
export function Minigrafico({ valores, largura = 96, altura = 40 }: { valores: number[]; largura?: number; altura?: number }) {
  const theme = useTheme();
  if (valores.length < 2) return null;
  const max = Math.max(...valores);
  const min = Math.min(...valores);
  const margem = 4;
  const x = (i: number) => margem + (i / (valores.length - 1)) * (largura - margem * 2);
  const y = (v: number) => altura - margem - (max === min ? 0.5 : (v - min) / (max - min)) * (altura - margem * 2);
  const d = valores.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const ultimo = valores.length - 1;
  return (
    <Svg width={largura} height={altura} accessible={false}>
      <Path d={d} stroke={theme.brand} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={x(ultimo)} cy={y(valores[ultimo])} r={3.5} fill={theme.backgroundElement} stroke={theme.brand} strokeWidth={2} />
    </Svg>
  );
}
