import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { FolhaCalendario } from '@/components/calendario';
import { Chip } from '@/components/chip';
import { Icone } from '@/components/icone';
import { Botao, Cartao, IconeCirculo, Segmentado, Tela } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { SeriesColors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDiasComLancamentos, useHistorico, useImpostosDosLancamentos } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import { rotuloCategoriaFiltro } from '@/services/historico-service';
import type { TipoTransacao, Transacao } from '@/types/financas';
import {
  formatarData,
  formatarDataCurta,
  formatarDataPorExtenso,
  hoje,
  mesAtual,
  nomeDoMesTitulo,
  paraDataLocal,
  somarMeses,
} from '@/utils/datas';
import { formatarCentavos } from '@/utils/moeda';
import { visualCategoria } from '@/utils/visual';

type FiltroTipo = 'todos' | TipoTransacao;

export default function TransacoesScreen() {
  const theme = useTheme();
  const [mes, setMes] = useState(mesAtual());
  const [tipo, setTipo] = useState<FiltroTipo>('todos');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [dia, setDia] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [calendarioAberto, setCalendarioAberto] = useState(false);
  const historico = useHistorico(mes, tipo === 'todos' ? undefined : tipo, categoriaId, dia, busca);
  const diasComLancamentos = useDiasComLancamentos();
  const impostos = useImpostosDosLancamentos(mes);
  const impostosFiltrados = historico.grupos
    .flatMap((g) => g.transacoes)
    .reduce((soma, t) => soma + (impostos.get(t.id)?.centavos ?? 0), 0);

  const ehMesAtual = mes >= mesAtual();
  const filtrando = tipo !== 'todos' || historico.categoriaAplicada !== null || dia !== null || busca.trim() !== '';

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
    <Tela
      titulo="Transações"
      acoes={[
        { icone: 'categorias', rotulo: 'Categorias e orçamento', aoTocar: () => router.push('/orcamento') },
        { icone: 'mais', rotulo: 'Novo lançamento', aoTocar: () => router.push('/novo-lancamento') },
      ]}>
      {/* Busca */}
      <View style={[styles.busca, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Icone nome="busca" cor={theme.textSecondary} tamanho={18} />
        <TextInput
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar transações..."
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel="Buscar transações por descrição ou categoria"
          returnKeyType="search"
          style={[styles.campoBusca, { color: theme.text }]}
        />
        {busca !== '' && (
          <Pressable onPress={() => setBusca('')} accessibilityRole="button" accessibilityLabel="Limpar busca" hitSlop={12}>
            <Icone nome="fechar" cor={theme.textSecondary} tamanho={16} />
          </Pressable>
        )}
      </View>

      <Segmentado
        rotulo="Tipo de lançamento"
        valor={tipo}
        aoMudar={trocarTipo}
        opcoes={[
          { valor: 'todos', texto: 'Todos' },
          { valor: 'receita', texto: 'Receitas' },
          { valor: 'despesa', texto: 'Despesas' },
        ]}
      />

      {/* Mês (o nome abre o calendário) */}
      <View style={styles.seletorMes}>
        <BotaoSeta icone="voltar" rotulo="Mês anterior" aoTocar={() => trocarMes(somarMeses(mes, -1))} />
        <Pressable
          onPress={() => setCalendarioAberto(true)}
          accessibilityRole="button"
          accessibilityLabel={`${nomeDoMesTitulo(mes)}. Abrir calendário para escolher um dia`}
          style={({ pressed }) => [styles.botaoMes, pressed && styles.pressionado]}>
          <Icone nome="calendario" cor={theme.accentText} tamanho={18} />
          <ThemedText type="smallBold" accessibilityLiveRegion="polite">
            {nomeDoMesTitulo(mes)}
          </ThemedText>
        </Pressable>
        <BotaoSeta
          icone="avancar"
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

      {dia && (
        <View style={[styles.filtroDia, { backgroundColor: theme.accentSoft }]}>
          <ThemedText type="small" style={styles.flex}>
            Mostrando só <ThemedText type="smallBold">{formatarDataPorExtenso(dia)}</ThemedText>
          </ThemedText>
          <Pressable onPress={() => setDia(null)} accessibilityRole="button" accessibilityLabel="Mostrar o mês inteiro" hitSlop={12}>
            <ThemedText type="smallBold" style={{ color: theme.accentText }}>
              Mês inteiro
            </ThemedText>
          </Pressable>
        </View>
      )}

      {/* Categoria (só as que aparecem no período) */}
      {historico.categorias.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sangria}
          contentContainerStyle={styles.chipsRolagem}
          accessibilityRole="radiogroup"
          accessibilityLabel="Filtrar por categoria">
          <Chip texto="Todas" ativo={historico.categoriaAplicada === null} aoTocar={() => setCategoriaId(null)} />
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
          {historico.totais.quantidade} {historico.totais.quantidade === 1 ? 'lançamento' : 'lançamentos'}
          {filtrando ? ' com os filtros escolhidos' : ''}
        </ThemedText>
        {impostosFiltrados > 0 && (
          <Pressable
            onPress={() => router.navigate('/impostos')}
            accessibilityRole="link"
            accessibilityLabel={`${formatarCentavos(impostosFiltrados)} em impostos nessas despesas. Abrir o Impostômetro`}
            style={({ pressed }) => [styles.linhaImpostos, pressed && styles.pressionado]}>
            <Icone nome="impostos" cor={theme.accentText} tamanho={16} />
            <ThemedText type="small" style={styles.flex}>
              <ThemedText type="smallBold">{formatarCentavos(impostosFiltrados)}</ThemedText> em impostos
              nessas despesas
            </ThemedText>
            <Icone nome="avancar" cor={theme.textSecondary} tamanho={14} />
          </Pressable>
        )}
      </Cartao>

      {/* Lista agrupada por dia */}
      {historico.grupos.length === 0 && (
        <View style={styles.vazio}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centro}>
            {busca.trim()
              ? `Nada encontrado para "${busca.trim()}".`
              : dia
                ? `Nenhum lançamento em ${formatarData(dia)}.`
                : filtrando
                  ? 'Nenhum lançamento com esses filtros neste mês.'
                  : `Nenhum lançamento em ${nomeDoMesTitulo(mes).toLocaleLowerCase('pt-BR')}.`}
          </ThemedText>
          {ehMesAtual && !filtrando && (
            <Botao texto="Novo lançamento" icone="mais" onPress={() => router.push('/novo-lancamento')} />
          )}
        </View>
      )}

      {historico.grupos.map((grupo) => (
        <View key={grupo.data} style={styles.grupo}>
          <ThemedText type="small" themeColor="textSecondary" accessibilityRole="header">
            {grupo.destaque ? `${grupo.destaque}, ${formatarDataCurta(grupo.data)}` : formatarDataCurta(grupo.data)}
          </ThemedText>
          <Cartao style={styles.cartaoDia}>
            {grupo.transacoes.map((t, i) => (
              <ItemTransacao key={t.id} transacao={t} separador={i > 0} impostosCentavos={impostos.get(t.id)?.centavos ?? 0} />
            ))}
          </Cartao>
        </View>
      ))}
    </Tela>
  );
}

