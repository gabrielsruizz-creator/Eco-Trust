import { router } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Botao, Cartao } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ImpostoDoItem } from '@/services/impostometro-service';
import type { ItemNota, NotaSalva } from '@/types/financas';
import { formatarCentavos } from '@/utils/moeda';

/** Quantos itens aparecem antes do "Ver todos" */
const ITENS_VISIVEIS = 8;

/** Soma gasto e imposto estimado por tipo de produto (os não reconhecidos ficam juntos, pela categoria). */
function agruparPorTipo(itens: ItemNota[], impostos: ImpostoDoItem[]) {
  const grupos = new Map<string, { tipo: string; gastoCentavos: number; impostoCentavos: number; quantidade: number }>();
  itens.forEach((item, i) => {
    const tipo = impostos[i]?.tipo ?? 'outros (média da categoria)';
    const grupo = grupos.get(tipo) ?? { tipo, gastoCentavos: 0, impostoCentavos: 0, quantidade: 0 };
    grupo.gastoCentavos += item.valorTotalCentavos;
    grupo.impostoCentavos += impostos[i]?.centavos ?? 0;
    grupo.quantidade++;
    grupos.set(tipo, grupo);
  });
  return [...grupos.values()].sort((a, b) => b.impostoCentavos - a.impostoCentavos);
}

function quantidade(item: ItemNota) {
  const n = item.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
  return item.unidade ? `${n} ${item.unidade.toLocaleLowerCase('pt-BR')}` : n;
}

/**
 * Produtos de uma compra registrada pelo QR Code da nota fiscal.
 * `chaveNota` sem `nota` = nota lida antes de existir a lista de itens: dá para importar lendo de novo.
 */
export function ItensDaNota({
  nota,
  chaveNota,
  valorPagoCentavos,
  impostosPorItem,
}: {
  nota: NotaSalva | null;
  chaveNota: string | null;
  valorPagoCentavos: number;
  /** Imposto estimado de cada item (quando a nota não informou os tributos) */
  impostosPorItem: ImpostoDoItem[] | null;
}) {
  const theme = useTheme();
  const [todos, setTodos] = useState(false);

  if (!nota || nota.itens.length === 0) {
    if (!chaveNota) return null;
    return (
      <Cartao>
        <ThemedText type="smallBold">Itens da compra</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {nota
            ? 'Não foi possível ler a lista de produtos no site da SEFAZ deste estado.'
            : 'Leia o QR Code desta nota de novo para trazer a lista de produtos.'}
        </ThemedText>
        {!nota && (
          <Botao texto="Ler QR Code de novo" variante="secundario" icone="qrcode" onPress={() => router.push('/ler-nota')} />
        )}
        {nota?.url && <LinkSefaz url={nota.url} />}
      </Cartao>
    );
  }

  const visiveis = todos ? nota.itens : nota.itens.slice(0, ITENS_VISIVEIS);
  const soma = nota.itens.reduce((s, i) => s + i.valorTotalCentavos, 0);
  const diferenca = valorPagoCentavos - soma;

  return (
    <Cartao>
      <View style={styles.linha}>
        <ThemedText type="smallBold" style={styles.flex} accessibilityRole="header">
          Itens da compra ({nota.itens.length})
        </ThemedText>
      </View>
      {nota.emitente && (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {nota.emitente}
        </ThemedText>
      )}

      {impostosPorItem && (
        <View style={[styles.resumoTipos, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold">Imposto estimado por tipo de produto</ThemedText>
          {agruparPorTipo(nota.itens, impostosPorItem).map((g) => (
            <View
              key={g.tipo}
              style={styles.linha}
              accessible
              accessibilityLabel={`${g.tipo}: ${formatarCentavos(g.impostoCentavos)} de impostos em ${formatarCentavos(g.gastoCentavos)}`}>
              <ThemedText type="small" style={styles.flex} numberOfLines={1}>
                {g.tipo.charAt(0).toLocaleUpperCase('pt-BR') + g.tipo.slice(1)}{' '}
                <ThemedText type="small" themeColor="textSecondary">
                  ({g.quantidade} {g.quantidade === 1 ? 'item' : 'itens'})
                </ThemedText>
              </ThemedText>
              <ThemedText type="smallBold">≈ {formatarCentavos(g.impostoCentavos)}</ThemedText>
            </View>
          ))}
        </View>
      )}

      {visiveis.map((item, i) => {
        const imposto = impostosPorItem?.[i];
        return (
          <View
            key={i}
            style={[styles.item, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}
            accessible
            accessibilityLabel={`${item.descricao}: ${quantidade(item)}, ${formatarCentavos(item.valorTotalCentavos)}${imposto ? `, cerca de ${formatarCentavos(imposto.centavos)} de impostos` : ''}`}>
            <View style={styles.flex}>
              <ThemedText type="small" numberOfLines={2}>
                {item.descricao}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {quantidade(item)}
                {item.valorUnitarioCentavos !== null && item.quantidade !== 1
                  ? ` × ${formatarCentavos(item.valorUnitarioCentavos)}`
                  : ''}
                {imposto ? ` · ${imposto.carga}% de imposto${imposto.tipo ? ` (${imposto.tipo})` : ''}` : ''}
              </ThemedText>
            </View>
            <View style={styles.valores}>
              <ThemedText type="smallBold">{formatarCentavos(item.valorTotalCentavos)}</ThemedText>
              {imposto && (
                <ThemedText type="small" themeColor="textSecondary">
                  ≈ {formatarCentavos(imposto.centavos)} imp.
                </ThemedText>
              )}
            </View>
          </View>
        );
      })}

      {nota.itens.length > ITENS_VISIVEIS && (
        <Pressable onPress={() => setTodos(!todos)} accessibilityRole="button" hitSlop={8}>
          <ThemedText type="smallBold" style={{ color: theme.accentText }}>
            {todos ? 'Mostrar menos' : `Ver todos os ${nota.itens.length} itens`}
          </ThemedText>
        </Pressable>
      )}

      {diferenca !== 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          Soma dos itens: {formatarCentavos(soma)}.{' '}
          {diferenca < 0
            ? `Você pagou ${formatarCentavos(-diferenca)} a menos (descontos).`
            : `Você pagou ${formatarCentavos(diferenca)} a mais (acréscimos ou valor editado).`}
        </ThemedText>
      )}
      {nota.url && <LinkSefaz url={nota.url} />}
    </Cartao>
  );
}

function LinkSefaz({ url }: { url: string }) {
  const theme = useTheme();
  return (
    <Pressable onPress={() => openBrowserAsync(url)} accessibilityRole="link" hitSlop={8}>
      <ThemedText type="smallBold" style={{ color: theme.accentText }}>
        Ver a nota no site da SEFAZ
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  valores: {
    alignItems: 'flex-end',
  },
  resumoTipos: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
