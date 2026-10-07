import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CampoData } from '@/components/calendario';
import { CampoNovaCategoria } from '@/components/campo-nova-categoria';
import { CampoValor } from '@/components/campo-valor';
import { Chip } from '@/components/chip';
import { Botao } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useCategorias } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import { ErroValidacao } from '@/services/erros';
import type { NovaTransacao, TipoTransacao, Transacao } from '@/types/financas';
import { hoje, ontem } from '@/utils/datas';
import { centavosParaTexto, lerValorEmCentavos } from '@/utils/moeda';
import { vibrarErro, vibrarSucesso } from '@/utils/vibracao';

type OpcaoData = 'hoje' | 'ontem' | 'outra';

type Props = {
  titulo: string;
  /** Lançamento existente, para edição. Sem ele, o formulário começa vazio. */
  inicial?: Transacao;
  /** Salva os dados (pode lançar ErroValidacao). Depois de salvar, a tela fecha. */
  aoSalvar: (dados: NovaTransacao) => void;
};

function opcaoDataInicial(data: string): OpcaoData {
  if (data === hoje()) return 'hoje';
  if (data === ontem()) return 'ontem';
  return 'outra';
}

/** Formulário de receita/despesa, usado para criar e para editar lançamentos. */
export function FormularioLancamento({ titulo, inicial, aoSalvar }: Props) {
  const theme = useTheme();
  const [tipo, setTipo] = useState<TipoTransacao>(inicial?.tipo ?? 'despesa');
  const categorias = useCategorias(tipo);
  const [valorTexto, setValorTexto] = useState(
    inicial ? centavosParaTexto(inicial.valorCentavos) : '',
  );
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '');
  const [categoriaId, setCategoriaId] = useState<number | null>(inicial?.categoriaId ?? null);
  const [opcaoData, setOpcaoData] = useState<OpcaoData>(
    inicial ? opcaoDataInicial(inicial.data) : 'hoje',
  );
  const [outraData, setOutraData] = useState<string | null>(
    inicial && opcaoDataInicial(inicial.data) === 'outra' ? inicial.data : null,
  );
  const [recorrente, setRecorrente] = useState(inicial?.recorrente ?? false);
  const [criandoCategoria, setCriandoCategoria] = useState(false);

  const valorCentavos = lerValorEmCentavos(valorTexto);
  const categoria = categorias.find((c) => c.id === categoriaId) ?? null;
  const data = opcaoData === 'hoje' ? hoje() : opcaoData === 'ontem' ? ontem() : outraData;
  const dataNoFuturo = data !== null && data > hoje();
  const podeSalvar = valorCentavos !== null && categoria !== null && data !== null && !dataNoFuturo;

  let avisoData: string | null = null;
  if (dataNoFuturo) avisoData = 'A data não pode ser no futuro.';

  function trocarTipo(novo: TipoTransacao) {
    setTipo(novo);
    setCategoriaId(null);
    setCriandoCategoria(false);
  }

  function salvar() {
    if (!podeSalvar || valorCentavos === null || !categoria || !data) return;
    try {
      aoSalvar({
        tipo,
        valorCentavos,
        descricao,
        categoriaId: categoria.id,
        data,
        recorrente: tipo === 'despesa' && recorrente,
      });
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

  const estiloCampo = [styles.campo, { color: theme.text, backgroundColor: theme.backgroundElement }];

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
            <ThemedText type="smallBold" accessibilityRole="header">
              {titulo}
            </ThemedText>
            <View style={styles.espacoTopo} />
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.conteudo}
            keyboardShouldPersistTaps="handled">
            <View style={styles.linha} accessibilityRole="radiogroup">
              <Botao
                texto="Despesa"
                variante="secundario"
                selecionado={tipo === 'despesa'}
                onPress={() => trocarTipo('despesa')}
                style={styles.flex}
              />
              <Botao
                texto="Receita"
                variante="secundario"
                selecionado={tipo === 'receita'}
                onPress={() => trocarTipo('receita')}
                style={styles.flex}
              />
            </View>

            <CampoValor
              valor={valorTexto}
              aoMudar={setValorTexto}
              rotulo={tipo === 'despesa' ? 'Valor da despesa em reais' : 'Valor da receita em reais'}
              autoFocus={!inicial}
            />

            <Secao titulo="Descrição">
              <TextInput
                style={estiloCampo}
                value={descricao}
                onChangeText={setDescricao}
                placeholder={tipo === 'despesa' ? 'Ex.: Almoço' : 'Ex.: Salário de outubro'}
                placeholderTextColor={theme.textSecondary}
                accessibilityLabel="Descrição (opcional)"
                maxLength={120}
                returnKeyType="done"
              />
            </Secao>

            <Secao titulo="Categoria">
              <View style={styles.chips} accessibilityRole="radiogroup">
                {categorias.map((c) => {
                  const ativa = c.id === categoria?.id;
                  return (
                    <Chip key={c.id} texto={c.nome} ativo={ativa} aoTocar={() => setCategoriaId(c.id)} />
                  );
                })}
                {!criandoCategoria && (
                  <Chip texto="+ Nova categoria" ativo={false} aoTocar={() => setCriandoCategoria(true)} />
                )}
              </View>
              {criandoCategoria && (
                <CampoNovaCategoria
                  tipo={tipo}
                  aoCriar={(id) => {
                    setCategoriaId(id);
                    setCriandoCategoria(false);
                  }}
                  aoCancelar={() => setCriandoCategoria(false)}
                />
              )}
            </Secao>

            <Secao titulo="Data">
              <View style={styles.chips} accessibilityRole="radiogroup">
                <Chip texto="Hoje" ativo={opcaoData === 'hoje'} aoTocar={() => setOpcaoData('hoje')} />
                <Chip texto="Ontem" ativo={opcaoData === 'ontem'} aoTocar={() => setOpcaoData('ontem')} />
                <Chip
                  texto="Outra data"
                  ativo={opcaoData === 'outra'}
                  aoTocar={() => setOpcaoData('outra')}
                />
              </View>
              {opcaoData === 'outra' && (
                <CampoData
                  rotulo="Data do lançamento"
                  valor={outraData}
                  aoMudar={setOutraData}
                  max={hoje()}
                  abrirAoAparecer={outraData === null}
                />
              )}
              {avisoData && (
                <ThemedText type="small" style={{ color: theme.negative }} accessibilityLiveRegion="polite">
                  {avisoData}
                </ThemedText>
              )}
            </Secao>

            {tipo === 'despesa' && (
              <View style={[styles.recorrente, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.flex}>
                  <ThemedText type="smallBold">Despesa recorrente</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Para contas que se repetem todo mês, como aluguel e assinaturas.
                  </ThemedText>
                </View>
                <Switch
                  value={recorrente}
                  onValueChange={setRecorrente}
                  trackColor={{ true: theme.accent }}
                  accessibilityLabel="Despesa recorrente"
                />
              </View>
            )}
          </ScrollView>

          <View style={styles.rodape}>
            {!categoria && valorCentavos !== null && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.dica}>
                Escolha uma categoria para salvar.
              </ThemedText>
            )}
            <Botao
              texto={inicial ? 'Salvar alterações' : 'Salvar'}
              disabled={!podeSalvar}
              onPress={salvar}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={styles.secao}>
      <ThemedText type="smallBold">{titulo}</ThemedText>
      {children}
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
  },
  espacoTopo: {
    width: 60,
  },
  conteudo: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  linha: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  secao: {
    gap: Spacing.two,
  },
  campo: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  recorrente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  rodape: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  dica: {
    textAlign: 'center',
  },
});
