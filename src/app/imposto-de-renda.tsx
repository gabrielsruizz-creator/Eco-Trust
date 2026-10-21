import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Icone } from '@/components/icone';
import { Botao, Cartao } from '@/components/tela';
import { TelaSecundaria } from '@/components/tela-secundaria';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useDeducoesIR } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import { marcarDedutivel, type DespesaDedutivel, type TipoDeducao } from '@/services/ir-service';
import { formatarDataCurta, hoje } from '@/utils/datas';
import { formatarCentavos } from '@/utils/moeda';

const NOME_TIPO: Record<TipoDeducao, string> = { saude: 'Saúde', educacao: 'Educação' };

/** Despesas de saúde e educação do ano, prontas para a declaração do Imposto de Renda. */
export default function ImpostoDeRendaScreen() {
  const theme = useTheme();
  const anoAtual = Number(hoje().slice(0, 4));
  const [ano, setAno] = useState(anoAtual);
  const d = useDeducoesIR(ano);
  const total = d.saudeCentavos + d.educacaoCentavos;

  return (
    <TelaSecundaria titulo="Imposto de Renda">
      <View style={styles.seletor}>
        <Pressable onPress={() => setAno(ano - 1)} accessibilityRole="button" accessibilityLabel="Ano anterior" hitSlop={8} style={[styles.seta, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
          <Icone nome="voltar" cor={theme.text} tamanho={18} />
        </Pressable>
        <View style={styles.flex}>
          <ThemedText type="smallBold" style={styles.centro} accessibilityLiveRegion="polite">
            Gastos de {ano}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centro}>
            Declaração entregue em {ano + 1}
          </ThemedText>
        </View>
        <Pressable
          onPress={() => setAno(ano + 1)}
          disabled={ano >= anoAtual}
          accessibilityRole="button"
          accessibilityLabel="Próximo ano"
          accessibilityState={{ disabled: ano >= anoAtual }}
          hitSlop={8}
          style={[styles.seta, { borderColor: theme.border, backgroundColor: theme.backgroundElement }, ano >= anoAtual && styles.apagado]}>
          <Icone nome="avancar" cor={theme.text} tamanho={18} />
        </Pressable>
      </View>

      <Cartao>
        <ThemedText type="small" themeColor="textSecondary">
          Despesas dedutíveis (declaração completa)
        </ThemedText>
        <ThemedText style={styles.valor}>{formatarCentavos(total)}</ThemedText>
        <Linha rotulo="Saúde (sem limite)" valor={formatarCentavos(d.saudeCentavos)} />
        <Linha
          rotulo={`Educação (limite ${formatarCentavos(d.limiteEducacaoCentavos)} para ${d.pessoas} ${d.pessoas === 1 ? 'pessoa' : 'pessoas'})`}
          valor={formatarCentavos(d.educacaoCentavos)}
        />
        {d.educacaoInformadaCentavos > d.educacaoCentavos && (
          <ThemedText type="small" themeColor="textSecondary">
            Você gastou {formatarCentavos(d.educacaoInformadaCentavos)} com educação; só{' '}
            {formatarCentavos(d.limiteEducacaoCentavos)} podem ser deduzidos.
          </ThemedText>
        )}
      </Cartao>

      {d.comparacao ? (
        <Cartao>
          <ThemedText type="smallBold">
            Modelo que deve valer mais a pena: {d.comparacao.melhor === 'completa' ? 'completa' : 'simplificada'}
          </ThemedText>
          <Linha rotulo="Deduções da completa (com INSS e dependentes)" valor={formatarCentavos(d.comparacao.completaCentavos)} />
          <Linha rotulo="Desconto da simplificada (20%, até R$ 16.754,34)" valor={formatarCentavos(d.comparacao.simplificadoCentavos)} />
          <ThemedText type="small" themeColor="textSecondary">
            {d.comparacao.aliquotaMarginal === 0
              ? 'Pelo salário informado, você fica isento do IR (até R$ 5 mil por mês). As despesas não mudam o imposto, mas guarde os comprovantes.'
              : `Diferença aproximada no imposto: ${formatarCentavos(d.comparacao.economiaCentavos)} (pela sua faixa de ${d.comparacao.aliquotaMarginal}%). Considera só o salário informado; outras rendas mudam a conta.`}
          </ThemedText>
        </Cartao>
      ) : (
        <Cartao>
          <ThemedText type="small" themeColor="textSecondary">
            Informe seu salário bruto para o app comparar a declaração completa com a simplificada.
          </ThemedText>
          <Botao texto="Informar salário bruto" variante="secundario" onPress={() => router.push('/impostos-renda')} />
        </Cartao>
      )}

      {(['saude', 'educacao'] as const).map((tipo) => {
        const lista = d.despesas.filter((x) => x.tipo === tipo);
        return (
          <View key={tipo} style={styles.grupo}>
            <ThemedText type="smallBold" accessibilityRole="header">
              {NOME_TIPO[tipo]} em {ano}
            </ThemedText>
            <Cartao style={styles.lista}>
              {lista.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.vazio}>
                  Nenhuma despesa de {NOME_TIPO[tipo].toLocaleLowerCase('pt-BR')} neste ano.
                </ThemedText>
              ) : (
                lista.map((item, i) => <LinhaDespesa key={item.transacao.id} item={item} separador={i > 0} />)
              )}
            </Cartao>
          </View>
        );
      })}

      <ThemedText type="small" themeColor="textSecondary">
        Entram: consultas, dentistas, psicólogos, exames, hospitais e plano de saúde; escola, faculdade e
        pós. Não entram: remédios de farmácia, academia, cursos livres e idiomas. Guarde os recibos com o
        CPF de quem foi atendido. Estas contas são uma ajuda: confira as regras da Receita ao declarar.
      </ThemedText>
    </TelaSecundaria>
  );
}

function LinhaDespesa({ item, separador }: { item: DespesaDedutivel; separador: boolean }) {
  const theme = useTheme();
  const t = item.transacao;
  const titulo = t.descricao || t.categoriaNome;
  return (
    <View style={[styles.item, separador && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
      <View style={styles.flex}>
        <ThemedText type="small" numberOfLines={1}>
          {titulo}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatarDataCurta(t.data)} · {formatarCentavos(t.valorCentavos)}
          {item.escolhaDoUsuario ? '' : ' · sugestão do app'}
        </ThemedText>
      </View>
      <Switch
        value={item.dedutivel}
        onValueChange={(v) => marcarDedutivel(t.id, v)}
        trackColor={{ true: theme.accent }}
        accessibilityLabel={`${titulo}, ${formatarCentavos(t.valorCentavos)}: entra na declaração`}
      />
    </View>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={styles.linha} accessible accessibilityLabel={`${rotulo}: ${valor}`}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
        {rotulo}
      </ThemedText>
      <ThemedText type="smallBold">{valor}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centro: {
    textAlign: 'center',
  },
  apagado: {
    opacity: 0.35,
  },
  seletor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  seta: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valor: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: 700,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  grupo: {
    gap: Spacing.two,
  },
  lista: {
    paddingVertical: Spacing.one,
    gap: 0,
  },
  vazio: {
    paddingVertical: Spacing.two,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 56,
    paddingVertical: Spacing.two,
  },
});
