/**
 * Mascote do EcoTrust: um saquinho de dinheiro em silhueta, no estilo "papel e tinta" do app.
 * Corpo na cor do texto (preto no claro, creme no escuro), olhos vazados na cor do fundo e uma
 * expressão por humor. Só no humor radiante ele ganha cor, como destaque.
 * Animações: flutua sem parar, pisca de tempos em tempos e pula quando é tocado.
 */

import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';
import type { EstagioPet, HumorPet } from '@/services/pet-service';
import { vibrarLeve } from '@/utils/vibracao';

/** Destaque do humor radiante (o verde "positivo" do app) */
const COR_RADIANTE = '#2E9E5E';

/** Corpo do saquinho: base larga e arredondada, "pescoço" estreito embaixo do laço. */
const CORPO = 'M44 46 C40 52 26 60 24 78 C22 96 38 106 60 106 C82 106 98 96 96 78 C94 60 80 52 76 46 Z';
/** Laço em cima, como a alça do saquinho */
const ALCA = 'M47 46 L47 32 Q47 24 55 24 L65 24 Q73 24 73 32 L73 46';

type Props = {
  humor: HumorPet;
  estagio: EstagioPet;
  tamanho?: number;
  aoTocar?: () => void;
  rotuloAcessivel: string;
};

