/**
 * Gráfico de rosca interativo: como o gasto se divide entre as categorias com orçamento.
 * - Cada fatia é uma categoria (cor fixa por categoria), do maior gasto para o menor, a partir do topo.
 * - O centro mostra o total ou, com uma categoria selecionada, quanto do limite dela foi usado.
 * - Tocar numa fatia ou na legenda seleciona; tocar de novo (ou no centro) desfaz.
 * - A legenda abaixo repete os números e é o caminho acessível (leitor de tela) para escolher.
 * - Anel interno (opcional): dentro de cada fatia, a parte do gasto que foi imposto (Impostômetro).
 */

import { useEffect } from 'react';
import { type GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import {
  EtiquetaSituacao,
  IconeSituacao,
  ROTULO_SITUACAO,
  useCorSituacao,
} from '@/components/situacao-orcamento';
import { ThemedText } from '@/components/themed-text';
import { SeriesColors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import {
  LIMITE_ATENCAO,
  montarFatias,
  type FatiaOrcamento,
  type StatusOrcamento,
} from '@/services/orcamento-service';
import { formatarCentavos } from '@/utils/moeda';

const TAMANHO = 224;
const ESPESSURA = 28;
const ESPESSURA_SELECIONADA = 38;
const RAIO = (TAMANHO - ESPESSURA_SELECIONADA) / 2;
const CENTRO = TAMANHO / 2;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;
/** Anel interno dos impostos: logo por dentro das fatias */
const ESPESSURA_IMPOSTO = 8;
const RAIO_IMPOSTO = RAIO - ESPESSURA_SELECIONADA / 2 - ESPESSURA_IMPOSTO / 2 - 4;
const CIRCUNFERENCIA_IMPOSTO = 2 * Math.PI * RAIO_IMPOSTO;
/** Vão entre fatias (na cor do fundo), em pixels de arco */
const VAO = 3;

const CirculoAnimado = Animated.createAnimatedComponent(Circle);

type Props = {
  itens: StatusOrcamento[];
  selecionadoId: number | null;
  aoSelecionar: (categoriaId: number | null) => void;
  /** Impostos do mês por categoria; com ele, o gráfico mostra o anel interno dos impostos */
  impostosPorCategoria?: Map<number, number>;
};

function useCoresSeries() {
  const esquema = useColorScheme() === 'dark' ? 'dark' : 'light';
  return {
    cor: (fatia: Pick<FatiaOrcamento, 'indiceCor'>) =>
      fatia.indiceCor === null ? SeriesColors.outras[esquema] : SeriesColors[esquema][fatia.indiceCor],
  };
}

export function GraficoOrcamento({ itens, selecionadoId, aoSelecionar, impostosPorCategoria }: Props) {
  const theme = useTheme();
  const { cor } = useCoresSeries();
  const corSituacao = useCorSituacao();
  const fatias = montarFatias(itens);
  const selecionado = itens.find((i) => i.categoriaId === selecionadoId) ?? null;

  const totalGasto = itens.reduce((s, i) => s + i.gastoCentavos, 0);
  const totalLimites = itens.reduce((s, i) => s + i.limiteCentavos, 0);

  const imposto = (categoriaId: number | null) =>
    categoriaId === null ? 0 : Math.min(impostosPorCategoria?.get(categoriaId) ?? 0, itens.find((i) => i.categoriaId === categoriaId)?.gastoCentavos ?? 0);
  const totalImpostos = itens.reduce((s, i) => s + imposto(i.categoriaId), 0);
  const comImpostos = impostosPorCategoria !== undefined && totalImpostos > 0;
  // A fatia "Outras" junta as categorias que não couberam: o imposto dela é a soma dos delas.
  const visiveis = new Set(fatias.map((f) => f.categoriaId));
  const impostoDaFatia = (f: FatiaOrcamento) =>
    f.categoriaId !== null
      ? imposto(f.categoriaId)
      : itens.filter((i) => !visiveis.has(i.categoriaId)).reduce((s, i) => s + imposto(i.categoriaId), 0);

  const progresso = useSharedValue(0);
  useEffect(() => {
    progresso.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [progresso]);

  function alternar(categoriaId: number | null) {
    aoSelecionar(categoriaId === null || categoriaId === selecionadoId ? null : categoriaId);
  }

  // Descobre qual fatia foi tocada pelo ângulo do toque em relação ao centro.
  function aoTocarNoGrafico(evento: GestureResponderEvent) {
    const dx = evento.nativeEvent.locationX - CENTRO;
    const dy = evento.nativeEvent.locationY - CENTRO;
    const distancia = Math.hypot(dx, dy);
    if (distancia < RAIO - ESPESSURA_SELECIONADA / 2 - 4) {
      aoSelecionar(null); // toque no centro
      return;
    }
    if (distancia > RAIO + ESPESSURA_SELECIONADA / 2 + 12) return;
    const angulo = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
    const posicao = angulo / 360;
    const fatia = fatias.find((f) => posicao >= f.inicio && posicao < f.inicio + f.fracao);
    if (fatia?.categoriaId != null) alternar(fatia.categoriaId);
  }

  const resumoAcessivel =
    fatias.length === 0
      ? 'Gráfico de rosca vazio: ainda não há gastos nas categorias com orçamento.'
      : `Gráfico de rosca do gasto por categoria: ${fatias
          .map((f) => `${f.nome} ${Math.round(f.fracao * 100)}%`)
          .join(', ')}.${comImpostos ? ` Anel interno: ${formatarCentavos(totalImpostos)} em impostos.` : ''}`;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={aoTocarNoGrafico}
        accessibilityLabel={resumoAcessivel}
        accessibilityHint="Use a lista abaixo para escolher uma categoria"
        style={styles.grafico}>
        <Svg width={TAMANHO} height={TAMANHO}>
          {fatias.length === 0 ? (
            <Circle
              cx={CENTRO}
              cy={CENTRO}
              r={RAIO}
              fill="none"
              stroke={theme.chartGrid}
              strokeWidth={ESPESSURA}
            />
          ) : (
            fatias.map((f) => (
              <Fatia
                key={f.categoriaId ?? 'outras'}
                fatia={f}
                cor={cor(f)}
                unica={fatias.length === 1}
                selecionada={f.categoriaId !== null && f.categoriaId === selecionadoId}
                apagada={selecionadoId !== null && f.categoriaId !== selecionadoId}
                progresso={progresso}
              />
            ))
          )}
          {comImpostos &&
            fatias.map((f) => (
              <ArcoImposto
                key={`imposto-${f.categoriaId ?? 'outras'}`}
                fatia={f}
                parte={f.valorCentavos > 0 ? impostoDaFatia(f) / f.valorCentavos : 0}
                corTrilho={theme.chartGrid}
                corImposto={theme.text}
                unica={fatias.length === 1}
                apagada={selecionadoId !== null && f.categoriaId !== selecionadoId}
                progresso={progresso}
              />
            ))}
        </Svg>

        {/* Centro da rosca */}
        <View style={styles.centro} pointerEvents="none">
          {selecionado ? (
            <>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.textoCentro}>
                {selecionado.nome}
              </ThemedText>
              <ThemedText style={styles.valorCentro} numberOfLines={1} adjustsFontSizeToFit>
                {formatarCentavos(selecionado.gastoCentavos)}
              </ThemedText>
              <View style={styles.linhaCentro}>
                <IconeSituacao situacao={selecionado.situacao} cor={corSituacao(selecionado.situacao)} />
                <ThemedText type="small" themeColor="textSecondary">
                  {Math.floor(selecionado.percentual)}% do limite
                </ThemedText>
              </View>
              {comImpostos && (
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  style={styles.textoCentro}>
                  {formatarCentavos(imposto(selecionado.categoriaId))} de impostos
                </ThemedText>
              )}
            </>
          ) : (
            <>
              <ThemedText type="small" themeColor="textSecondary" style={styles.textoCentro}>
                Gasto no mês
              </ThemedText>
              <ThemedText style={styles.valorCentro} numberOfLines={1} adjustsFontSizeToFit>
                {formatarCentavos(totalGasto)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.textoCentro}>
                de {formatarCentavos(totalLimites)}
              </ThemedText>
              {comImpostos && (
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  style={styles.textoCentro}>
                  {formatarCentavos(totalImpostos)} de impostos
                </ThemedText>
              )}
            </>
          )}
        </View>
      </Pressable>

      {/* Legenda = lista acessível com os mesmos números */}
      <View style={styles.legenda} accessibilityRole="radiogroup">
        {[...itens]
          .sort((a, b) => b.gastoCentavos - a.gastoCentavos)
          .map((item) => {
            const fatia = fatias.find((f) => f.categoriaId === item.categoriaId);
            const ativo = item.categoriaId === selecionadoId;
            const participacao = fatia ? Math.round(fatia.fracao * 100) : 0;
            return (
              <Pressable
                key={item.categoriaId}
                onPress={() => alternar(item.categoriaId)}
                accessibilityRole="radio"
                accessibilityState={{ checked: ativo }}
                accessibilityLabel={`${item.nome}: ${formatarCentavos(item.gastoCentavos)}, ${participacao}% do gasto, ${Math.floor(item.percentual)}% do limite de ${formatarCentavos(item.limiteCentavos)}${comImpostos ? `, ${formatarCentavos(imposto(item.categoriaId))} de impostos` : ''}. ${ROTULO_SITUACAO[item.situacao]}`}
                style={({ pressed }) => [
                  styles.itemLegenda,
                  ativo && { backgroundColor: theme.backgroundSelected },
                  selecionadoId !== null && !ativo && styles.apagado,
                  pressed && styles.pressionado,
                ]}>
                <View
                  style={[
                    styles.amostra,
                    fatia
                      ? { backgroundColor: cor(fatia) }
                      : { borderWidth: 2, borderColor: theme.chartBaseline },
                  ]}
                />
                <View style={styles.flex}>
                  <ThemedText type="small" numberOfLines={1}>
                    {item.nome}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {participacao}% do gasto
                    {comImpostos && item.gastoCentavos > 0
                      ? ` · ${formatarCentavos(imposto(item.categoriaId))} imp.`
                      : ''}
                  </ThemedText>
                </View>
                <View style={styles.valoresLegenda}>
                  <ThemedText type="smallBold">{formatarCentavos(item.gastoCentavos)}</ThemedText>
                  <View style={styles.linhaCentro}>
                    <IconeSituacao situacao={item.situacao} cor={corSituacao(item.situacao)} />
                    <ThemedText type="small" themeColor="textSecondary">
                      {Math.floor(item.percentual)}% do limite
                    </ThemedText>
                  </View>
                </View>
              </Pressable>
            );
          })}
      </View>

      {/* O que significam o anel interno e os ícones de situação */}
      {comImpostos && (
        <View style={styles.linhaCentro}>
          <View style={[styles.amostraImposto, { backgroundColor: theme.text }]} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
            Anel interno: a parte de cada gasto que foi imposto ({Math.round((totalImpostos / totalGasto) * 100)}% do total)
          </ThemedText>
        </View>
      )}
      <View style={styles.legendaSituacao}>
        <EtiquetaSituacao situacao="dentro" />
        <EtiquetaSituacao situacao="atencao" texto={`Atenção (${LIMITE_ATENCAO}%+)`} />
        <EtiquetaSituacao situacao="ultrapassou" />
      </View>
    </View>
  );
}

function Fatia({
  fatia,
  cor,
  unica,
  selecionada,
  apagada,
  progresso,
}: {
  fatia: FatiaOrcamento;
  cor: string;
  unica: boolean;
  selecionada: boolean;
  apagada: boolean;
  progresso: SharedValue<number>;
}) {
  const vao = unica ? 0 : VAO;
  const comprimento = Math.max(fatia.fracao * CIRCUNFERENCIA - vao, 0.5);
  // Começa meio vão depois do início, para o vão ficar centrado entre duas fatias.
  const rotacao = -90 + fatia.inicio * 360 + ((vao / 2) / CIRCUNFERENCIA) * 360;

  const propsAnimadas = useAnimatedProps(() => ({
    strokeDasharray: `${comprimento * progresso.value} ${CIRCUNFERENCIA}`,
  }));

  return (
    <CirculoAnimado
      cx={CENTRO}
      cy={CENTRO}
      r={RAIO}
      fill="none"
      stroke={cor}
      strokeWidth={selecionada ? ESPESSURA_SELECIONADA : ESPESSURA}
      strokeOpacity={apagada ? 0.3 : 1}
      transform={`rotate(${rotacao} ${CENTRO} ${CENTRO})`}
      animatedProps={propsAnimadas}
    />
  );
}

/** Faixa por dentro da fatia: o trilho cobre a fatia inteira e a parte escura é o imposto. */
function ArcoImposto({
  fatia,
  parte,
  corTrilho,
  corImposto,
  unica,
  apagada,
  progresso,
}: {
  fatia: FatiaOrcamento;
  /** Imposto ÷ gasto da fatia, de 0 a 1 */
  parte: number;
  corTrilho: string;
  corImposto: string;
  unica: boolean;
  apagada: boolean;
  progresso: SharedValue<number>;
}) {
  const vao = unica ? 0 : VAO;
  const trilho = Math.max(fatia.fracao * CIRCUNFERENCIA_IMPOSTO - vao, 0.5);
  const imposto = trilho * Math.min(Math.max(parte, 0), 1);
  const rotacao = -90 + fatia.inicio * 360 + ((vao / 2) / CIRCUNFERENCIA_IMPOSTO) * 360;

  const propsTrilho = useAnimatedProps(() => ({
    strokeDasharray: `${trilho * progresso.value} ${CIRCUNFERENCIA_IMPOSTO}`,
  }));
  const propsImposto = useAnimatedProps(() => ({
    strokeDasharray: `${imposto * progresso.value} ${CIRCUNFERENCIA_IMPOSTO}`,
  }));

  return (
    <>
      <CirculoAnimado
        cx={CENTRO}
        cy={CENTRO}
        r={RAIO_IMPOSTO}
        fill="none"
        stroke={corTrilho}
        strokeWidth={ESPESSURA_IMPOSTO}
        strokeOpacity={apagada ? 0.3 : 1}
        transform={`rotate(${rotacao} ${CENTRO} ${CENTRO})`}
        animatedProps={propsTrilho}
      />
      {imposto > 0.5 && (
        <CirculoAnimado
          cx={CENTRO}
          cy={CENTRO}
          r={RAIO_IMPOSTO}
          fill="none"
          stroke={corImposto}
          strokeWidth={ESPESSURA_IMPOSTO}
          strokeOpacity={apagada ? 0.2 : 0.7}
          transform={`rotate(${rotacao} ${CENTRO} ${CENTRO})`}
          animatedProps={propsImposto}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  grafico: {
    width: TAMANHO,
    height: TAMANHO,
    alignSelf: 'center',
  },
  centro: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    // Deixa livre o anel das fatias e o anel interno dos impostos.
    paddingHorizontal: ESPESSURA_SELECIONADA + ESPESSURA_IMPOSTO + Spacing.two,
  },
  textoCentro: {
    textAlign: 'center',
  },
  valorCentro: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: 700,
    textAlign: 'center',
  },
  linhaCentro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legenda: {
    gap: Spacing.half,
  },
  itemLegenda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  amostra: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  amostraImposto: {
    width: 16,
    height: 6,
    borderRadius: 3,
    opacity: 0.7,
  },
  flex: {
    flex: 1,
  },
  valoresLegenda: {
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
  legendaSituacao: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  apagado: {
    opacity: 0.5,
  },
  pressionado: {
    opacity: 0.6,
  },
});
