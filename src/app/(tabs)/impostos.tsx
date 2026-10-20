import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BarraProgresso } from '@/components/barra-progresso';
import { Icone } from '@/components/icone';
import { Botao, Cartao, IconeCirculo, LinhaLista, Tela, useDegrade } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { SeriesColors, Spacing } from '@/constants/theme';
import { TRIBUTOS } from '@/data/carga-tributaria';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useImpostometro } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import { formatarDataCurta, mesAtual, nomeDoMes, nomeDoMesTitulo, somarMeses } from '@/utils/datas';
import { formatarCentavos } from '@/utils/moeda';
import { visualCategoria } from '@/utils/visual';

/** Formata "12.5" como "12,5". */
function numero(n: number) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

/** Aba Impostos: o Impostômetro pessoal (quanto do que você gastou no mês foi imposto). */
export default function ImpostosScreen() {
  const theme = useTheme();
  const degrade = useDegrade(135);
  const esquema = useColorScheme() === 'light' ? 'light' : 'dark';
  const [mes, setMes] = useState(mesAtual());
  const imp = useImpostometro(mes);
  const nomeMes = nomeDoMes(mes).split(' ')[0];
  const ehMesAtual = mes >= mesAtual();
  const corTributo = (id: string) => SeriesColors[esquema][TRIBUTOS.findIndex((t) => t.id === id) % 8];

  return (
    <Tela
      titulo="Impostômetro"
      subtitulo="Quanto do seu dinheiro vai para o governo"
      acoes={[
        { icone: 'ajustes', rotulo: 'Ajustar tipos de consumo', aoTocar: () => router.push('/ajustar-impostos') },
        { icone: 'qrcode', rotulo: 'Ler QR Code da nota fiscal', aoTocar: () => router.push('/ler-nota') },
      ]}>
      {/* Mês */}
      <View style={styles.seletorMes}>
        <BotaoSeta icone="voltar" rotulo="Mês anterior" aoTocar={() => setMes(somarMeses(mes, -1))} />
        <ThemedText type="smallBold" style={styles.nomeMes} accessibilityLiveRegion="polite">
          {nomeDoMesTitulo(mes)}
        </ThemedText>
        <BotaoSeta
          icone="avancar"
          rotulo="Próximo mês"
          desativado={ehMesAtual}
          aoTocar={() => setMes(somarMeses(mes, 1))}
        />
      </View>

      {/* Total do mês */}
      <View
        style={[styles.destaque, degrade, { boxShadow: `0 12px 32px ${theme.brilho}` }]}
        accessible
        accessibilityLabel={`Impostos pagos em ${nomeMes}: ${formatarCentavos(imp.cargaTotalCentavos)}${imp.fixos ? `, sendo ${formatarCentavos(imp.impostosCentavos)} no consumo` : ''}${imp.percentualDosGastos !== null ? `. ${numero(imp.percentualDosGastos)}% do que você gastou foi imposto` : ''}.`}>
        <View style={styles.decoracao} />
        <View style={styles.linha}>
          <Icone nome="impostos" cor="#FFFFFF" tamanho={18} />
          <ThemedText type="small" style={styles.textoClaro}>
            Impostos que você pagou em {nomeMes}
          </ThemedText>
        </View>
        <ThemedText style={styles.valorDestaque} numberOfLines={1} adjustsFontSizeToFit>
          {formatarCentavos(imp.cargaTotalCentavos)}
        </ThemedText>
        <ThemedText type="small" style={styles.textoClaro}>
          {imp.percentualDosGastos !== null
            ? `${numero(imp.percentualDosGastos)}% dos ${formatarCentavos(imp.gastosCentavos)} que você gastou foram para o governo.`
            : 'Nenhuma despesa registrada neste mês.'}
          {imp.fixos ? ` Mais ${formatarCentavos(imp.fixos.totalCentavos)} da renda e do patrimônio.` : ''}
        </ThemedText>
        {imp.variacao !== null && (
          <View style={styles.pilula}>
            <Icone nome={imp.variacao >= 0 ? 'subindo' : 'descendo'} cor="#FFFFFF" tamanho={14} />
            <ThemedText type="smallBold" style={styles.textoBranco}>
              {imp.variacao >= 0 ? '+' : ''}
              {imp.variacao}% que no mês anterior
            </ThemedText>
          </View>
        )}
      </View>

      {imp.despesas === 0 && (
        <Cartao>
          <ThemedText type="small">
            Registre suas despesas e o EcoTrust mostra quanto delas foi imposto: ICMS, PIS/Cofins, IPI,
            ISS e os tributos que as empresas embutem no preço.
          </ThemedText>
          {ehMesAtual && (
            <Botao
              texto="Registrar despesa"
              icone="mais"
              onPress={() => router.push({ pathname: '/novo-lancamento', params: { tipo: 'despesa' } })}
            />
          )}
        </Cartao>
      )}

      {/* Carga total: consumo + renda + patrimônio */}
      <Cartao>
        <ThemedText type="smallBold">Sua carga total</ThemedText>
        <LinhaCarga rotulo="No consumo (embutido nas compras)" valor={imp.impostosCentavos} />
        {imp.fixos ? (
          <>
            <LinhaCarga
              rotulo={imp.fixos.descontadosNaFonte ? 'Na renda (INSS e IR do holerite)' : 'Na renda (INSS e IR)'}
              valor={imp.fixos.inssCentavos + imp.fixos.irCentavos}
            />
            <LinhaCarga rotulo="No patrimônio (IPVA e IPTU, por mês)" valor={imp.fixos.ipvaCentavos + imp.fixos.iptuCentavos} />
            <LinhaCarga rotulo="Outros (ex.: DAS do MEI)" valor={imp.fixos.outrosCentavos} />
            <Botao
              texto="Editar impostos da renda"
              variante="secundario"
              icone="editar"
              onPress={() => router.push('/impostos-renda')}
            />
          </>
        ) : (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Você também paga INSS e Imposto de Renda sobre o salário, e IPVA e IPTU sobre o que tem.
              Inclua esses valores para ver quanto realmente vai para o governo.
            </ThemedText>
            <Botao texto="Incluir impostos da renda" icone="mais" onPress={() => router.push('/impostos-renda')} />
          </>
        )}
      </Cartao>

      {imp.cargaTotalCentavos > 0 && (
        <>
          {/* Dias de trabalho */}
          <Cartao>
            <View style={styles.linha}>
              <IconeCirculo icone="relogio" cor={theme.brand} tamanho={36} />
              <ThemedText type="smallBold" style={styles.flex}>
                Dias trabalhados para o governo
              </ThemedText>
            </View>
            {imp.diasTrabalhados !== null && imp.percentualDaRenda !== null ? (
              <>
                <ThemedText style={styles.valorGrande}>
                  {numero(imp.diasTrabalhados)} {imp.diasTrabalhados === 1 ? 'dia' : 'dias'}
                  <ThemedText type="small" themeColor="textSecondary">
                    {' '}
                    de {imp.diasNoMes}
                  </ThemedText>
                </ThemedText>
                <BarraProgresso
                  percentual={(imp.diasTrabalhados / imp.diasNoMes) * 100}
                  rotuloAcessivel={`${numero(imp.diasTrabalhados)} de ${imp.diasNoMes} dias`}
                />
                <ThemedText type="small" themeColor="textSecondary">
                  Esses impostos equivalem a {numero(imp.percentualDaRenda)}% da sua{' '}
                  {imp.origemRenda === 'receitas' ? 'renda do mês' : 'renda informada no perfil'}
                  {imp.fixos?.descontadosNaFonte ? ' antes dos descontos' : ''} (
                  {formatarCentavos(imp.rendaCentavos ?? 0)}).
                </ThemedText>
              </>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Registre suas receitas do mês para ver quantos dias de trabalho foram só para pagar
                impostos.
              </ThemedText>
            )}
          </Cartao>

          {/* Para quem foi */}
          <ThemedText type="smallBold" accessibilityRole="header">
            Para quem foi o dinheiro
          </ThemedText>
          <Cartao>
            {imp.porEsfera.map((e, i) => {
              const cor = SeriesColors[esquema][i];
              return (
                <View
                  key={e.esfera}
                  style={styles.barraLinha}
                  accessible
                  accessibilityLabel={`${e.nome}: ${formatarCentavos(e.centavos)}, ${numero(e.percentual)}%`}>
                  <View style={styles.linha}>
                    <ThemedText type="small" style={styles.flex}>
                      {e.nome}
                    </ThemedText>
                    <ThemedText type="smallBold">{formatarCentavos(e.centavos)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.percentual}>
                      {numero(e.percentual)}%
                    </ThemedText>
                  </View>
                  <BarraProgresso percentual={e.percentual} cor={cor} altura={6} />
                </View>
              );
            })}
          </Cartao>

        </>
      )}

      {imp.despesas > 0 && (
        <>
          {/* Por imposto */}
          <ThemedText type="smallBold" accessibilityRole="header">
            Por imposto
          </ThemedText>
          <Cartao>
            {imp.porTributo.map(({ tributo, centavos, percentual }, i) => (
              <View
                key={tributo.id}
                style={[styles.tributo, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}
                accessible
                accessibilityLabel={`${tributo.sigla}: ${formatarCentavos(centavos)}, ${numero(percentual)}% dos impostos. ${tributo.descricao}`}>
                <View style={[styles.marcador, { backgroundColor: corTributo(tributo.id) }]} />
                <View style={styles.flex}>
                  <View style={styles.linha}>
                    <ThemedText type="smallBold" style={styles.flex}>
                      {tributo.sigla}
                    </ThemedText>
                    <ThemedText type="smallBold">{formatarCentavos(centavos)}</ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {tributo.descricao}
                  </ThemedText>
                </View>
              </View>
            ))}
          </Cartao>

          {/* Por categoria */}
          <View style={styles.linha}>
            <ThemedText type="smallBold" accessibilityRole="header" style={styles.flex}>
              Por categoria
            </ThemedText>
            <Pressable onPress={() => router.push('/ajustar-impostos')} accessibilityRole="link" hitSlop={12}>
              <ThemedText type="smallBold" style={{ color: theme.accentText }}>
                Ajustar
              </ThemedText>
            </Pressable>
          </View>
          <Cartao>
            {imp.porCategoria.map((c) => {
              const visual = visualCategoria(c.categoria, c.categoriaId);
              const cor = SeriesColors[esquema][visual.cor];
              return (
                <View
                  key={c.categoriaId}
                  style={styles.categoria}
                  accessible
                  accessibilityLabel={`${c.categoria}: ${formatarCentavos(c.impostosCentavos)} de impostos em ${formatarCentavos(c.gastoCentavos)} gastos, ${numero(c.carga)}%`}>
                  <IconeCirculo icone={visual.icone} cor={cor} tamanho={36} />
                  <View style={styles.flex}>
                    <ThemedText type="small" numberOfLines={1}>
                      {c.categoria}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {numero(c.carga)}% de {formatarCentavos(c.gastoCentavos)}
                    </ThemedText>
                  </View>
                  <ThemedText type="smallBold">{formatarCentavos(c.impostosCentavos)}</ThemedText>
                </View>
              );
            })}
          </Cartao>

          {/* Maiores */}
          {imp.maioresLancamentos.length > 0 && (
            <>
              <ThemedText type="smallBold" accessibilityRole="header">
                Despesas que mais pagaram imposto
              </ThemedText>
              <Cartao style={styles.cartaoLista}>
                {imp.maioresLancamentos.map(({ transacao: t, impostosCentavos, origem }, i) => (
                  <LinhaLista
                    key={t.id}
                    titulo={t.descricao || t.categoriaNome}
                    subtitulo={`${formatarDataCurta(t.data)} · ${formatarCentavos(t.valorCentavos)} · ${origem === 'nota' ? 'valor da nota' : 'estimado'}`}
                    direita={<ThemedText type="smallBold">{formatarCentavos(impostosCentavos)}</ThemedText>}
                    aoTocar={() => router.push({ pathname: '/lancamento/[id]', params: { id: String(t.id) } })}
                    rotuloAcessivel={`${t.descricao || t.categoriaNome}: ${formatarCentavos(impostosCentavos)} de impostos em ${formatarCentavos(t.valorCentavos)}`}
                    separador={i > 0}
                  />
                ))}
              </Cartao>
            </>
          )}
        </>
      )}

      {/* Ano */}
      <Cartao style={styles.linhaCartao}>
        <IconeCirculo icone="calendario" cor={theme.brand} tamanho={36} />
        <View style={styles.flex}>
          <ThemedText type="small" themeColor="textSecondary">
            Em {mes.slice(0, 4)}, até {nomeMes}
          </ThemedText>
          <ThemedText type="smallBold">
            {formatarCentavos(imp.acumuladoAnoCentavos)} em impostos{imp.fixos ? '' : ' sobre consumo'}
          </ThemedText>
        </View>
      </Cartao>

      {/* Como calculamos */}
      <Cartao>
        <ThemedText type="smallBold">Como o EcoTrust calcula</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {imp.despesas > 0
            ? `${imp.despesasComNota} de ${imp.despesas} ${imp.despesas === 1 ? 'despesa usa' : 'despesas usam'} o valor da nota fiscal. `
            : ''}
          Quando você não informa o “Valor aprox. dos tributos” da nota, estimamos pela carga média do
          tipo de consumo de cada categoria. O valor real varia conforme o produto e o estado.
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Reforma tributária: a partir de 2027 o PIS/Cofins vira CBS e, até 2033, ICMS e ISS viram
          IBS. O Impostômetro vai acompanhar essas mudanças.
        </ThemedText>
        <Botao
          texto="Ajustar tipos de consumo"
          variante="secundario"
          icone="ajustes"
          onPress={() => router.push('/ajustar-impostos')}
        />
      </Cartao>
    </Tela>
  );
}

function LinhaCarga({ rotulo, valor }: { rotulo: string; valor: number }) {
  if (valor === 0) return null;
  return (
    <View style={styles.linha} accessible accessibilityLabel={`${rotulo}: ${formatarCentavos(valor)}`}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
        {rotulo}
      </ThemedText>
      <ThemedText type="smallBold">{formatarCentavos(valor)}</ThemedText>
    </View>
  );
}

function BotaoSeta({
  icone,
  rotulo,
  aoTocar,
  desativado,
}: {
  icone: 'voltar' | 'avancar';
  rotulo: string;
  aoTocar: () => void;
  desativado?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={aoTocar}
      disabled={desativado}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: !!desativado }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.seta,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && styles.pressionado,
        desativado && styles.desativado,
      ]}>
      <Icone nome={icone} cor={theme.text} tamanho={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  pressionado: {
    opacity: 0.7,
  },
  desativado: {
    opacity: 0.35,
  },
  seletorMes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  nomeMes: {
    flex: 1,
    textAlign: 'center',
  },
  seta: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destaque: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.one,
    overflow: 'hidden',
  },
  decoracao: {
    position: 'absolute',
    right: -40,
    top: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  textoClaro: {
    color: 'rgba(255,255,255,0.85)',
  },
  textoBranco: {
    color: '#FFFFFF',
  },
  valorDestaque: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: 700,
    color: '#FFFFFF',
  },
  pilula: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginTop: Spacing.one,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  linhaCartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  valorGrande: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: 700,
  },
  barraLinha: {
    gap: Spacing.one,
  },
  percentual: {
    width: 52,
    textAlign: 'right',
  },
  tributo: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  marcador: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  categoria: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 48,
  },
  cartaoLista: {
    paddingVertical: Spacing.one,
    gap: 0,
  },
});
