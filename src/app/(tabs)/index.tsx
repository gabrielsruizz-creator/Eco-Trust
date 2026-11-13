import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Icone, type NomeIcone } from '@/components/icone';
import { LogoEcoTrust } from '@/components/logo-ecotrust';
import { PetEco } from '@/components/pet-eco';
import { CartaoSaude } from '@/components/saude-financeira';
import { Cartao, IconeCirculo, Tela } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  useDadosPessoais,
  useDashboard,
  useImpostometro,
  useImpostosDosLancamentos,
  usePerfilFinanceiro,
  useTransacoes,
} from '@/hooks/use-dados';
import { useConta } from '@/hooks/use-sessao';
import { useTheme } from '@/hooks/use-theme';
import { primeiroNome } from '@/services/perfil-financeiro-service';
import type { Transacao } from '@/types/financas';
import { formatarDataCurta, mesAtual, nomeDoMes } from '@/utils/datas';
import { formatarCentavos } from '@/utils/moeda';
import { visualCategoria } from '@/utils/visual';

const RECENTES = 4;

/** Atalhos da grade (4 × 2), como os serviços do layout de referência */
const ATALHOS: { icone: NomeIcone; texto: string; destino: Href; destaque?: boolean }[] = [
  { icone: 'impostos', texto: 'Impostos', destino: '/impostos', destaque: true },
  { icone: 'categorias', texto: 'Orçamento', destino: '/orcamento' },
  { icone: 'metas', texto: 'Metas', destino: '/metas', destaque: true },
  { icone: 'transacoes', texto: 'Transações', destino: '/transacoes' },
  { icone: 'recibo', texto: 'Imp. Renda', destino: '/imposto-de-renda', destaque: true },
  { icone: 'reforma', texto: 'Reforma', destino: '/reforma-tributaria' },
  { icone: 'compras', texto: 'Produtos', destino: '/meus-produtos', destaque: true },
  { icone: 'aprender', texto: 'Aprender', destino: '/academy' },
];

export default function InicioScreen() {
  const theme = useTheme();
  const mes = mesAtual();
  const dashboard = useDashboard(mes);
  const impostos = useImpostometro(mes);
  const impostosPorLancamento = useImpostosDosLancamentos(mes);
  const recentes = useTransacoes(mes).slice(0, RECENTES);
  const perfil = usePerfilFinanceiro();
  const conta = useConta();
  const pessoal = useDadosPessoais();
  const nome = perfil ? primeiroNome(perfil.nome) : conta ? primeiroNome(conta.nome) : '';
  const saldo = dashboard.saldoDisponivelCentavos;

  const topo = (
    <View style={styles.marca}>
      <LogoEcoTrust tamanho={22} />
      <ThemedText style={styles.nomeApp}>EcoTrust</ThemedText>
      <Pressable
        onPress={() => router.navigate('/perfil')}
        accessibilityRole="button"
        accessibilityLabel="Abrir o perfil"
        hitSlop={6}>
        <Avatar nome={conta?.nome ?? nome} avatar={pessoal.avatar} cor={pessoal.corAvatar} tamanho={36} />
      </Pressable>
    </View>
  );

  return (
    <Tela titulo="Início" topo={topo}>
      {/* Saudação e saldo */}
      <View
        style={styles.ola}
        accessible
        accessibilityLabel={`Olá${nome ? `, ${nome}` : ''}. Seu saldo disponível: ${formatarCentavos(saldo)}`}>
        <View style={styles.flex}>
          <ThemedText type="smallBold" style={styles.saudacao} accessibilityRole="header">
            {nome ? `Olá, ${nome}` : 'Olá!'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Seu saldo disponível
          </ThemedText>
        </View>
        <ThemedText style={[styles.saldo, saldo < 0 && { color: theme.negative }]} numberOfLines={1} adjustsFontSizeToFit>
          {saldo < 0 ? '− ' : ''}
          {formatarCentavos(Math.abs(saldo))}
        </ThemedText>
      </View>

      {/* Barra de ações */}
      <View style={[styles.barra, { backgroundColor: theme.accent }]}>
        <AcaoBarra icone="mais" texto="Despesa" destino={{ pathname: '/novo-lancamento', params: { tipo: 'despesa' } }} />
        <AcaoBarra icone="entrada" texto="Receita" destino={{ pathname: '/novo-lancamento', params: { tipo: 'receita' } }} />
        <AcaoBarra icone="qrcode" texto="Ler nota" destino="/ler-nota" />
      </View>

      {/* Grade de atalhos */}
      <Cartao style={styles.grade}>
        {ATALHOS.map((a) => (
          <Pressable
            key={a.texto}
            onPress={() => router.push(a.destino)}
            accessibilityRole="button"
            accessibilityLabel={a.texto}
            style={({ pressed }) => [styles.atalho, pressed && styles.pressionado]}>
            <Icone nome={a.icone} cor={a.destaque ? theme.accent : theme.text} tamanho={24} />
            <ThemedText type="small" style={styles.textoAtalho} numberOfLines={1}>
              {a.texto}
            </ThemedText>
          </Pressable>
        ))}
      </Cartao>

      {/* Banner do Impostômetro */}
      <Pressable
        onPress={() => router.navigate('/impostos')}
        accessibilityRole="button"
        accessibilityLabel={`Impostômetro: ${formatarCentavos(impostos.cargaTotalCentavos)} em impostos neste mês. Ver detalhes.`}
        style={({ pressed }) => [styles.banner, { backgroundColor: theme.banner }, pressed && styles.pressionado]}>
        <View style={styles.flex}>
          <ThemedText style={[styles.tituloBanner, { color: theme.onBanner }]}>
            {formatarCentavos(impostos.cargaTotalCentavos)} em impostos
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.onBanner }}>
            {impostos.percentualDosGastos !== null
              ? `${impostos.percentualDosGastos.toLocaleString('pt-BR')}% do que você gastou em ${nomeDoMes(mes).split(' ')[0]}`
              : 'Registre suas despesas para ver o imposto escondido nelas'}
          </ThemedText>
          {impostos.diasTrabalhados !== null && (
            <ThemedText type="small" style={[styles.detalheBanner, { color: theme.onBanner }]}>
              {impostos.diasTrabalhados.toLocaleString('pt-BR')} dias de trabalho para o governo ›
            </ThemedText>
          )}
        </View>
        <PetEco
          humor="feliz"
          estagio="adulto"
          tamanho={76}
          corTinta={theme.onBanner}
          corFundo={theme.banner}
          rotuloAcessivel="Mascote do EcoTrust"
        />
      </Pressable>

      {/* Transações recentes */}
      <View style={styles.secao}>
        <ThemedText type="smallBold" style={styles.tituloSecao} accessibilityRole="header">
          Transações recentes
        </ThemedText>
        <Pressable onPress={() => router.navigate('/transacoes')} accessibilityRole="link" hitSlop={12}>
          <ThemedText type="smallBold">Ver tudo</ThemedText>
        </Pressable>
      </View>
      {recentes.length === 0 ? (
        <Cartao>
          <ThemedText type="small" themeColor="textSecondary">
            Nenhuma transação neste mês. Registre uma despesa ou leia o QR Code de uma nota.
          </ThemedText>
        </Cartao>
      ) : (
        recentes.map((t) => (
          <LinhaTransacao key={t.id} transacao={t} impostosCentavos={impostosPorLancamento.get(t.id)?.centavos ?? 0} />
        ))
      )}

      {/* Dica do mês e saúde financeira */}
      {dashboard.insights[0] && (
        <Pressable
          onPress={() => router.push('/insights')}
          accessibilityRole="button"
          accessibilityLabel={`Dica: ${dashboard.insights[0].texto}. Ver insights financeiros.`}
          style={({ pressed }) => pressed && styles.pressionado}>
          <Cartao style={styles.linhaCartao}>
            <IconeCirculo icone="ia" cor={theme.brand} tamanho={36} />
            <ThemedText type="small" style={styles.flex}>
              {dashboard.insights[0].texto}
            </ThemedText>
          </Cartao>
        </Pressable>
      )}
      <CartaoSaude />
    </Tela>
  );
}

