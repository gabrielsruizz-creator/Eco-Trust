import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ItensDaNota } from '@/components/itens-nota';
import { Botao, Cartao } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useImpostosDoLancamento, useNotaDoLancamento, useTransacao } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import { excluirTransacao } from '@/services/transacoes-service';
import { formatarDataPorExtenso } from '@/utils/datas';
import { formatarCentavos } from '@/utils/moeda';

export default function DetalheLancamentoScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const transacao = useTransacao(Number(id));
  const impostos = useImpostosDoLancamento(Number(id));
  const nota = useNotaDoLancamento(Number(id));

  function confirmarExclusao() {
    if (!transacao) return;
    Alert.alert(
      'Excluir lançamento',
      `Excluir "${transacao.descricao || transacao.categoriaNome}"? Isso não pode ser desfeito.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            excluirTransacao(transacao.id);
            router.back();
          },
        },
      ],
    );
  }

  const receita = transacao?.tipo === 'receita';
  const corValor = receita ? theme.positive : theme.negative;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topo}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              ‹ Voltar
            </ThemedText>
          </Pressable>
          <ThemedText type="smallBold" accessibilityRole="header">
            Detalhes
          </ThemedText>
          <View style={styles.espacoTopo} />
        </View>

        {!transacao ? (
          <View style={styles.conteudo}>
            <ThemedText themeColor="textSecondary">Este lançamento não existe mais.</ThemedText>
            <Botao texto="Voltar" onPress={() => router.back()} />
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.conteudo}>
              <View
                style={[
                  styles.selo,
                  { backgroundColor: receita ? theme.positiveSoft : theme.negativeSoft },
                ]}>
                <ThemedText type="smallBold" style={{ color: corValor }}>
                  {receita ? 'Receita' : 'Despesa'}
                </ThemedText>
              </View>

              <View accessible accessibilityLabel={`${transacao.descricao || transacao.categoriaNome}, ${formatarCentavos(transacao.valorCentavos)}`}>
                <ThemedText style={styles.titulo}>
                  {transacao.descricao || transacao.categoriaNome}
                </ThemedText>
                <ThemedText style={[styles.valor, { color: corValor }]}>
                  {receita ? '+' : '−'} {formatarCentavos(transacao.valorCentavos)}
                </ThemedText>
              </View>

              <Cartao>
                <Linha rotulo="Categoria" valor={transacao.categoriaNome} />
                <Linha rotulo="Data" valor={formatarDataPorExtenso(transacao.data)} />
                <Linha rotulo="Descrição" valor={transacao.descricao || 'Sem descrição'} />
                {!receita && (
                  <Linha
                    rotulo="Recorrência"
                    valor={transacao.recorrente ? 'Se repete todo mês' : 'Gasto único'}
                  />
                )}
              </Cartao>

              {impostos && (
                <Cartao>
                  <View
                    style={styles.linha}
                    accessible
                    accessibilityLabel={`Impostos nesta despesa: ${formatarCentavos(impostos.totalCentavos)}, ${impostos.percentual}% do valor, ${impostos.origem === 'nota' ? 'valor da nota fiscal' : 'estimativa'}`}>
                    <ThemedText type="smallBold">Impostos nesta despesa</ThemedText>
                    <ThemedText type="smallBold">{formatarCentavos(impostos.totalCentavos)}</ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {impostos.origem === 'nota'
                      ? `Valor informado na nota fiscal: ${impostos.percentual.toLocaleString('pt-BR')}% do que você pagou.`
                      : `Estimativa de ${impostos.percentual.toLocaleString('pt-BR')}% para ${impostos.perfil.nome.toLocaleLowerCase('pt-BR')}. Para o valor exato, toque em Editar e informe os tributos da nota fiscal.`}
                  </ThemedText>
                  {impostos.porTributo.map(({ tributo, centavos }) => (
                    <Linha key={tributo.id} rotulo={tributo.sigla} valor={formatarCentavos(centavos)} />
                  ))}
                </Cartao>
              )}

              <ItensDaNota nota={nota} chaveNota={transacao.chaveNota} valorPagoCentavos={transacao.valorCentavos} />

              {transacao.recorrente && (
                <View style={[styles.aviso, { backgroundColor: theme.accentSoft }]}>
                  <ThemedText type="smallBold" style={{ color: theme.accentText }}>
                    Despesa recorrente
                  </ThemedText>
                  <ThemedText type="small">
                    Esta conta foi marcada como algo que se repete todo mês, como aluguel ou
                    assinatura. Se não for, toque em Editar e desligue a opção.
                  </ThemedText>
                </View>
              )}
            </ScrollView>

            <View style={styles.rodape}>
              <Botao
                texto="Editar lançamento"
                onPress={() =>
                  router.push({ pathname: '/editar-lancamento/[id]', params: { id: String(transacao.id) } })
                }
              />
              <Botao texto="Excluir lançamento" variante="perigo" onPress={confirmarExclusao} />
            </View>
          </>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={styles.linha} accessible accessibilityLabel={`${rotulo}: ${valor}`}>
      <ThemedText type="small" themeColor="textSecondary">
        {rotulo}
      </ThemedText>
      <ThemedText type="small" style={styles.valorLinha}>
        {valor}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  topo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 44,
  },
  espacoTopo: {
    width: 60,
  },
  conteudo: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  selo: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
  titulo: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: 600,
  },
  valor: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: 700,
  },
  linha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  valorLinha: {
    flexShrink: 1,
    textAlign: 'right',
  },
  aviso: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  rodape: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
