import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icone, type NomeIcone } from '@/components/icone';
import { Minigrafico } from '@/components/minigrafico';
import { PetEco } from '@/components/pet-eco';
import { Selo, seloDoLancamento } from '@/components/selo';
import { BotaoIcone, Cartao, Tela } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { Valor } from '@/components/valor';
import { Spacing } from '@/constants/theme';
import {
  useDashboard,
  useHistoricoImpostos,
  useImpostometro,
  useImpostosDosLancamentos,
  useOrcamentos,
  usePerfilFinanceiro,
  useTransacoes,
} from '@/hooks/use-dados';
import { useConta } from '@/hooks/use-sessao';
import { useTheme } from '@/hooks/use-theme';
import type { OrigemImposto } from '@/services/impostometro-service';
import { primeiroNome, saudacao } from '@/services/perfil-financeiro-service';
import type { Transacao } from '@/types/financas';
import { diasEntre, formatarDataCurta, hoje, mesAtual, nomeDoMes } from '@/utils/datas';
import { formatarCentavos } from '@/utils/moeda';
import { visualCategoria } from '@/utils/visual';

const RECENTES = 5;

/** Barra única de ações; a primeira é a principal (destaque em rosa cheio). */
const ACOES: { icone: NomeIcone; texto: string; destino: Href }[] = [
  { icone: 'mais', texto: 'Despesa', destino: { pathname: '/novo-lancamento', params: { tipo: 'despesa' } } },
  { icone: 'qrcode', texto: 'Ler nota', destino: '/ler-nota' },
  { icone: 'entrada', texto: 'Receita', destino: { pathname: '/novo-lancamento', params: { tipo: 'receita' } } },
  { icone: 'compartilhar', texto: 'Compartilhar', destino: '/compartilhar-impostos' },
];

