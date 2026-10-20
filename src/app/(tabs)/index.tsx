import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { BarraProgresso } from '@/components/barra-progresso';
import { Icone, type NomeIcone } from '@/components/icone';
import { CartaoSaude } from '@/components/saude-financeira';
import { SeloNivel } from '@/components/selo-nivel';
import { Cartao, IconeCirculo, Tela, useDegrade } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { SeriesColors, Spacing } from '@/constants/theme';
import { useDadosPessoais, useDashboard, useImpostometro, useJornada, usePerfilFinanceiro } from '@/hooks/use-dados';
import { useConta } from '@/hooks/use-sessao';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { primeiroNome } from '@/services/perfil-financeiro-service';
import { mesAtual, nomeDoMes } from '@/utils/datas';
import { formatarCentavos } from '@/utils/moeda';
import { visualCategoria } from '@/utils/visual';

const MAX_CATEGORIAS = 4;

export default function InicioScreen() {
  const theme = useTheme();
  const degrade = useDegrade(135);
  const esquema = useColorScheme() === 'light' ? 'light' : 'dark';
  const mes = mesAtual();
  const dashboard = useDashboard(mes);
  const impostos = useImpostometro(mes);
  const perfil = usePerfilFinanceiro();
  const conta = useConta();
  const pessoal = useDadosPessoais();
  const jornada = useJornada(conta?.criadoEm ?? null);
  const nome = perfil ? primeiroNome(perfil.nome) : conta ? primeiroNome(conta.nome) : '';
  const saldoPositivo = dashboard.saldoDisponivelCentavos >= 0;

  const topo = (
    <View style={styles.topo}>
      <View style={styles.flex}>
        <ThemedText style={styles.ola} accessibilityRole="header">
          {nome ? `Olá, ${nome}!` : 'Olá!'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Aqui está o seu panorama financeiro de hoje.
        </ThemedText>
      </View>
      <Pressable
        onPress={() => router.navigate('/perfil')}
        accessibilityRole="button"
        accessibilityLabel="Abrir o perfil"
        hitSlop={6}>
        <Avatar nome={conta?.nome ?? nome} avatar={pessoal.avatar} cor={pessoal.corAvatar} tamanho={44} />
      </Pressable>
    </View>
  );

  return (
    <Tela titulo="Início" topo={topo}>
      {/* Saldo: cartão em degradê com brilho */}
      <View
        style={[styles.saldoCartao, degrade, { boxShadow: `0 12px 32px ${theme.brilho}` }]}
        accessible
        accessibilityLabel={`Saldo disponível: ${formatarCentavos(dashboard.saldoDisponivelCentavos)}. Este mês: ${formatarCentavos(dashboard.economizadoCentavos)}.`}>
        <View style={styles.saldoDecoracao} />
        <ThemedText type="small" style={styles.saldoRotulo}>
          Saldo disponível
        </ThemedText>
        <ThemedText style={styles.saldo} numberOfLines={1} adjustsFontSizeToFit>
          {saldoPositivo ? '' : '− '}
          {formatarCentavos(Math.abs(dashboard.saldoDisponivelCentavos))}
        </ThemedText>
        <View style={styles.saldoRodape}>
          <View style={styles.pilula}>
            <Icone nome={dashboard.economizadoCentavos >= 0 ? 'subindo' : 'descendo'} cor="#FFFFFF" tamanho={14} />
            <ThemedText type="smallBold" style={styles.textoBranco}>
              {dashboard.economizadoCentavos >= 0 ? '+' : '−'}
              {formatarCentavos(Math.abs(dashboard.economizadoCentavos))}
            </ThemedText>
          </View>
          <ThemedText type="small" style={styles.saldoRotulo}>
            em {nomeDoMes(mes).split(' ')[0]}
          </ThemedText>
        </View>
      </View>

      {/* Ações rápidas */}
      <View style={styles.acoes}>
        <AcaoRapida icone="saida" texto="Despesa" destino={{ pathname: '/novo-lancamento', params: { tipo: 'despesa' } }} />
        <AcaoRapida icone="entrada" texto="Receita" destino={{ pathname: '/novo-lancamento', params: { tipo: 'receita' } }} />
        <AcaoRapida icone="categorias" texto="Orçamento" destino="/orcamento" />
        <AcaoRapida icone="ia" texto="Insights" destino="/insights" />
      </View>

      {/* Impostômetro pessoal */}
      <Pressable
        onPress={() => router.push('/impostometro')}
        accessibilityRole="button"
        accessibilityLabel={`Impostômetro: ${formatarCentavos(impostos.impostosCentavos)} em impostos neste mês${impostos.percentualDosGastos !== null ? `, ${impostos.percentualDosGastos}% dos seus gastos` : ''}. Ver detalhes.`}
        style={({ pressed }) => pressed && styles.pressionado}>
        <Cartao>
          <View style={styles.linha}>
            <IconeCirculo icone="impostos" cor={theme.brand} tamanho={36} />
            <View style={styles.flex}>
              <ThemedText type="small" themeColor="textSecondary">
                Impostômetro de {nomeDoMes(mes).split(' ')[0]}
              </ThemedText>
              <ThemedText style={styles.valorResumo}>{formatarCentavos(impostos.impostosCentavos)}</ThemedText>
            </View>
            <Icone nome="avancar" cor={theme.textSecondary} tamanho={16} />
          </View>
          {impostos.percentualDosGastos !== null ? (
            <>
              <BarraProgresso percentual={impostos.percentualDosGastos} altura={6} />
              <ThemedText type="small" themeColor="textSecondary">
                {impostos.percentualDosGastos.toLocaleString('pt-BR')}% do que você gastou foi imposto
                {impostos.diasTrabalhados !== null
                  ? ` · ${impostos.diasTrabalhados.toLocaleString('pt-BR')} ${impostos.diasTrabalhados === 1 ? 'dia' : 'dias'} de trabalho`
                  : ''}
              </ThemedText>
            </>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Registre suas despesas para ver quanto delas vai para o governo em impostos.
            </ThemedText>
          )}
        </Cartao>
      </Pressable>

      {/* Progresso na jornada */}
      <Pressable
        onPress={() => router.push('/conquistas')}
        accessibilityRole="button"
        accessibilityLabel={`Seu progresso: nível ${jornada.nivel}, ${jornada.nomeNivel}. ${jornada.xpNoNivel} de ${jornada.xpParaProximo ?? jornada.xpNoNivel} XP.`}
        style={({ pressed }) => pressed && styles.pressionado}>
        <Cartao style={styles.progresso}>
          <View style={[styles.flex, styles.gapPequeno]}>
            <ThemedText type="small" themeColor="textSecondary">
              Seu progresso
            </ThemedText>
            <ThemedText style={styles.nivel}>
              Nível {jornada.nivel} <ThemedText type="small" themeColor="textSecondary">· {jornada.nomeNivel}</ThemedText>
            </ThemedText>
            <BarraProgresso
              percentual={jornada.xpParaProximo ? (jornada.xpNoNivel / jornada.xpParaProximo) * 100 : 100}
              altura={6}
            />
            <ThemedText type="small" themeColor="textSecondary">
              {jornada.xpParaProximo ? `${jornada.xpNoNivel} / ${jornada.xpParaProximo} XP` : 'Nível máximo!'}
            </ThemedText>
          </View>
          <SeloNivel tamanho={64} numero={jornada.nivel} />
        </Cartao>
      </Pressable>

      {/* Resumo do mês */}
      <ThemedText type="smallBold" accessibilityRole="header">
        Resumo do mês
      </ThemedText>
      <View style={styles.resumo}>
        <CartaoResumo
          rotulo="Receitas"
          valor={dashboard.receitasCentavos}
          variacao={dashboard.variacaoReceitas}
          subirEhBom
        />
        <CartaoResumo
          rotulo="Despesas"
          valor={dashboard.despesasCentavos}
          variacao={dashboard.variacaoDespesas}
          subirEhBom={false}
        />
      </View>

      {/* Insight do dia */}
      {dashboard.insights[0] && (
        <Pressable
          onPress={() => router.push('/insights')}
          accessibilityRole="button"
          accessibilityLabel={`Insight: ${dashboard.insights[0].texto}. Ver insights financeiros.`}
          style={({ pressed }) => pressed && styles.pressionado}>
          <Cartao style={styles.insight}>
            <IconeCirculo icone="ia" cor={theme.brand} />
            <View style={[styles.flex, styles.gapPequeno]}>
              <ThemedText type="small">{dashboard.insights[0].texto}</ThemedText>
              <ThemedText type="smallBold" style={{ color: theme.accentText }}>
                Ver insights financeiros
              </ThemedText>
            </View>
          </Cartao>
        </Pressable>
      )}

      <CartaoSaude />

      {/* Onde você mais gastou */}
      <Cartao>
        <View style={styles.linha}>
          <ThemedText type="smallBold" style={styles.flex}>
            Onde você mais gastou
          </ThemedText>
          <Pressable onPress={() => router.push('/orcamento')} accessibilityRole="link" hitSlop={12}>
            <ThemedText type="smallBold" style={{ color: theme.accentText }}>
              Ver tudo
            </ThemedText>
          </Pressable>
        </View>
        {dashboard.categorias.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Nenhuma despesa registrada neste mês.
          </ThemedText>
        ) : (
          dashboard.categorias.slice(0, MAX_CATEGORIAS).map((c) => {
            const visual = visualCategoria(c.categoria, c.categoriaId);
            const cor = SeriesColors[esquema][visual.cor];
            return (
              <View
                key={c.categoriaId}
                style={styles.categoria}
                accessible
                accessibilityLabel={`${c.categoria}: ${formatarCentavos(c.totalCentavos)}, ${c.percentual}% dos gastos`}>
                <IconeCirculo icone={visual.icone} cor={cor} tamanho={36} />
                <View style={[styles.flex, styles.gapPequeno]}>
                  <View style={styles.linha}>
                    <ThemedText type="small" style={styles.flex}>
                      {c.categoria}
                    </ThemedText>
                    <ThemedText type="smallBold">{formatarCentavos(c.totalCentavos)}</ThemedText>
                  </View>
                  <BarraProgresso percentual={c.percentual} cor={cor} altura={4} />
                </View>
                <ThemedText type="small" themeColor="textSecondary" style={styles.percentual}>
                  {c.percentual}%
                </ThemedText>
              </View>
            );
          })
        )}
      </Cartao>
    </Tela>
  );
}

