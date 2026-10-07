import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { BarraProgresso } from '@/components/barra-progresso';
import { Botao, Cartao, Tela } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { CartaoInsight } from '@/components/cartao-insight';
import { CartaoSaude } from '@/components/saude-financeira';
import { Spacing } from '@/constants/theme';
import { useDashboard, usePerfilFinanceiro } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import { primeiroNome, saudacao } from '@/services/perfil-financeiro-service';
import { mesAtual, nomeDoMes } from '@/utils/datas';
import { formatarCentavos } from '@/utils/moeda';

const MAX_CATEGORIAS = 5;

export default function DashboardScreen() {
  const theme = useTheme();
  const mes = mesAtual();
  const dashboard = useDashboard(mes);
  const perfil = usePerfilFinanceiro();
  const nome = perfil ? primeiroNome(perfil.nome) : '';

  const maiorValorMes = Math.max(dashboard.receitasCentavos, dashboard.despesasCentavos, 1);
  const maiorCategoria = dashboard.categorias[0]?.totalCentavos ?? 1;
  const outrasCategorias = dashboard.categorias.length - MAX_CATEGORIAS;

  return (
    <Tela titulo={nome ? `${saudacao()}, ${nome}.` : `${saudacao()}!`}>
      <ThemedText themeColor="textSecondary" style={styles.mes}>
        {nomeDoMes(mes)}
      </ThemedText>

      {/* Resumo financeiro */}
      <Cartao>
        <ThemedText type="small" themeColor="textSecondary">
          Saldo disponível
        </ThemedText>
        <ThemedText
          style={[
            styles.saldo,
            { color: dashboard.saldoDisponivelCentavos >= 0 ? theme.text : theme.negative },
          ]}
          accessibilityLabel={`Saldo disponível: ${formatarCentavos(dashboard.saldoDisponivelCentavos)}`}>
          {formatarCentavos(dashboard.saldoDisponivelCentavos)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Tudo que entrou menos tudo que saiu, pelos seus lançamentos.
        </ThemedText>
        <View style={styles.indicadores}>
          <Indicador rotulo="Receitas" valor={dashboard.receitasCentavos} cor={theme.positive} />
          <Indicador rotulo="Despesas" valor={dashboard.despesasCentavos} cor={theme.negative} />
          <Indicador
            rotulo="Economizado"
            valor={dashboard.economizadoCentavos}
            cor={dashboard.economizadoCentavos >= 0 ? theme.accent : theme.negative}
          />
        </View>
      </Cartao>

      <Botao texto="+ Adicionar lançamento" onPress={() => router.push('/novo-lancamento')} />

      {dashboard.insights[0] && (
        <CartaoInsight tom={dashboard.insights[0].tom} texto={dashboard.insights[0].texto}>
          <Pressable
            onPress={() => router.navigate('/assistente')}
            accessibilityRole="link"
            style={styles.linkAnalise}
            hitSlop={8}>
            <ThemedText type="smallBold" style={{ color: theme.accentText }}>
              Ver análise completa ›
            </ThemedText>
          </Pressable>
        </CartaoInsight>
      )}

      <CartaoSaude />

      {/* Visão do mês */}
      <Cartao>
        <ThemedText type="smallBold">Visão do mês</ThemedText>
        <LinhaComparativa
          rotulo="Receitas"
          valor={dashboard.receitasCentavos}
          percentual={(dashboard.receitasCentavos / maiorValorMes) * 100}
          cor={theme.positive}
        />
        <LinhaComparativa
          rotulo="Despesas"
          valor={dashboard.despesasCentavos}
          percentual={(dashboard.despesasCentavos / maiorValorMes) * 100}
          cor={theme.negative}
        />
        <View style={[styles.linha, styles.separador, { borderTopColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold">Saldo do mês</ThemedText>
          <ThemedText
            type="smallBold"
            style={{ color: dashboard.economizadoCentavos >= 0 ? theme.positive : theme.negative }}>
            {formatarCentavos(dashboard.economizadoCentavos)}
          </ThemedText>
        </View>

        {dashboard.percentualMeta !== null && (
          <View style={styles.bloco}>
            <View style={styles.linha}>
              <ThemedText type="small">Meta de economia</ThemedText>
              <ThemedText type="small">
                {formatarCentavos(Math.max(0, dashboard.economizadoCentavos))} de{' '}
                {formatarCentavos(dashboard.metaEconomiaCentavos)}
              </ThemedText>
            </View>
            <BarraProgresso
              percentual={dashboard.percentualMeta}
              cor={dashboard.percentualMeta >= 100 ? theme.positive : theme.accent}
              rotuloAcessivel="Progresso da meta de economia"
            />
            <ThemedText type="small" themeColor="textSecondary">
              {Math.floor(dashboard.percentualMeta)}% da meta
            </ThemedText>
          </View>
        )}

        {dashboard.disponivelParaGastarCentavos !== null && (
          <ThemedText
            type="small"
            style={{
              color: dashboard.disponivelParaGastarCentavos >= 0 ? theme.textSecondary : theme.negative,
            }}>
            {dashboard.disponivelParaGastarCentavos >= 0
              ? `Você ainda pode gastar ${formatarCentavos(dashboard.disponivelParaGastarCentavos)} este mês ${dashboard.origemLimite === 'orcamento' ? 'dentro do seu orçamento' : 'sem comprometer sua meta'}.`
              : `Você passou ${formatarCentavos(-dashboard.disponivelParaGastarCentavos)} ${dashboard.origemLimite === 'orcamento' ? 'do seu orçamento' : 'do limite'} deste mês.`}
          </ThemedText>
        )}
      </Cartao>

      {/* Gastos por categoria */}
      <Cartao>
        <ThemedText type="smallBold">Onde você mais gastou</ThemedText>
        {dashboard.categorias.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Nenhuma despesa registrada neste mês.
          </ThemedText>
        ) : (
          dashboard.categorias.slice(0, MAX_CATEGORIAS).map((c) => (
            <View key={c.categoriaId} style={styles.bloco}>
              <View style={styles.linha}>
                <ThemedText type="small">{c.categoria}</ThemedText>
                <ThemedText type="small">
                  {formatarCentavos(c.totalCentavos)}{' '}
                  <ThemedText type="small" themeColor="textSecondary">
                    · {c.percentual}%
                  </ThemedText>
                </ThemedText>
              </View>
              <BarraProgresso
                percentual={(c.totalCentavos / maiorCategoria) * 100}
                rotuloAcessivel={`${c.categoria}, ${c.percentual}% dos gastos`}
              />
            </View>
          ))
        )}
        {outrasCategorias > 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            + {outrasCategorias} {outrasCategorias === 1 ? 'outra categoria' : 'outras categorias'}
          </ThemedText>
        )}
      </Cartao>
    </Tela>
  );
}

function Indicador({ rotulo, valor, cor }: { rotulo: string; valor: number; cor: string }) {
  return (
    <View style={styles.indicador} accessible accessibilityLabel={`${rotulo}: ${formatarCentavos(valor)}`}>
      <ThemedText type="small" themeColor="textSecondary">
        {rotulo}
      </ThemedText>
      <ThemedText type="smallBold" style={{ color: cor }} numberOfLines={1} adjustsFontSizeToFit>
        {formatarCentavos(valor)}
      </ThemedText>
    </View>
  );
}

function LinhaComparativa({
  rotulo,
  valor,
  percentual,
  cor,
}: {
  rotulo: string;
  valor: number;
  percentual: number;
  cor: string;
}) {
  return (
    <View style={styles.bloco}>
      <View style={styles.linha}>
        <ThemedText type="small">{rotulo}</ThemedText>
        <ThemedText type="small">{formatarCentavos(valor)}</ThemedText>
      </View>
      <BarraProgresso percentual={percentual} cor={cor} altura={10} rotuloAcessivel={rotulo} />
    </View>
  );
}

const styles = StyleSheet.create({
  mes: {
    marginTop: -Spacing.three,
    textTransform: 'capitalize',
  },
  saldo: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: 700,
  },
  indicadores: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  indicador: {
    flex: 1,
    gap: Spacing.half,
  },
  linha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  separador: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
  },
  bloco: {
    gap: Spacing.one,
  },
  linkAnalise: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
});