export function PetEco({ humor, estagio, tamanho = 150, aoTocar, rotuloAcessivel }: Props) {
  const theme = useTheme();
  const [piscando, setPiscando] = useState(false);
  const flutuar = useSharedValue(0);
  const escala = useSharedValue(1);

  // Flutua para cima e para baixo (mais devagar e mais baixo quando está triste ou com fome).
  useEffect(() => {
    const lento = humor === 'triste' || humor === 'com-fome';
    flutuar.set(
      withRepeat(
        withTiming(lento ? -2 : -6, { duration: lento ? 1800 : 1200, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, [flutuar, humor]);

  // Pisca a cada ~4 segundos.
  useEffect(() => {
    const intervalo = setInterval(() => {
      setPiscando(true);
      setTimeout(() => setPiscando(false), 160);
    }, 4000);
    return () => clearInterval(intervalo);
  }, []);

  const estilo = useAnimatedStyle(() => ({
    transform: [{ translateY: flutuar.value }, { scale: escala.value }],
  }));

  function tocar() {
    vibrarLeve();
    escala.set(withSequence(withTiming(1.12, { duration: 120 }), withSpring(1, { damping: 6 })));
    aoTocar?.();
  }

  const tinta = humor === 'radiante' ? COR_RADIANTE : theme.text;
  const vazado = theme.background;
  // Cresce com o estágio: filhote pequeno, sábio no tamanho cheio.
  const fator = estagio === 'filhote' ? 0.78 : estagio === 'jovem' ? 0.88 : 1;
  // Triste: o corpo "murcha" um pouco para baixo.
  const murcho = humor === 'triste' ? 'translate(0 3) scale(1 0.96)' : '';

  return (
    <Pressable
      onPress={tocar}
      accessibilityRole="button"
      accessibilityLabel={rotuloAcessivel}
      accessibilityHint="Toque para ouvir outra frase">
      <Animated.View style={[{ width: tamanho, height: tamanho }, estilo]}>
        <Svg width={tamanho} height={tamanho} viewBox="0 0 120 120">
          {/* Sombra no chão */}
          <Ellipse cx={60} cy={112} rx={30 * fator} ry={3.5} fill={theme.text} opacity={0.1} />
          <G transform={`translate(${60 - 60 * fator} ${(1 - fator) * 108}) scale(${fator})`}>
            <G transform={murcho}>
              <Path d={ALCA} stroke={tinta} strokeWidth={8} strokeLinecap="round" fill="none" />
              <Path d={CORPO} fill={tinta} />
              {/* Nó do laço */}
              <Rect x={42} y={42} width={36} height={9} rx={4.5} fill={tinta} />
              <Rect x={44} y={46.5} width={32} height={1.6} rx={0.8} fill={vazado} opacity={0.35} />
              <Rosto humor={humor} piscando={piscando} cor={vazado} />
              {estagio === 'sabio' && <Moeda x={60} y={92} r={6} cor={vazado} />}
            </G>
          </G>
          {humor === 'radiante' && <Brilhos cor={theme.text} />}
          {humor === 'com-fome' && <Moeda x={101} y={86} r={9} cor={theme.background} fundo={theme.text} />}
          {humor === 'triste' && <Reticencias cor={theme.text} />}
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

/** Rosto vazado (na cor do fundo), no estilo do mascote: dois olhinhos e quase nada mais. */
function Rosto({ humor, piscando, cor }: { humor: HumorPet; piscando: boolean; cor: string }) {
  const arco = (d: string) => <Path d={d} stroke={cor} strokeWidth={3.2} fill="none" strokeLinecap="round" />;

  if (humor === 'radiante' || humor === 'feliz') {
    // Olhos fechados de alegria: ^ ^
    return (
      <G>
        {arco('M44 76 q5 -7 10 0')}
        {arco('M66 76 q5 -7 10 0')}
        {humor === 'radiante' && <Path d="M54 86 Q60 93 66 86 Z" fill={cor} />}
      </G>
    );
  }
  if (humor === 'triste') {
    // Olhos caídos, quase fechados
    return (
      <G>
        {arco('M44 76 q5 4 10 0')}
        {arco('M66 76 q5 4 10 0')}
      </G>
    );
  }
  if (piscando) {
    return (
      <G>
        {arco('M45 76 h8')}
        {arco('M67 76 h8')}
      </G>
    );
  }
  if (humor === 'preocupado') {
    // Olhos olhando de lado + sobrancelhas tensas
    return (
      <G>
        <Ellipse cx={47} cy={77} rx={4} ry={5.5} fill={cor} />
        <Ellipse cx={69} cy={77} rx={4} ry={5.5} fill={cor} />
        {arco('M42 69 L53 65')}
        {arco('M78 69 L67 65')}
      </G>
    );
  }
  if (humor === 'com-fome') {
    // Olhos abertos + boquinha aberta
    return (
      <G>
        <Ellipse cx={50} cy={74} rx={4.5} ry={6} fill={cor} />
        <Ellipse cx={70} cy={74} rx={4.5} ry={6} fill={cor} />
        <Ellipse cx={60} cy={88} rx={3.5} ry={4} fill={cor} />
      </G>
    );
  }
  // Tranquilo: dois olhinhos ovais
  return (
    <G>
      <Ellipse cx={50} cy={76} rx={4.5} ry={6.5} fill={cor} />
      <Ellipse cx={70} cy={76} rx={4.5} ry={6.5} fill={cor} />
    </G>
  );
}

/** Moedinha: o "lanche" do mascote (com fome) ou um detalhe no estágio sábio. */
function Moeda({ x, y, r, cor, fundo }: { x: number; y: number; r: number; cor: string; fundo?: string }) {
  return (
    <G>
      {fundo && <Circle cx={x} cy={y} r={r} fill={fundo} />}
      <Circle cx={x} cy={y} r={r * 0.62} stroke={cor} strokeWidth={1.6} fill="none" />
      <Path d={`M${x} ${y - r * 0.3} V${y + r * 0.3}`} stroke={cor} strokeWidth={1.6} strokeLinecap="round" />
    </G>
  );
}

/** Pontinhos em volta, como brilho de alegria. */
function Brilhos({ cor }: { cor: string }) {
  const pontos: [number, number, number][] = [
    [14, 56, 2.6],
    [20, 34, 2],
    [36, 16, 2.4],
    [84, 16, 2.4],
    [100, 34, 2],
    [106, 56, 2.6],
  ];
  return (
    <G>
      {pontos.map(([x, y, r]) => (
        <Circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={cor} />
      ))}
    </G>
  );
}

/** "..." de quem está desanimado. */
function Reticencias({ cor }: { cor: string }) {
  return (
    <G>
      {[92, 100, 108].map((x) => (
        <Circle key={x} cx={x} cy={30} r={2.4} fill={cor} />
      ))}
    </G>
  );
}