function AcaoRapida({ icone, texto, destino }: { icone: NomeIcone; texto: string; destino: Href }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => router.push(destino)}
      accessibilityRole="button"
      accessibilityLabel={texto}
      style={({ pressed }) => [styles.acao, pressed && styles.pressionado]}>
      <View style={[styles.acaoIcone, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Icone nome={icone} cor={theme.text} tamanho={22} />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {texto}
      </ThemedText>
    </Pressable>
  );
}

function CartaoResumo({
  rotulo,
  valor,
  variacao,
  subirEhBom,
}: {
  rotulo: string;
  valor: number;
  variacao: number | null;
  subirEhBom: boolean;
}) {
  const theme = useTheme();
  const bom = variacao !== null && (subirEhBom ? variacao >= 0 : variacao <= 0);
  const cor = bom ? theme.positive : theme.negative;
  return (
    <Cartao style={styles.flex}>
      <View
        accessible
        accessibilityLabel={`${rotulo}: ${formatarCentavos(valor)}${variacao !== null ? `, ${variacao >= 0 ? 'mais' : 'menos'} ${Math.abs(variacao)}% que no mês passado` : ''}`}
        style={styles.gapPequeno}>
        <ThemedText type="small" themeColor="textSecondary">
          {rotulo}
        </ThemedText>
        <ThemedText style={styles.valorResumo} numberOfLines={1} adjustsFontSizeToFit>
          {formatarCentavos(valor)}
        </ThemedText>
        {variacao !== null ? (
          <View style={styles.linhaVariacao}>
            <Icone nome={variacao >= 0 ? 'subindo' : 'descendo'} cor={cor} tamanho={14} />
            <ThemedText type="smallBold" style={{ color: cor }}>
              {variacao >= 0 ? '+' : ''}
              {variacao}%
            </ThemedText>
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            sem mês anterior
          </ThemedText>
        )}
      </View>
    </Cartao>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  gapPequeno: {
    gap: Spacing.one,
  },
  pressionado: {
    opacity: 0.75,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  ola: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: 700,
  },
  saldoCartao: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.one,
    overflow: 'hidden',
  },
  saldoDecoracao: {
    position: 'absolute',
    right: -40,
    top: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  saldoRotulo: {
    color: 'rgba(255,255,255,0.85)',
  },
  saldo: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: 700,
    color: '#FFFFFF',
  },
  saldoRodape: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  pilula: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  textoBranco: {
    color: '#FFFFFF',
  },
  acoes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  acao: {
    alignItems: 'center',
    gap: Spacing.one,
    minWidth: 72,
  },
  acaoIcone: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progresso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  nivel: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 700,
  },
  resumo: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: -Spacing.one,
  },
  valorResumo: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 700,
  },
  linhaVariacao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  categoria: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 44,
  },
  percentual: {
    width: 36,
    textAlign: 'right',
  },
});
