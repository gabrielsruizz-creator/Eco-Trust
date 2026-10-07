import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnelProgresso } from '@/components/anel-progresso';
import { Botao, Cartao } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useMeta } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import { excluirMeta, textoRitmo } from '@/services/metas-service';
import type { TipoMovimentoMeta } from '@/types/financas';
import { formatarData, nomeDoMes } from '@/utils/datas';
import { formatarCentavos } from '@/utils/moeda';

const ROTULO_MOVIMENTO: Record<TipoMovimentoMeta, string> = {
  inicial: 'Valor inicial',
  deposito: 'Guardado',
  retirada: 'Retirado',
};

function abrirMovimento(id: number, tipo: 'guardar' | 'retirar') {
  router.push({ pathname: '/movimentar-meta/[id]', params: { id: String(id), tipo } });
}

export default function DetalheMetaScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dados = useMeta(Number(id));

  function confirmarExclusao() {
    if (!dados) return;
    Alert.alert(
      'Excluir meta',
      `Excluir "${dados.meta.nome}" e todo o histórico dela? Isso não pode ser desfeito.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            excluirMeta(dados.meta.id);
            router.back();
          },
        },
      ],
    );
  }

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
            Meta
          </ThemedText>
          <View style={styles.espacoTopo} />
        </View>

        {!dados ? (
          <View style={styles.conteudo}>
            <ThemedText themeColor="textSecondary">Esta meta não existe mais.</ThemedText>
            <Botao texto="Voltar" onPress={() => router.back()} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.conteudo}>
            {(() => {
              const { meta, movimentos } = dados;
              const cor = meta.concluida ? theme.positive : theme.accent;
              const ritmo = textoRitmo(meta);
              return (
                <>
                  <View style={styles.cabecalho}>
                    <AnelProgresso percentual={meta.percentual} cor={cor} />
                    <ThemedText style={styles.nome} accessibilityRole="header">
                      {meta.nome}
                    </ThemedText>
                    <ThemedText style={styles.valor}>{formatarCentavos(meta.atualCentavos)}</ThemedText>
                    <ThemedText themeColor="textSecondary">
                      de {formatarCentavos(meta.objetivoCentavos)}
                    </ThemedText>
                    {meta.concluida && (
                      <ThemedText type="smallBold" style={{ color: theme.positive }}>
                        Meta alcançada! Parabéns.
                      </ThemedText>
                    )}
                  </View>

                  <Cartao>
                    {!meta.concluida && <Linha rotulo="Falta" valor={formatarCentavos(meta.faltaCentavos)} />}
                    <Linha
                      rotulo="Prazo"
                      valor={
                        meta.prazo
                          ? `${formatarData(meta.prazo)}${meta.prazoVencido ? ' (passou)' : ''}`
                          : 'Sem prazo'
                      }
                    />
                    {meta.porMesNecessarioCentavos !== null && meta.prazo && (
                      <Linha
                        rotulo={`Guardar por mês até ${nomeDoMes(meta.prazo.slice(0, 7))}`}
                        valor={formatarCentavos(meta.porMesNecessarioCentavos)}
                      />
                    )}
                    {meta.ritmoMensalCentavos !== null && (
                      <Linha
                        rotulo="Seu ritmo recente"
                        valor={`${formatarCentavos(meta.ritmoMensalCentavos)}/mês`}
                      />
                    )}
                  </Cartao>

                  {ritmo && (
                    <View style={[styles.aviso, { backgroundColor: theme.accentSoft }]}>
                      <ThemedText type="small">{ritmo}</ThemedText>
                    </View>
                  )}

                  <View style={styles.botoes}>
                    <Botao texto="Guardar dinheiro" onPress={() => abrirMovimento(meta.id, 'guardar')} />
                    {meta.atualCentavos > 0 && (
                      <Botao
                        texto="Retirar"
                        variante="secundario"
                        onPress={() => abrirMovimento(meta.id, 'retirar')}
                      />
                    )}
                    <Botao
                      texto="Editar meta"
                      variante="secundario"
                      onPress={() =>
                        router.push({ pathname: '/editar-meta/[id]', params: { id: String(meta.id) } })
                      }
                    />
                  </View>

                  <ThemedText type="smallBold" accessibilityRole="header">
                    Histórico
                  </ThemedText>
                  {movimentos.length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      Nenhum valor guardado ainda. Toque em &quot;Guardar dinheiro&quot; para começar.
                    </ThemedText>
                  ) : (
                    <Cartao>
                      {movimentos.map((m) => {
                        const sinal = m.tipo === 'retirada' ? '−' : '+';
                        return (
                          <View
                            key={m.id}
                            style={styles.linha}
                            accessible
                            accessibilityLabel={`${ROTULO_MOVIMENTO[m.tipo]} em ${formatarData(m.data)}: ${formatarCentavos(m.valorCentavos)}`}>
                            <View>
                              <ThemedText type="small">{ROTULO_MOVIMENTO[m.tipo]}</ThemedText>
                              <ThemedText type="small" themeColor="textSecondary">
                                {formatarData(m.data)}
                              </ThemedText>
                            </View>
                            <ThemedText
                              type="smallBold"
                              style={{ color: m.tipo === 'retirada' ? theme.negative : theme.positive }}>
                              {sinal} {formatarCentavos(m.valorCentavos)}
                            </ThemedText>
                          </View>
                        );
                      })}
                    </Cartao>
                  )}

                  <Botao texto="Excluir meta" variante="perigo" onPress={confirmarExclusao} />
                </>
              );
            })()}
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={styles.linha} accessible accessibilityLabel={`${rotulo}: ${valor}`}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.rotulo}>
        {rotulo}
      </ThemedText>
      <ThemedText type="smallBold">{valor}</ThemedText>
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
  cabecalho: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  nome: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: 600,
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  valor: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: 700,
  },
  linha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  rotulo: {
    flexShrink: 1,
  },
  aviso: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  botoes: {
    gap: Spacing.two,
  },
});
