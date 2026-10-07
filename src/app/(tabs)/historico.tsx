import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { FolhaCalendario } from '@/components/calendario';
import { Chip } from '@/components/chip';
import { Botao, Cartao, Tela } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useDiasComLancamentos, useHistorico } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import { rotuloCategoriaFiltro } from '@/services/historico-service';
import type { TipoTransacao, Transacao } from '@/types/financas';
import { formatarData, formatarDataPorExtenso, hoje, mesAtual, nomeDoMes, somarMeses } from '@/utils/datas';
import { formatarCentavos } from '@/utils/moeda';

type FiltroTipo = 'todos' | TipoTransacao;

export default function HistoricoScreen() {
  const theme = useTheme();
  const [mes, setMes] = useState(mesAtual());
  const [tipo, setTipo] = useState<FiltroTipo>('todos');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [dia, setDia] = useState<string | null>(null);
  const [calendarioAberto, setCalendarioAberto] = useState(false);
  const historico = useHistorico(mes, tipo === 'todos' ? undefined : tipo, categoriaId, dia);
  const diasComLancamentos = useDiasComLancamentos();

  const ehMesAtual = mes >= mesAtual();
  const filtrando = tipo !== 'todos' || historico.categoriaAplicada !== null || dia !== null;

  function trocarMes(novo: string) {
    setMes(novo);
    setDia(null);
  }

  function escolherDia(data: string) {
    setMes(data.slice(0, 7));
    setDia(data);
  }

  function trocarTipo(novo: FiltroTipo) {
    setTipo(novo);
    setCategoriaId(null);
  }

  return (
    <Tela titulo="Histórico">
      {/* Mês */}
      <View style={styles.seletorMes}>
        <BotaoSeta
          texto="‹"
          rotulo="Mês anterior"
          aoTocar={() => trocarMes(somarMeses(mes, -1))}
        />
        <Pressable
          onPress={() => setCalendarioAberto(true)}
          accessibilityRole="button"
          accessibilityLabel={`${nomeDoMes(mes)}. Abrir calendário para escolher um dia`}
          style={({ pressed }) => [styles.botaoMes, pressed && styles.pressionado]}>
          <ThemedText type="smallBold" style={styles.nomeMes} accessibilityLiveRegion="polite">
            📅 {nomeDoMes(mes)}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.accentText }}>
            ▾
          </ThemedText>
        </Pressable>
        <BotaoSeta
          texto="›"
          rotulo="Próximo mês"
          desativado={ehMesAtual}
          aoTocar={() => trocarMes(somarMeses(mes, 1))}
        />
      </View>
      <FolhaCalendario
        visivel={calendarioAberto}
        titulo="Ver lançamentos de um dia"
        valor={dia}
        mesInicial={mes}
        max={hoje()}
        marcados={diasComLancamentos}
        aoEscolher={escolherDia}
        aoFechar={() => setCalendarioAberto(false)}
        acaoExtra={dia ? { texto: 'Mês inteiro', aoTocar: () => setDia(null) } : undefined}
      />

      {/* Dia escolhido no calendário */}
      {dia && (
        <View style={[styles.filtroDia, { backgroundColor: theme.accentSoft }]}>
          <ThemedText type="small" style={styles.flexTexto}>
            Mostrando só{' '}
            <ThemedText type="smallBold">{formatarDataPorExtenso(dia)}</ThemedText>
          </ThemedText>
          <Pressable
            onPress={() => setDia(null)}
            accessibilityRole="button"
            accessibilityLabel="Mostrar o mês inteiro"
            hitSlop={12}>
            <ThemedText type="smallBold" style={{ color: theme.accentText }}>
              Mês inteiro ✕
            </ThemedText>
          </Pressable>
        </View>
      )}

      {/* Tipo */}
      <View style={styles.chips} accessibilityRole="radiogroup">
        <Chip texto="Todos" ativo={tipo === 'todos'} aoTocar={() => trocarTipo('todos')} />
        <Chip texto="Receitas" ativo={tipo === 'receita'} aoTocar={() => trocarTipo('receita')} />
        <Chip texto="Despesas" ativo={tipo === 'despesa'} aoTocar={() => trocarTipo('despesa')} />
      </View>

      {/* Categoria (só as que aparecem no período) */}
      {historico.categorias.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRolagem}
          accessibilityRole="radiogroup"
          accessibilityLabel="Filtrar por categoria">
          <Chip
            texto="Todas as categorias"
            ativo={historico.categoriaAplicada === null}
            aoTocar={() => setCategoriaId(null)}
          />
          {historico.categorias.map((c) => (
            <Chip
              key={c.id}
              texto={rotuloCategoriaFiltro(c, historico.categorias)}
              ativo={historico.categoriaAplicada === c.id}
              aoTocar={() => setCategoriaId(c.id)}
            />
          ))}
        </ScrollView>
      )}

      {/* Totais do que está filtrado */}
      <Cartao>
        <View style={styles.totais}>
          <Total rotulo="Receitas" valor={historico.totais.receitasCentavos} cor={theme.positive} />
          <Total rotulo="Despesas" valor={historico.totais.despesasCentavos} cor={theme.negative} />
          <Total
            rotulo="Saldo"
            valor={historico.totais.saldoCentavos}
            cor={historico.totais.saldoCentavos >= 0 ? theme.text : theme.negative}
          />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {historico.totais.quantidade}{' '}
          {historico.totais.quantidade === 1 ? 'lançamento' : 'lançamentos'}
          {filtrando ? ' com os filtros escolhidos' : ''}
        </ThemedText>
      </Cartao>

      {/* Lista agrupada por dia */}
      {historico.grupos.length === 0 && (
        <View style={styles.vazio}>
          <ThemedText type="small" themeColor="textSecondary">
            {dia
              ? `Nenhum lançamento em ${formatarData(dia)}${tipo !== 'todos' || historico.categoriaAplicada !== null ? ' com esses filtros' : ''}.`
              : filtrando
              ? 'Nenhum lançamento com esses filtros neste mês.'
              : `Nenhum lançamento em ${nomeDoMes(mes)}.`}
          </ThemedText>
          {ehMesAtual && !filtrando && (
            <Botao texto="+ Novo lançamento" onPress={() => router.push('/novo-lancamento')} />
          )}
        </View>
      )}

      {historico.grupos.map((grupo) => (
        <View key={grupo.data} style={styles.grupo}>
          <View style={styles.cabecalhoDia} accessibilityRole="header">
            <ThemedText type="smallBold">{grupo.rotulo}</ThemedText>
            {grupo.destaque && (
              <ThemedText type="small" themeColor="textSecondary">
                {grupo.destaque}
              </ThemedText>
            )}
          </View>
          <Cartao style={styles.cartaoDia}>
            {grupo.transacoes.map((t, i) => (
              <ItemTransacao
                key={t.id}
                transacao={t}
                separador={i > 0}
                aoTocar={() =>
                  router.push({ pathname: '/lancamento/[id]', params: { id: String(t.id) } })
                }
              />
            ))}
          </Cartao>
        </View>
      ))}

      {historico.grupos.length > 0 && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.dica}>
          Toque em um lançamento para ver os detalhes ou editar.
        </ThemedText>
      )}
    </Tela>
  );
}