/** Hora em que o lançamento foi registrado, só quando foi registrado no próprio dia. */
function horaDoRegistro(t: Transacao) {
  if (!t.criadoEm) return null;
  const criado = new Date(t.criadoEm);
  if (Number.isNaN(criado.getTime()) || paraDataLocal(criado) !== t.data) return null;
  return criado.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function ItemTransacao({
  transacao: t,
  separador,
  impostosCentavos,
}: {
  transacao: Transacao;
  separador: boolean;
  /** Impostos da despesa (da nota ou estimados); 0 em receitas */
  impostosCentavos: number;
}) {
  const theme = useTheme();
  const esquema = useColorScheme() === 'light' ? 'light' : 'dark';
  const titulo = t.descricao || t.categoriaNome;
  const receita = t.tipo === 'receita';
  const visual = visualCategoria(t.categoriaNome, t.categoriaId);
  const hora = horaDoRegistro(t);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/lancamento/[id]', params: { id: String(t.id) } })}
      accessibilityRole="button"
      accessibilityLabel={`${receita ? 'Receita' : 'Despesa'}: ${titulo}, ${formatarCentavos(t.valorCentavos)}${impostosCentavos > 0 ? `, ${formatarCentavos(impostosCentavos)} de impostos` : ''}, ${t.categoriaNome}, ${formatarData(t.data)}${t.recorrente ? ', recorrente' : ''}`}
      accessibilityHint="Abre os detalhes do lançamento"
      style={({ pressed }) => [
        styles.item,
        separador && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
        pressed && styles.pressionado,
      ]}>
      <IconeCirculo icone={visual.icone} cor={SeriesColors[esquema][visual.cor]} />
      <View style={styles.flex}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {titulo}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {t.categoriaNome}
          {t.recorrente ? ' · Recorrente' : ''}
        </ThemedText>
      </View>
      <View style={styles.valor}>
        <ThemedText type="smallBold" style={{ color: receita ? theme.positive : theme.negative }}>
          {receita ? '+' : '−'} {formatarCentavos(t.valorCentavos)}
        </ThemedText>
        {impostosCentavos > 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {formatarCentavos(impostosCentavos)} imp.
          </ThemedText>
        ) : (
          hora && (
            <ThemedText type="small" themeColor="textSecondary">
              {hora}
            </ThemedText>
          )
        )}
      </View>
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
  centro: {
    textAlign: 'center',
  },
  pressionado: {
    opacity: 0.7,
  },
  desativado: {
    opacity: 0.35,
  },
  busca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 48,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
  },
  campoBusca: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.two,
  },
  seletorMes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  botaoMes: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 44,
  },
  seta: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtroDia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  sangria: {
    marginHorizontal: -Spacing.three,
    flexGrow: 0,
  },
  chipsRolagem: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  totais: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  total: {
    flex: 1,
    gap: Spacing.half,
  },
  linhaImpostos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 32,
  },
  vazio: {
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  grupo: {
    gap: Spacing.two,
  },
  cartaoDia: {
    paddingVertical: Spacing.one,
    gap: 0,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 64,
    paddingVertical: Spacing.two,
  },
  valor: {
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
});
