/** Marca do EcoTrust: duas lâminas de folha, em tinta (segue a cor do texto do tema). */

import Svg, { G, Path } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

const LAMINA = 'M-95 0 C-45 -40 45 -40 95 0 C45 30 -45 30 -95 0 Z';

export function LogoEcoTrust({ tamanho = 72, cor }: { tamanho?: number; cor?: string }) {
  const theme = useTheme();
  const tinta = cor ?? theme.text;
  return (
    <Svg width={tamanho} height={tamanho} viewBox="-120 -120 240 240" accessible={false}>
      <G transform="translate(-4 -34) rotate(-35)">
        <Path d={LAMINA} fill={tinta} />
      </G>
      <G transform="translate(4 34) rotate(-35)">
        <Path d={LAMINA} fill={tinta} fillOpacity={0.55} />
      </G>
    </Svg>
  );
}