export default function InicioScreen() {
  const theme = useTheme();
  const mes = mesAtual();
  const dashboard = useDashboard(mes);
  const impostos = useImpostometro(mes);
  const historico = useHistoricoImpostos(mes);
  const impostosPorLancamento = useImpostosDosLancamentos(mes);
  const orcamentos = useOrcamentos(mes);
  const recentes = useTransacoes(mes).slice(0, RECENTES);
  const perfil = usePerfilFinanceiro();
  const conta = useConta();
  const nome = perfil ? primeiroNome(perfil.nome) : conta ? primeiroNome(conta.nome) : '';
  const nomeMes = nomeDoMes(mes).split(' ')[0];

  const estourados = orcamentos.categorias.filter((o) => o.situacao === 'ultrapassou');
  const excesso = estourados.reduce((s, o) => s + Math.max(0, -o.restanteCentavos), 0);
  const [ano, m] = mes.split('-').map(Number);
  const diasRestantes = diasEntre(hoje(), `${mes}-${String(new Date(ano, m, 0).getDate()).padStart(2, '0')}`);

  const consumo = impostos.impostosCentavos;
  const renda = impostos.fixos ? impostos.fixos.inssCentavos + impostos.fixos.irCentavos : 0;
  const patrimonio = impostos.fixos
    ? impostos.fixos.ipvaCentavos + impostos.fixos.iptuCentavos + impostos.fixos.outrosCentavos
    : 0;

  const topo = (
    <View style={styles.topo}>
      <Pressable
        onPress={() => router.navigate('/perfil')}
        accessibilityRole="button"
        accessibilityLabel="Abrir o perfil e o mascote"
        style={[styles.mascote, { backgroundColor: theme.accentSoft }]}>
        <PetEco humor="feliz" estagio="adulto" tamanho={44} corTinta={theme.brand} corFundo={theme.accentSoft} rotuloAcessivel="Mascote do EcoTrust" />
      </Pressable>
      <View style={styles.flex}>
        <ThemedText type="small" themeColor="textSecondary">
          {saudacao()},
        </ThemedText>
        <ThemedText style={styles.nome} accessibilityRole="header" numberOfLines={1}>
          {nome || 'que bom te ver'}
        </ThemedText>
      </View>
      <BotaoIcone icone="ia" rotulo="Insights financeiros" aoTocar={() => router.push('/insights')} />
      <BotaoIcone icone="mais" rotulo="Novo lançamento" aoTocar={() => router.push('/novo-lancamento')} />
    </View>
  );

  return (
    <Tela titulo="Início" topo={topo}>
      {/* Impostos do mês */}
      <Pressable
        onPress={() => router.navigate('/impostos')}
        accessibilityRole="button"
        accessibilityLabel={`Impostos pagos em ${nomeMes}: ${formatarCentavos(impostos.cargaTotalCentavos)}${impostos.percentualDosGastos !== null ? `, ${impostos.percentualDosGastos}% dos gastos` : ''}. Abrir o Impostômetro`}
        style={({ pressed }) => pressed && styles.pressionado}>
        <Cartao>
          <View style={styles.linhaTopo}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
              Impostos pagos · {nomeMes}
            </ThemedText>
            <Minigrafico valores={historico.map((h) => h.centavos)} />
          </View>
          <View style={styles.linhaValor}>
            <Valor centavos={impostos.cargaTotalCentavos} style={styles.valorGrande} />
            {impostos.percentualDosGastos !== null && (
              <Selo texto={`${impostos.percentualDosGastos.toLocaleString('pt-BR')}% dos gastos`} tom="rosa" />
            )}
          </View>
          <View style={[styles.tres, { borderTopColor: theme.border }]}>
            <Parte rotulo="Consumo" cor={theme.text} centavos={consumo} />
            <Parte rotulo="Renda" cor={theme.brand} centavos={renda} separador />
            <Parte rotulo="Patrimônio" cor={theme.warning} centavos={patrimonio} separador />
          </View>
        </Cartao>
      </Pressable>

      {/* Ações */}
      <Cartao style={styles.acoes}>
        {ACOES.map((a, i) => (
          <Pressable
            key={a.texto}
            onPress={() => router.push(a.destino)}
            accessibilityRole="button"
            accessibilityLabel={a.texto}
            style={({ pressed }) => [
              styles.acao,
              i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: theme.border },
              pressed && styles.pressionado,
            ]}>
            <View style={[styles.circuloAcao, { backgroundColor: i === 0 ? theme.accent : theme.accentSoft }]}>
              <Icone nome={a.icone} cor={i === 0 ? theme.onAccent : theme.accentText} tamanho={17} />
            </View>
            <ThemedText type="small" style={styles.textoAcao} numberOfLines={1}>
              {a.texto}
            </ThemedText>
          </Pressable>
        ))}
      </Cartao>

      {/* Alerta: orçamento estourado, senão a dica do mês */}
      {estourados.length > 0 ? (
        <Cartao>
          <View style={styles.alerta}>
            <View style={[styles.quadrado, { borderColor: theme.border }]}>
              <Icone nome="bandeira" cor={theme.text} tamanho={18} />
            </View>
            <View style={styles.flex}>
              <ThemedText type="smallBold" style={styles.tituloAlerta}>
                {estourados.length === 1 ? '1 orçamento estourado' : `${estourados.length} orçamentos estourados`}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                <ThemedText type="small" style={{ color: theme.accentText }}>
                  {formatarCentavos(excesso)} acima
                </ThemedText>
                {' · '}
                {estourados.map((o) => o.nome).join(' e ')}
              </ThemedText>
            </View>
          </View>
          <View style={styles.linhaTopo}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
              {diasRestantes > 0 ? `Ainda dá tempo: faltam ${diasRestantes} dias` : 'Último dia do mês'}
            </ThemedText>
            <BotaoPilula texto="Revisar" aoTocar={() => router.push('/orcamento')} />
          </View>
        </Cartao>
      ) : (
        dashboard.insights[0] && (
          <Pressable
            onPress={() => router.push('/insights')}
            accessibilityRole="button"
            accessibilityLabel={`Dica: ${dashboard.insights[0].texto}. Ver insights.`}
            style={({ pressed }) => pressed && styles.pressionado}>
            <Cartao style={styles.alerta}>
              <View style={[styles.quadrado, { borderColor: theme.border }]}>
                <Icone nome="ia" cor={theme.brand} tamanho={18} />
              </View>
              <ThemedText type="small" style={styles.flex}>
                {dashboard.insights[0].texto}
              </ThemedText>
            </Cartao>
          </Pressable>
        )
      )}

      {/* Últimos lançamentos */}
      <View style={styles.secao}>
        <ThemedText type="smallBold" style={styles.tituloSecao} accessibilityRole="header">
          Últimos lançamentos
        </ThemedText>
        <Pressable
          onPress={() => router.navigate('/transacoes')}
          accessibilityRole="link"
          hitSlop={8}
          style={[styles.verTudo, { backgroundColor: theme.backgroundElement, boxShadow: `0 4px 12px ${theme.brilho}` }]}>
          <ThemedText type="small">Ver tudo ▸</ThemedText>
        </Pressable>
      </View>
      <Cartao style={styles.lista}>
        {recentes.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.vazio}>
            Nada registrado neste mês ainda. Que tal ler o QR Code da sua última nota?
          </ThemedText>
        ) : (
          recentes.map((t, i) => {
            const imp = impostosPorLancamento.get(t.id);
            return <LinhaLancamento key={t.id} transacao={t} impostosCentavos={imp?.centavos ?? 0} origem={imp?.origem ?? null} separador={i > 0} />;
          })
        )}
      </Cartao>
    </Tela>
  );
}

