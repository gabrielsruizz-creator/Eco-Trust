/**
 * Desenho do mascote (SVG) com expressão conforme o humor e folhas conforme o estágio.
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
import Svg, { Circle, Ellipse, G, Path, Polygon } from 'react-native-svg';

import type { EstagioPet, HumorPet } from '@/services/pet-service';
import { vibrarLeve } from '@/utils/vibracao';

const CORPO = '#1FB58F';
const CORPO_CANSADO = '#7FA88E';
const BARRIGA = '#C9F0D6';
const FOLHA = '#0A7A5E';
const TINTA = '#1F2D27';

type Props = {
  humor: HumorPet;
  estagio: EstagioPet;
  tamanho?: number;
  aoTocar?: () => void;
  rotuloAcessivel: string;
};

export function PetEco({ humor, estagio, tamanho = 150, aoTocar, rotuloAcessivel }: Props) {
  const [piscando, setPiscando] = useState(false);
  const flutuar = useSharedValue(0);
  const escala = useSharedValue(1);

  // Flutua para cima e para baixo sem parar (mais devagar quando está triste ou com fome).
  useEffect(() => {
    const lento = humor === 'triste' || humor === 'com-fome';
    flutuar.set(withRepeat(
      withTiming(lento ? -2 : -6, { duration: lento ? 1800 : 1200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    ));
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

  const cansado = humor === 'triste' || humor === 'com-fome';
  const fator = estagio === 'filhote' ? 0.82 : estagio === 'jovem' ? 0.9 : 1;

  return (
    <Pressable onPress={tocar} accessibilityRole="button" accessibilityLabel={rotuloAcessivel} accessibilityHint="Toque para ouvir outra frase">
      <Animated.View style={[{ width: tamanho, height: tamanho }, estilo]}>
        <Svg width={tamanho} height={tamanho} viewBox="0 0 120 120">
          {/* Sombra no chão */}
          <Ellipse cx={60} cy={110} rx={28 * fator} ry={4} fill="#000" opacity={0.12} />
          <G transform={`translate(${60 - 60 * fator} ${(1 - fator) * 100}) scale(${fator})`}>
            <Folhas estagio={estagio} />
            {/* Bracinhos */}
            <Ellipse cx={22} cy={74} rx={7} ry={10} fill={cansado ? CORPO_CANSADO : CORPO} />
            <Ellipse cx={98} cy={74} rx={7} ry={10} fill={cansado ? CORPO_CANSADO : CORPO} />
            {/* Corpo e barriga */}
            <Ellipse cx={60} cy={68} rx={38} ry={36} fill={cansado ? CORPO_CANSADO : CORPO} />
            <Ellipse cx={60} cy={80} rx={22} ry={16} fill={BARRIGA} />
            <Rosto humor={humor} piscando={piscando} />
          </G>
          {humor === 'radiante' && <Brilhos />}
          {humor === 'com-fome' && <Path d="M88 30 q6 -6 12 0 q-6 6 -12 0z" fill={FOLHA} opacity={0.8} />}
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

function Folhas({ estagio }: { estagio: EstagioPet }) {
  const folha = (rotacao: number, tamanho = 1) => (
    <Path
      key={rotacao}
      d="M60 34 C52 22 54 12 60 6 C66 12 68 22 60 34 Z"
      fill={FOLHA}
      transform={`rotate(${rotacao} 60 34) translate(${60 - 60 * tamanho} ${34 - 34 * tamanho}) scale(${tamanho})`}
    />
  );
  const quantas = estagio === 'filhote' ? [0] : estagio === 'jovem' ? [-25, 25] : [-35, 0, 35];
  return (
    <G>
      {quantas.map((r) => folha(r, estagio === 'filhote' ? 0.7 : 1))}
      {estagio === 'sabio' && <Polygon points="44,30 50,18 56,28 60,14 64,28 70,18 76,30" fill="#F2C94C" />}
    </G>
  );
}

function Rosto({ humor, piscando }: { humor: HumorPet; piscando: boolean }) {
  const olhosFeliz = humor === 'radiante';
  return (
    <G>
      {/* Olhos */}
      {olhosFeliz ? (
        <>
          <Path d="M42 62 q5 -7 10 0" stroke={TINTA} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M68 62 q5 -7 10 0" stroke={TINTA} strokeWidth={3} fill="none" strokeLinecap="round" />
        </>
      ) : humor === 'triste' ? (
        <>
          <Path d="M42 62 q5 4 10 0" stroke={TINTA} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M68 62 q5 4 10 0" stroke={TINTA} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M45 67 q-3 6 0 8 q3 -2 0 -8z" fill="#5DADE2" />
        </>
      ) : (
        <>
          <Ellipse cx={47} cy={60} rx={5} ry={piscando ? 0.8 : 6} fill={TINTA} />
          <Ellipse cx={73} cy={60} rx={5} ry={piscando ? 0.8 : 6} fill={TINTA} />
          {!piscando && (
            <>
              <Circle cx={49} cy={58} r={1.6} fill="#fff" />
              <Circle cx={75} cy={58} r={1.6} fill="#fff" />
            </>
          )}
        </>
      )}

      {/* Sobrancelhas de preocupação */}
      {humor === 'preocupado' && (
        <>
          <Path d="M40 50 L52 53" stroke={TINTA} strokeWidth={2.5} strokeLinecap="round" />
          <Path d="M80 50 L68 53" stroke={TINTA} strokeWidth={2.5} strokeLinecap="round" />
        </>
      )}

      {/* Bochechas */}
      {(humor === 'feliz' || humor === 'radiante') && (
        <>
          <Ellipse cx={38} cy={72} rx={5} ry={3} fill="#F19CB4" opacity={0.8} />
          <Ellipse cx={82} cy={72} rx={5} ry={3} fill="#F19CB4" opacity={0.8} />
        </>
      )}

      {/* Boca */}
      {humor === 'radiante' && <Path d="M48 74 Q60 90 72 74 Z" fill={TINTA} />}
      {humor === 'feliz' && <Path d="M50 75 Q60 84 70 75" stroke={TINTA} strokeWidth={3} fill="none" strokeLinecap="round" />}
      {humor === 'tranquilo' && <Path d="M52 77 Q60 81 68 77" stroke={TINTA} strokeWidth={3} fill="none" strokeLinecap="round" />}
      {humor === 'preocupado' && (
        <Path d="M51 79 Q55.5 75 60 79 Q64.5 83 69 79" stroke={TINTA} strokeWidth={3} fill="none" strokeLinecap="round" />
      )}
      {humor === 'com-fome' && <Ellipse cx={60} cy={79} rx={4.5} ry={5.5} fill={TINTA} />}
      {humor === 'triste' && <Path d="M50 82 Q60 73 70 82" stroke={TINTA} strokeWidth={3} fill="none" strokeLinecap="round" />}
    </G>
  );
}

function Brilhos() {
  const estrela = (x: number, y: number, t: number) => (
    <Path
      key={`${x}-${y}`}
      d={`M${x} ${y - t} L${x + t / 3} ${y - t / 3} L${x + t} ${y} L${x + t / 3} ${y + t / 3} L${x} ${y + t} L${x - t / 3} ${y + t / 3} L${x - t} ${y} L${x - t / 3} ${y - t / 3} Z`}
      fill="#F2C94C"
    />
  );
  return <G>{[estrela(16, 30, 6), estrela(104, 40, 5), estrela(98, 16, 4)]}</G>;
}
