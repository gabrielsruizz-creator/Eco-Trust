import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { OrigemImposto } from '@/services/impostometro-service';
import type { Transacao } from '@/types/financas';

export type TomSelo = 'verde' | 'ambar' | 'rosa';

/** Etiqueta de status em pílula com contorno (ex.: "Nota", "Estimado", "Recorrente"). */
export function Selo({ texto, tom }: { texto: string; tom: TomSelo }) {
  const theme = useTheme();
  const cores = {
    verde: { cor: theme.positive, fundo: theme.positiveSoft, borda: theme.positiveBorder },
    ambar: { cor: theme.warning, fundo: theme.warningSoft, borda: theme.warningBorder },
    rosa: { cor: theme.accentText, fundo: theme.accentSoft, borda: theme.accentBorder },
  }[tom];
  return (
    <View style={[styles.selo, { backgroundColor: cores.fundo, borderColor: cores.borda }]}>
      <ThemedText type="small" style={[styles.texto, { color: cores.cor }]} numberOfLines={1}>
        {texto}
      </ThemedText>
    </View>
  );
}

/** Selo de um lançamento: receita, recorrente, ou de onde veio o imposto (nota ou estimativa). */
export function seloDoLancamento(t: Pick<Transacao, 'tipo' | 'recorrente'>, origem: OrigemImposto | null): { texto: string; tom: TomSelo } {
  if (t.tipo === 'receita') return { texto: 'Recebido', tom: 'verde' };
  if (t.recorrente) return { texto: 'Recorrente', tom: 'rosa' };
  if (origem === 'nota') return { texto: 'Nota', tom: 'verde' };
  return { texto: 'Estimado', tom: 'ambar' };
}

const styles = StyleSheet.create({
  selo: {
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  texto: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: 600,
  },
});
