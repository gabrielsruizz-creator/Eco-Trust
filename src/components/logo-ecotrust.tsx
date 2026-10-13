/** Marca do EcoTrust: duas lâminas de folha em degradê roxo → azul (o mesmo desenho do ícone do app). */

import Svg, { Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

const LAMINA = 'M-95 0 C-45 -40 45 -40 95 0 C45 30 -45 30 -95 0 Z';

export function LogoEcoTrust({ tamanho = 72 }: { tamanho?: number }) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="-120 -120 240 240" accessible={false}>
      <Defs>
        <LinearGradient id="logo-ecotrust" x1="-95" y1="0" x2="95" y2="0" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#7B5CFF" />
          <Stop offset="1" stopColor="#3A5CF5" />
        </LinearGradient>
      </Defs>
      <G transform="translate(-4 -34) rotate(-35)">
        <Path d={LAMINA} fill="url(#logo-ecotrust)" />
      </G>
      <G transform="translate(4 34) rotate(-35)">
        <Path d={LAMINA} fill="url(#logo-ecotrust)" />
      </G>
    </Svg>
  );
}
