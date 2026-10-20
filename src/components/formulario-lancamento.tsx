import { router } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
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
import { cargaTotal, perfilTributario } from '@/data/carga-tributaria';
import { useCategorias } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import { perfilTributarioDaCategoria } from '@/services/categorias-service';
import { ErroValidacao } from '@/services/erros';
import type { NovaTransacao, TipoTransacao, Transacao } from '@/types/financas';
import { hoje, ontem } from '@/utils/datas';
import { centavosParaTexto, formatarCentavos, lerValorEmCentavos } from '@/utils/moeda';
import { vibrarErro, vibrarSucesso } from '@/utils/vibracao';

type OpcaoData = 'hoje' | 'ontem' | 'outra';

/** Dados que chegam já preenchidos (ex.: lidos do QR Code da nota fiscal). O usuário confere e salva. */
export type SugestaoLancamento = Partial<
  Pick<Transacao, 'valorCentavos' | 'tributosCentavos' | 'data' | 'descricao' | 'categoriaId' | 'chaveNota'>
> & {
  /** Página da nota na SEFAZ (.gov.br), para conferir */
  urlNota?: string | null;
  /** Ex.: "NFC-e nº 12345 · SP" */
  resumoNota?: string;
};

type Props = {
  titulo: string;
  /** Lançamento existente, para edição. Sem ele, o formulário começa vazio. */
  inicial?: Transacao;
  /** Salva os dados (pode lançar ErroValidacao). Depois de salvar, a tela fecha. */
  aoSalvar: (dados: NovaTransacao) => void;
  /** Tipo já escolhido ao abrir um novo lançamento (atalhos Receita/Despesa) */
  tipoInicial?: TipoTransacao;
  /** Novo lançamento com dados pré-preenchidos (sempre despesa) */
  sugestao?: SugestaoLancamento;
};

function opcaoDataInicial(data: string): OpcaoData {
  if (data === hoje()) return 'hoje';
  if (data === ontem()) return 'ontem';
  return 'outra';
}

/** Formulário de receita/despesa, usado para criar e para editar lançamentos. */
export function FormularioLancamento({ titulo, inicial, aoSalvar, tipoInicial = 'despesa', sugestao }: Props) {
  const theme = useTheme();
  const base = inicial ?? sugestao;
  const [tipo, setTipo] = useState<TipoTransacao>(inicial?.tipo ?? (sugestao ? 'despesa' : tipoInicial));
  const categorias = useCategorias(tipo);
  const [valorTexto, setValorTexto] = useState(base?.valorCentavos ? centavosParaTexto(base.valorCentavos) : '');
  const [descricao, setDescricao] = useState(base?.descricao ?? '');
  const [categoriaId, setCategoriaId] = useState<number | null>(base?.categoriaId ?? null);
  const [opcaoData, setOpcaoData] = useState<OpcaoData>(base?.data ? opcaoDataInicial(base.data) : 'hoje');
  const [outraData, setOutraData] = useState<string | null>(
    base?.data && opcaoDataInicial(base.data) === 'outra' ? base.data : null,
  );
  const [recorrente, setRecorrente] = useState(inicial?.recorrente ?? false);
  const [tributosTexto, setTributosTexto] = useState(
    base?.tributosCentavos != null ? centavosParaTexto(base.tributosCentavos) : '',
  );
  const chaveNota = inicial?.chaveNota ?? sugestao?.chaveNota ?? null;
  const [criandoCategoria, setCriandoCategoria] = useState(false);

  const valorCentavos = lerValorEmCentavos(valorTexto);
  const categoria = categorias.find((c) => c.id === categoriaId) ?? null;
  const data = opcaoData === 'hoje' ? hoje() : opcaoData === 'ontem' ? ontem() : outraData;
  const dataNoFuturo = data !== null && data > hoje();

  // Impostos: o valor da nota fiscal (opcional) ou a estimativa pelo tipo de consumo da categoria.
  const informouTributos = tipo === 'despesa' && tributosTexto.trim() !== '';
  const tributosCentavos = informouTributos ? lerValorEmCentavos(tributosTexto, true) : null;
  let avisoTributos: string | null = null;
  if (informouTributos && tributosCentavos === null) avisoTributos = 'Valor dos tributos inválido.';
  else if (tributosCentavos !== null && valorCentavos !== null && tributosCentavos >= valorCentavos) {
    avisoTributos = 'Os tributos precisam ser menores que o valor da compra.';
  }
  const perfil = categoria ? perfilTributario(perfilTributarioDaCategoria(categoria)) : null;
  const cargaEstimada = perfil ? cargaTotal(perfil) : null;
  let dicaTributos = 'Procure "Valor aprox. dos tributos" no fim do cupom fiscal. ';
  if (informouTributos) dicaTributos = 'O seu Impostômetro vai usar o valor da nota.';
  else if (!perfil || cargaEstimada === null) dicaTributos += 'Sem ele, o EcoTrust estima pelo tipo da categoria.';
  else if (cargaEstimada === 0) dicaTributos += 'Esta categoria está marcada como sem imposto sobre consumo.';
  else {
    const estimativa = valorCentavos !== null ? `: ${formatarCentavos(Math.round((valorCentavos * cargaEstimada) / 100))}` : '';
    dicaTributos += `Sem ele, estimamos cerca de ${cargaEstimada}% (${perfil.nome.toLocaleLowerCase('pt-BR')})${estimativa}.`;
  }

  const podeSalvar =
    valorCentavos !== null && categoria !== null && data !== null && !dataNoFuturo && avisoTributos === null;

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
        tributosCentavos: tipo === 'despesa' ? tributosCentavos : null,
        chaveNota: tipo === 'despesa' ? chaveNota : null,
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
            {sugestao?.chaveNota && (
              <View style={[styles.aviso, { backgroundColor: theme.accentSoft }]}>
                <ThemedText type="smallBold" style={{ color: theme.accentText }}>
                  Dados lidos da nota fiscal
                </ThemedText>
                <ThemedText type="small">
                  {sugestao.resumoNota ? `${sugestao.resumoNota}. ` : ''}Confira o valor, a categoria e os
                  tributos antes de salvar.
                </ThemedText>
                {sugestao.urlNota && (
                  <Pressable
                    onPress={() => openBrowserAsync(sugestao.urlNota!)}
                    accessibilityRole="link"
                    hitSlop={8}>
                    <ThemedText type="smallBold" style={{ color: theme.accentText }}>
                      Ver a nota no site da SEFAZ
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            )}

            {!inicial && !sugestao && tipo === 'despesa' && (
              <Botao
                texto="Ler QR Code da nota fiscal"
                variante="secundario"
                icone="qrcode"
                onPress={() => router.replace('/ler-nota')}
              />
            )}

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
              autoFocus={!base}
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
              <Secao titulo="Impostos da nota fiscal (opcional)">
                <TextInput
                  style={estiloCampo}
                  value={tributosTexto}
                  onChangeText={setTributosTexto}
                  placeholder="Ex.: 18,35"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Valor aproximado dos tributos na nota fiscal, em reais (opcional)"
                  returnKeyType="done"
                />
                <ThemedText type="small" themeColor="textSecondary">
                  {dicaTributos}
                </ThemedText>
                {avisoTributos && (
                  <ThemedText type="small" style={{ color: theme.negative }} accessibilityLiveRegion="polite">
                    {avisoTributos}
                  </ThemedText>
                )}
              </Secao>
            )}

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
  aviso: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  rodape: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  dica: {
    textAlign: 'center',
  },
});
