import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Botao, Cartao } from '@/components/tela';
import { TelaSecundaria } from '@/components/tela-secundaria';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAnalisePrecos } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import type { PrecoProduto } from '@/services/precos-service';
import { formatarDataCurta } from '@/utils/datas';
import { formatarCentavos } from '@/utils/moeda';

function numero(n: number) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

function porUnidade(p: PrecoProduto) {
  return p.unidade && p.unidade !== 'UN' ? `/${p.unidade.toLocaleLowerCase('pt-BR')}` : '';
}

/** Inflação pessoal: os preços do que você compra, a partir das notas fiscais lidas. */
export default function MeusProdutosScreen() {
  const theme = useTheme();
  const a = useAnalisePrecos();

  if (a.produtosComprados === 0) {
    return (
      <TelaSecundaria titulo="Meus produtos">
        <Cartao>
          <ThemedText type="smallBold">Sua inflação pessoal</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Leia o QR Code das notas fiscais das suas compras. Quando você comprar o mesmo produto de
            novo, o EcoTrust mostra quanto o preço mudou e em qual loja saiu mais barato.
          </ThemedText>
          <Botao texto="Ler QR Code da nota" icone="qrcode" onPress={() => router.push('/ler-nota')} />
        </Cartao>
      </TelaSecundaria>
    );
  }

  const subiu = (a.inflacaoPessoal ?? 0) > 0;
  return (
    <TelaSecundaria titulo="Meus produtos">
      <Cartao>
        <ThemedText type="small" themeColor="textSecondary">
          Sua inflação pessoal (últimos 12 meses)
        </ThemedText>
        {a.inflacaoPessoal !== null ? (
          <>
            <ThemedText style={[styles.valor, { color: subiu ? theme.negative : theme.positive }]}>
              {subiu ? '+' : ''}
              {numero(a.inflacaoPessoal)}%
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Média de {a.produtosComparados} {a.produtosComparados === 1 ? 'produto comprado' : 'produtos comprados'} mais
              de uma vez, com mais peso para o que você gasta mais.
            </ThemedText>
          </>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Você tem {a.produtosComprados} produtos registrados. Quando comprar algum deles de novo, a
            variação de preço aparece aqui.
          </ThemedText>
        )}
      </Cartao>

      <Lista titulo="Ficaram mais caros" produtos={a.subiram} cor={theme.negative} />
      <Lista titulo="Ficaram mais baratos" produtos={a.baixaram} cor={theme.positive} />

      {a.ondeEMaisBarato.length > 0 && (
        <>
          <ThemedText type="smallBold" accessibilityRole="header">
            Onde é mais barato
          </ThemedText>
          <Cartao style={styles.lista}>
            {a.ondeEMaisBarato.map((p, i) => (
              <View
                key={p.chave}
                style={[styles.item, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}
                accessible
                accessibilityLabel={`${p.nome}: mais barato em ${p.maisBarato!.loja}, ${formatarCentavos(p.maisBarato!.precoCentavos)}`}>
                <View style={styles.flex}>
                  <ThemedText type="small" numberOfLines={1}>
                    {p.nome}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {p.maisBarato!.loja}
                  </ThemedText>
                </View>
                <View style={styles.direita}>
                  <ThemedText type="smallBold">
                    {formatarCentavos(p.maisBarato!.precoCentavos)}
                    {porUnidade(p)}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.positive }}>
                    {formatarCentavos(p.maisBarato!.economiaCentavos)} a menos
                  </ThemedText>
                </View>
              </View>
            ))}
          </Cartao>
        </>
      )}
    </TelaSecundaria>
  );
}

function Lista({ titulo, produtos, cor }: { titulo: string; produtos: PrecoProduto[]; cor: string }) {
  const theme = useTheme();
  if (produtos.length === 0) return null;
  return (
    <>
      <ThemedText type="smallBold" accessibilityRole="header">
        {titulo}
      </ThemedText>
      <Cartao style={styles.lista}>
        {produtos.map((p, i) => (
          <View
            key={p.chave}
            style={[styles.item, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}
            accessible
            accessibilityLabel={`${p.nome}: de ${formatarCentavos(p.primeiroPrecoCentavos)} para ${formatarCentavos(p.ultimoPrecoCentavos)}, ${numero(p.variacao)}%`}>
            <View style={styles.flex}>
              <ThemedText type="small" numberOfLines={1}>
                {p.nome}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatarCentavos(p.primeiroPrecoCentavos)} ({formatarDataCurta(p.primeiraData)}) →{' '}
                {formatarCentavos(p.ultimoPrecoCentavos)}
                {porUnidade(p)}
              </ThemedText>
            </View>
            <ThemedText type="smallBold" style={{ color: cor }}>
              {p.variacao > 0 ? '+' : ''}
              {numero(p.variacao)}%
            </ThemedText>
          </View>
        ))}
      </Cartao>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  valor: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: 700,
  },
  lista: {
    paddingVertical: Spacing.one,
    gap: 0,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 52,
    paddingVertical: Spacing.two,
  },
  direita: {
    alignItems: 'flex-end',
  },
});
