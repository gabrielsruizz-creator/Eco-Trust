import { router } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Botao, Cartao } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ItemNota, NotaSalva } from '@/types/financas';
import { formatarCentavos } from '@/utils/moeda';

/** Quantos itens aparecem antes do "Ver todos" */
const ITENS_VISIVEIS = 8;

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
}: {
  nota: NotaSalva | null;
  chaveNota: string | null;
  valorPagoCentavos: number;
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

      {visiveis.map((item, i) => (
        <View
          key={i}
          style={[styles.item, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}
          accessible
          accessibilityLabel={`${item.descricao}: ${quantidade(item)}, ${formatarCentavos(item.valorTotalCentavos)}`}>
          <View style={styles.flex}>
            <ThemedText type="small" numberOfLines={2}>
              {item.descricao}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {quantidade(item)}
              {item.valorUnitarioCentavos !== null && item.quantidade !== 1
                ? ` × ${formatarCentavos(item.valorUnitarioCentavos)}`
                : ''}
            </ThemedText>
          </View>
          <ThemedText type="smallBold">{formatarCentavos(item.valorTotalCentavos)}</ThemedText>
        </View>
      ))}

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
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
