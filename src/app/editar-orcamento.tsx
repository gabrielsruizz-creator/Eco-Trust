import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CampoValor } from '@/components/campo-valor';
import { Chip } from '@/components/chip';
import { Botao } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useCategorias, useDashboard, useOrcamentos } from '@/hooks/use-dados';
import { ErroValidacao } from '@/services/erros';
import {
  definirOrcamento,
  excluirOrcamento,
  obterLimite,
  sugerirLimiteCategoria,
} from '@/services/orcamento-service';
import { mesAtual } from '@/utils/datas';
import { centavosParaTexto, formatarCentavos, lerValorEmCentavos } from '@/utils/moeda';
import { vibrarErro, vibrarSucesso } from '@/utils/vibracao';

/**
 * Parâmetro "categoria": "geral" (orçamento do mês), o id de uma categoria (editar),
 * ou ausente (novo orçamento por categoria: o usuário escolhe a categoria).
 */
export default function EditarOrcamentoScreen() {
  const { categoria: parametro } = useLocalSearchParams<{ categoria?: string }>();
  const geral = parametro === 'geral';
  const idFixo = parametro && !geral ? Number(parametro) : null;
  const mes = mesAtual();

  const categoriasDespesa = useCategorias('despesa');
  const orcamentos = useOrcamentos(mes);
  const dashboard = useDashboard(mes);
  const [categoriaEscolhida, setCategoriaEscolhida] = useState<number | null>(null);
  const categoriaId = geral ? null : (idFixo ?? categoriaEscolhida);

  const limiteAtual = useMemo(
    () => (geral || idFixo !== null ? obterLimite(geral ? null : idFixo) : null),
    [geral, idFixo],
  );
  const [valorTexto, setValorTexto] = useState(limiteAtual ? centavosParaTexto(limiteAtual) : '');
  const valor = lerValorEmCentavos(valorTexto);

  const nomeCategoria = categoriasDespesa.find((c) => c.id === categoriaId)?.nome;
  const comOrcamento = new Set(orcamentos.categorias.map((c) => c.categoriaId));
  const disponiveis = categoriasDespesa.filter((c) => !comOrcamento.has(c.id));
  const gastoNoMes = geral
    ? dashboard.despesasCentavos
    : categoriaId !== null
      ? (dashboard.categorias.find((c) => c.categoriaId === categoriaId)?.totalCentavos ?? 0)
      : null;

  const sugestao = useMemo(() => {
    if (geral) {
      return orcamentos.sugestaoGeralCentavos
        ? { valor: orcamentos.sugestaoGeralCentavos, texto: 'Sua renda menos a meta de economia' }
        : null;
    }
    if (categoriaId === null) return null;
    const media = sugerirLimiteCategoria(categoriaId, mes);
    return media ? { valor: media, texto: 'Média dos seus gastos nos últimos 3 meses' } : null;
  }, [geral, categoriaId, mes, orcamentos.sugestaoGeralCentavos]);

  const titulo = geral
    ? 'Orçamento mensal'
    : idFixo !== null
      ? `Orçamento de ${nomeCategoria ?? 'categoria'}`
      : 'Novo orçamento';
  const podeSalvar = valor !== null && (geral || categoriaId !== null);

  function salvar() {
    if (!podeSalvar || valor === null) return;
    try {
      definirOrcamento(categoriaId, valor);
      vibrarSucesso();
      router.back();
    } catch (erro) {
      vibrarErro();
      Alert.alert(
        'Não foi possível salvar',
        erro instanceof ErroValidacao ? erro.message : 'Tente novamente.',
      );
    }
  }

  function confirmarRemocao() {
    Alert.alert('Remover orçamento', 'O limite deixa de existir, mas seus lançamentos continuam.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          excluirOrcamento(categoriaId);
          router.back();
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.topo}>
            <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Cancelar
              </ThemedText>
            </Pressable>
            <ThemedText type="smallBold" accessibilityRole="header" numberOfLines={1} style={styles.titulo}>
              {titulo}
            </ThemedText>
            <View style={styles.espacoTopo} />
          </View>

          <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
            {!geral && idFixo === null && (
              <View style={styles.secao}>
                <ThemedText type="smallBold">Categoria</ThemedText>
                {disponiveis.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Todas as categorias de despesa já têm orçamento.
                  </ThemedText>
                ) : (
                  <View style={styles.chips} accessibilityRole="radiogroup">
                    {disponiveis.map((c) => (
                      <Chip
                        key={c.id}
                        texto={c.nome}
                        ativo={c.id === categoriaEscolhida}
                        aoTocar={() => setCategoriaEscolhida(c.id)}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={styles.secao}>
              <ThemedText type="smallBold">
                {geral ? 'Quanto você quer gastar por mês, no total?' : 'Limite por mês'}
              </ThemedText>
              <CampoValor
                valor={valorTexto}
                aoMudar={setValorTexto}
                rotulo={geral ? 'Limite do orçamento mensal em reais' : 'Limite da categoria em reais'}
                autoFocus={limiteAtual === null && (geral || idFixo !== null)}
              />
              {gastoNoMes !== null && (
                <ThemedText type="small" themeColor="textSecondary">
                  Gasto neste mês até agora: {formatarCentavos(gastoNoMes)}
                </ThemedText>
              )}
            </View>

            {sugestao && (
              <View style={styles.secao}>
                <ThemedText type="small" themeColor="textSecondary">
                  {sugestao.texto}:
                </ThemedText>
                <View style={styles.chips}>
                  <Chip
                    texto={`Usar ${formatarCentavos(sugestao.valor)}`}
                    ativo={valor === sugestao.valor}
                    aoTocar={() => setValorTexto(centavosParaTexto(sugestao.valor))}
                  />
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.rodape}>
            <Botao texto="Salvar" disabled={!podeSalvar} onPress={salvar} />
            {limiteAtual !== null && (
              <Botao texto="Remover orçamento" variante="perigo" onPress={confirmarRemocao} />
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
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
  flex: {
    flex: 1,
  },
  topo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 44,
    gap: Spacing.two,
  },
  titulo: {
    flexShrink: 1,
    textAlign: 'center',
  },
  espacoTopo: {
    width: 60,
  },
  conteudo: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  secao: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  rodape: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