function AcaoBarra({ icone, texto, destino }: { icone: NomeIcone; texto: string; destino: Href }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => router.push(destino)}
      accessibilityRole="button"
      accessibilityLabel={texto}
      style={({ pressed }) => [styles.acao, pressed && styles.pressionado]}>
      <Icone nome={icone} cor={theme.onAccent} tamanho={22} />
      <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
        {texto}
      </ThemedText>
    </Pressable>
  );
}

function LinhaTransacao({ transacao: t, impostosCentavos }: { transacao: Transacao; impostosCentavos: number }) {
  const theme = useTheme();
  const receita = t.tipo === 'receita';
  const titulo = t.descricao || t.categoriaNome;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/lancamento/[id]', params: { id: String(t.id) } })}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}, ${receita ? 'receita' : 'despesa'} de ${formatarCentavos(t.valorCentavos)}, ${formatarDataCurta(t.data)}${impostosCentavos > 0 ? `, ${formatarCentavos(impostosCentavos)} de impostos` : ''}`}
      style={({ pressed }) => pressed && styles.pressionado}>
      <Cartao style={styles.linhaCartao}>
        <IconeCirculo icone={visualCategoria(t.categoriaNome, t.categoriaId).icone} cor={theme.text} tamanho={36} />
        <View style={styles.flex}>
          <ThemedText type="small" numberOfLines={1}>
            {titulo}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatarDataCurta(t.data)}
          </ThemedText>
        </View>
        <View style={styles.valor}>
          <ThemedText type="smallBold" numberOfLines={1} style={receita && { color: theme.positive }}>
            {receita ? '+' : '−'} {formatarCentavos(t.valorCentavos)}
          </ThemedText>
          {impostosCentavos > 0 && (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {formatarCentavos(impostosCentavos)} imp.
            </ThemedText>
          )}
        </View>
      </Cartao>
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
  marca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  nomeApp: {
    flex: 1,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 800,
  },
  ola: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.three,
  },
  saudacao: {
    fontSize: 17,
    lineHeight: 24,
  },
  saldo: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: 700,
  },
  barra: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 8,
    paddingVertical: Spacing.three,
  },
  acao: {
    alignItems: 'center',
    gap: Spacing.one,
    minWidth: 80,
    minHeight: 44,
  },
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.one,
  },
  atalho: {
    width: '25%',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 52,
  },
  textoAtalho: {
    fontSize: 12,
    lineHeight: 16,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 8,
    padding: Spacing.three,
  },
  tituloBanner: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: 700,
  },
  detalheBanner: {
    marginTop: Spacing.one,
    fontSize: 12,
  },
  secao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
  tituloSecao: {
    fontSize: 16,
  },
  linhaCartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
  },
  valor: {
    alignItems: 'flex-end',
  },
});