function Parte({ rotulo, cor, centavos, separador }: { rotulo: string; cor: string; centavos: number; separador?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.parte, separador && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: theme.border }]}
      accessible
      accessibilityLabel={`${rotulo}: ${formatarCentavos(centavos)}`}>
      <View style={styles.rotuloParte}>
        <View style={[styles.bolinha, { backgroundColor: cor }]} />
        <ThemedText type="small" themeColor="textSecondary">
          {rotulo}
        </ThemedText>
      </View>
      <ThemedText type="smallBold" style={styles.valorParte} numberOfLines={1}>
        {formatarCentavos(centavos).replace(/,\d\d$/, '')}
      </ThemedText>
    </View>
  );
}

function BotaoPilula({ texto, aoTocar }: { texto: string; aoTocar: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="button"
      style={({ pressed }) => [styles.pilula, { backgroundColor: theme.accent }, pressed && styles.pressionado]}>
      <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
        {texto}
      </ThemedText>
    </Pressable>
  );
}

function LinhaLancamento({
  transacao: t,
  impostosCentavos,
  origem,
  separador,
}: {
  transacao: Transacao;
  impostosCentavos: number;
  origem: OrigemImposto | null;
  separador: boolean;
}) {
  const theme = useTheme();
  const receita = t.tipo === 'receita';
  const titulo = t.descricao || t.categoriaNome;
  const selo = seloDoLancamento(t, origem);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/lancamento/[id]', params: { id: String(t.id) } })}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}, ${receita ? 'receita' : 'despesa'} de ${formatarCentavos(t.valorCentavos)}, ${formatarDataCurta(t.data)}${impostosCentavos > 0 ? `, ${formatarCentavos(impostosCentavos)} de impostos` : ''}. ${selo.texto}`}
      style={({ pressed }) => [
        styles.item,
        separador && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
        pressed && styles.pressionado,
      ]}>
      <View style={[styles.quadrado, { borderColor: theme.border }]}>
        <Icone nome={visualCategoria(t.categoriaNome, t.categoriaId).icone} cor={theme.text} tamanho={18} />
      </View>
      <View style={styles.flex}>
        <ThemedText type="small" style={styles.tituloItem} numberOfLines={1}>
          {titulo}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {formatarDataCurta(t.data)}
          {impostosCentavos > 0 ? ` · ${formatarCentavos(impostosCentavos)} imp.` : ''}
        </ThemedText>
      </View>
      <View style={styles.direita}>
        <Valor centavos={t.valorCentavos} sinal={receita ? '+' : undefined} style={styles.valorItem} />
        <Selo texto={selo.texto} tom={selo.tom} />
      </View>
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
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  mascote: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.one,
  },
  nome: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: 700,
  },
  linhaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  linhaValor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: -Spacing.one,
  },
  valorGrande: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: 700,
    letterSpacing: -0.5,
  },
  tres: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    marginTop: Spacing.one,
  },
  parte: {
    flex: 1,
    paddingLeft: Spacing.two + Spacing.one,
    gap: Spacing.half,
  },
  rotuloParte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bolinha: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  valorParte: {
    fontSize: 16,
    lineHeight: 22,
  },
  acoes: {
    flexDirection: 'row',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.one,
    gap: 0,
  },
  acao: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    minHeight: 44,
  },
  circuloAcao: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoAcao: {
    fontSize: 12,
    lineHeight: 16,
  },
  alerta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  quadrado: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloAlerta: {
    fontSize: 15,
  },
  pilula: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  secao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
  tituloSecao: {
    fontSize: 18,
    lineHeight: 24,
  },
  verTudo: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + Spacing.half,
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
    minHeight: 64,
    paddingVertical: Spacing.two + Spacing.one,
  },
  tituloItem: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: 500,
  },
  direita: {
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
  valorItem: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: 700,
  },
});
