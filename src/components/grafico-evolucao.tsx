/**
 * Gráfico de linha interativo da nota de saúde (0 a 100) mês a mês.
 * - Linhas finas de referência nas faixas (40, 60, 80).
 * - Ponto cheio = mês registrado; ponto vazado = mês estimado (a diferença não depende de cor).
 * - Tocar num mês seleciona o ponto (o comentário aparece fora do gráfico, em quem o usa).
 */

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PontoEvolucao } from '@/services/evolucao-service';

const ALTURA = 190;
const MARGEM = { esquerda: 30, direita: 16, topo: 22, base: 26 };
const REFERENCIAS = [40, 60, 80];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

type Props = {
  pontos: PontoEvolucao[];
  selecionado: number;
  aoSelecionar: (indice: number) => void;
};

export function GraficoEvolucao({ pontos, selecionado, aoSelecionar }: Props) {
  const theme = useTheme();
  const [largura, setLargura] = useState(0);

  const areaLargura = Math.max(0, largura - MARGEM.esquerda - MARGEM.direita);
  const areaAltura = ALTURA - MARGEM.topo - MARGEM.base;
  const passo = pontos.length > 1 ? areaLargura / (pontos.length - 1) : 0;
  const x = (i: number) => MARGEM.esquerda + (pontos.length > 1 ? i * passo : areaLargura / 2);
  const y = (nota: number) => MARGEM.topo + areaAltura * (1 - nota / 100);

  const linha = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.nota)}`).join(' ');
  const area =
    pontos.length > 1
      ? `${linha} L ${x(pontos.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`
      : '';
  const temEstimado = pontos.some((p) => p.estimado);
  const mesNome = (mes: string) => MESES[Number(mes.slice(5, 7)) - 1];

  return (
    <View>
      <View
        style={{ height: ALTURA }}
        onLayout={(e) => setLargura(e.nativeEvent.layout.width)}
        accessible
        accessibilityLabel={`Gráfico da nota de saúde por mês: ${pontos
          .map((p) => `${mesNome(p.mes)} ${p.nota}${p.estimado ? ' estimado' : ''}`)
          .join(', ')}`}>
        {largura > 0 && (
          <Svg width={largura} height={ALTURA}>
            {/* Referências das faixas */}
            {REFERENCIAS.map((ref) => (
              <Line
                key={ref}
                x1={MARGEM.esquerda}
                x2={largura - MARGEM.direita}
                y1={y(ref)}
                y2={y(ref)}
                stroke={theme.chartGrid}
                strokeWidth={1}
              />
            ))}
            {REFERENCIAS.map((ref) => (
              <SvgText key={`t${ref}`} x={MARGEM.esquerda - 6} y={y(ref) + 4} fontSize={10} fill={theme.textSecondary} textAnchor="end">
                {ref}
              </SvgText>
            ))}
            <Line
              x1={MARGEM.esquerda}
              x2={largura - MARGEM.direita}
              y1={y(0)}
              y2={y(0)}
              stroke={theme.chartBaseline}
              strokeWidth={1}
            />

            {/* Guia vertical do mês selecionado */}
            {pontos[selecionado] && (
              <Line
                x1={x(selecionado)}
                x2={x(selecionado)}
                y1={MARGEM.topo - 6}
                y2={y(0)}
                stroke={theme.chartBaseline}
                strokeWidth={1}
              />
            )}

            {/* Área suave e linha */}
            {area !== '' && <Path d={area} fill={theme.accent} opacity={0.1} />}
            {pontos.length > 1 && (
              <Path d={linha} stroke={theme.accent} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            )}

            {/* Pontos: cheio = registrado, vazado = estimado; anel na cor do fundo para destacar */}
            {pontos.map((p, i) => {
              const ativo = i === selecionado;
              return (
                <Circle
                  key={p.mes}
                  cx={x(i)}
                  cy={y(p.nota)}
                  r={ativo ? 7 : 5}
                  fill={p.estimado ? theme.backgroundElement : theme.accent}
                  stroke={p.estimado ? theme.accent : theme.backgroundElement}
                  strokeWidth={2}
                />
              );
            })}

            {/* Valor do ponto selecionado */}
            {pontos[selecionado] && (
              <SvgText
                x={x(selecionado)}
                y={y(pontos[selecionado].nota) - 12}
                fontSize={13}
                fontWeight="700"
                fill={theme.text}
                textAnchor="middle">
                {pontos[selecionado].nota}
              </SvgText>
            )}

            {/* Meses */}
            {pontos.map((p, i) => (
              <SvgText
                key={`m${p.mes}`}
                x={x(i)}
                y={ALTURA - 8}
                fontSize={11}
                fontWeight={i === selecionado ? '700' : '400'}
                fill={i === selecionado ? theme.text : theme.textSecondary}
                textAnchor="middle">
                {mesNome(p.mes)}
              </SvgText>
            ))}
          </Svg>
        )}

        {/* Áreas de toque (maiores que os pontos): uma coluna por mês */}
        {largura > 0 && (
          <View style={[StyleSheet.absoluteFill, styles.toques]}>
            {pontos.map((p, i) => {
              const largCol = pontos.length > 1 ? passo : areaLargura;
              return (
                <Pressable
                  key={p.mes}
                  onPress={() => aoSelecionar(i)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: i === selecionado }}
                  accessibilityLabel={`${mesNome(p.mes)}: nota ${p.nota}${p.estimado ? ', estimada' : ''}`}
                  style={{ position: 'absolute', left: x(i) - largCol / 2, width: largCol, top: 0, bottom: 0 }}
                />
              );
            })}
          </View>
        )}
      </View>

      {temEstimado && (
        <View style={styles.legenda}>
          <View style={styles.itemLegenda}>
            <View style={[styles.marcador, { backgroundColor: theme.accent, borderColor: theme.accent }]} />
            <ThemedText type="small" themeColor="textSecondary">
              Registrado
            </ThemedText>
          </View>
          <View style={styles.itemLegenda}>
            <View style={[styles.marcador, { borderColor: theme.accent }]} />
            <ThemedText type="small" themeColor="textSecondary">
              Estimado pelos lançamentos
            </ThemedText>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toques: {
    flexDirection: 'row',
  },
  legenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  itemLegenda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  marcador: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
});