function ItemTransacao({
  transacao: t,
  separador,
  aoTocar,
}: {
  transacao: Transacao;
  separador: boolean;
  aoTocar: () => void;
}) {
  const theme = useTheme();
  const titulo = t.descricao || t.categoriaNome;
  const receita = t.tipo === 'receita';

  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="button"
      accessibilityLabel={`${receita ? 'Receita' : 'Despesa'}: ${titulo}, ${formatarCentavos(t.valorCentavos)}, ${t.categoriaNome}, ${formatarData(t.data)}${t.recorrente ? ', recorrente' : ''}`}
      accessibilityHint="Abre os detalhes do lançamento"
      style={({ pressed }) => [
        styles.item,
        separador && [styles.itemSeparado, { borderTopColor: theme.backgroundSelected }],
        pressed && styles.pressionado,
      ]}>
      <View style={styles.flex}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {titulo}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t.categoriaNome}
          {t.recorrente ? ' · Recorrente' : ''}
        </ThemedText>
      </View>
      <ThemedText type="smallBold" style={{ color: receita ? theme.positive : theme.negative }}>
        {receita ? '+' : '−'} {formatarCentavos(t.valorCentavos)}
      </ThemedText>
    </Pressable>
  );
}

function Total({ rotulo, valor, cor }: { rotulo: string; valor: number; cor: string }) {
  return (
    <View style={styles.total} accessible accessibilityLabel={`${rotulo}: ${formatarCentavos(valor)}`}>
      <ThemedText type="small" themeColor="textSecondary">
        {rotulo}
      </ThemedText>
      <ThemedText type="smallBold" style={{ color: cor }} numberOfLines={1} adjustsFontSizeToFit>
        {formatarCentavos(valor)}
      </ThemedText>
    </View>
  );
}

function BotaoSeta({
  texto,
  rotulo,
  aoTocar,
  desativado,
}: {
  texto: string;
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
        { backgroundColor: theme.backgroundElement },
        (pressed || desativado) && styles.pressionado,
        desativado && styles.setaDesativada,
      ]}>
      <ThemedText style={styles.textoSeta}>{texto}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  botaoMes: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    minHeight: 44,
  },
  filtroDia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  flexTexto: {
    flex: 1,
  },
  seletorMes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  nomeMes: {
    flex: 1,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  seta: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setaDesativada: {
    opacity: 0.3,
  },
  textoSeta: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: 600,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chipsRolagem: {
    gap: Spacing.two,
  },
  totais: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  total: {
    flex: 1,
    gap: Spacing.half,
  },
  vazio: {
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  grupo: {
    gap: Spacing.two,
  },
  cabecalhoDia: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  cartaoDia: {
    paddingVertical: Spacing.one,
    gap: 0,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  itemSeparado: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pressionado: {
    opacity: 0.6,
  },
  dica: {
    textAlign: 'center',
  },
});
