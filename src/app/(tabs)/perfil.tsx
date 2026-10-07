import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { CartaoPet } from '@/components/cartao-pet';
import { CartaoJornada, GradeConquistas } from '@/components/jornada';
import { CartaoPreferencias } from '@/components/preferencias';
import { Botao, Cartao, Tela } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  useAssinatura,
  useDadosPessoais,
  useJornada,
  usePerfilFinanceiro,
  usePerfilInvestidor,
  useSituacao,
} from '@/hooks/use-dados';
import { useConta } from '@/hooks/use-sessao';
import { useTheme } from '@/hooks/use-theme';
import { NOME_PLANO_PLUS } from '@/services/assinatura-service';
import { apagarContaEDados, sair } from '@/services/conta-service';
import { calcularSobraEstimada, rotuloFonteRenda, rotuloObjetivo } from '@/services/perfil-financeiro-service';
import { DESCRICAO_PERFIL } from '@/services/perfil-investidor-service';
import {
  camposPreenchidos,
  DIVIDAS,
  ESTADOS_CIVIS,
  idadeDoPerfil,
  INVESTIMENTOS,
  MORADIAS,
  RESERVAS,
  rotulo,
  TOTAL_CAMPOS_PESSOAIS,
} from '@/services/perfil-pessoal-service';
import { formatarCentavos } from '@/utils/moeda';

/** Quantas medalhas aparecem na aba (o resto fica em "Ver todas"). */
const MEDALHAS_NA_ABA = 6;

export default function PerfilScreen() {
  const conta = useConta();
  const pessoal = useDadosPessoais();
  const jornada = useJornada(conta?.criadoEm ?? null);
  const assinatura = useAssinatura();
  const plus = assinatura.plano === 'plus';

  // Mostra primeiro as conquistas alcançadas, depois as que faltam.
  const medalhas = [...jornada.conquistas].sort((a, b) => Number(b.alcancada) - Number(a.alcancada)).slice(0, MEDALHAS_NA_ABA);
  const alcancadas = jornada.conquistas.filter((c) => c.alcancada).length;

  return (
    <Tela titulo="Perfil">
      {/* Cabeçalho */}
      <Pressable
        onPress={() => router.push('/editar-dados-pessoais')}
        accessibilityRole="button"
        accessibilityLabel={`${conta?.nome ?? ''}, nível ${jornada.nivel}, ${jornada.nomeNivel}. Editar dados pessoais`}
        style={({ pressed }) => [styles.cabecalho, pressed && styles.pressionado]}>
        <Avatar nome={conta?.nome ?? ''} avatar={pessoal.avatar} cor={pessoal.corAvatar} tamanho={72} />
        <View style={styles.flex}>
          <ThemedText style={styles.nome}>{conta?.nome}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {conta?.email}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Nível {jornada.nivel} · {jornada.nomeNivel}
            {plus ? ` · ${NOME_PLANO_PLUS}` : ''}
          </ThemedText>
        </View>
      </Pressable>

      {/* Mascote */}
      <Secao titulo="Seu companheiro">
        <CartaoPet />
      </Secao>

      {/* Jornada */}
      <Secao titulo="Sua jornada">
        <CartaoJornada jornada={jornada} />
      </Secao>

      <Secao titulo={`Conquistas · ${alcancadas}/${jornada.conquistas.length}`}>
        <Cartao>
          <GradeConquistas conquistas={medalhas} />
          <Botao texto="Ver todas as conquistas" variante="secundario" onPress={() => router.push('/conquistas')} />
        </Cartao>
      </Secao>


      {/* Sobre você */}
      <Secao titulo="Dados pessoais">
        <CartaoDadosPessoais />
      </Secao>
      <Secao titulo="Situação financeira">
        <CartaoSituacao />
      </Secao>
      <Secao titulo="Perfil financeiro">
        <CartaoPerfilFinanceiro />
      </Secao>
      <Secao titulo="Perfil de investidor">
        <CartaoInvestidor />
      </Secao>

      {/* App */}
      <Secao titulo="Preferências">
        <CartaoPreferencias />
      </Secao>
      <Secao titulo="Plano">
        <CartaoPlano />
      </Secao>
      <Secao titulo="Conta">
        <CartaoConta />
      </Secao>
    </Tela>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={styles.secao}>
      <ThemedText type="smallBold" accessibilityRole="header">
        {titulo}
      </ThemedText>
      {children}
    </View>
  );
}

function Linha({ rotulo: r, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={styles.linha} accessible accessibilityLabel={`${r}: ${valor}`}>
      <ThemedText type="small" themeColor="textSecondary">
        {r}
      </ThemedText>
      <ThemedText type="small" style={styles.valor}>
        {valor}
      </ThemedText>
    </View>
  );
}

function CartaoDadosPessoais() {
  const p = useDadosPessoais();
  const preenchidos = camposPreenchidos(p);
  const anos = idadeDoPerfil(p);
  return (
    <Cartao>
      <Linha rotulo="Idade" valor={anos !== null ? `${anos} anos` : 'Não informado'} />
      <Linha rotulo="Cidade" valor={p.cidade ?? 'Não informado'} />
      <Linha rotulo="Profissão" valor={p.profissao ?? 'Não informado'} />
      <Linha rotulo="Estado civil" valor={rotulo(ESTADOS_CIVIS, p.estadoCivil)} />
      <Linha rotulo="Dependentes" valor={p.dependentes !== null ? String(p.dependentes) : 'Não informado'} />
      {preenchidos < TOTAL_CAMPOS_PESSOAIS && (
        <ThemedText type="small" themeColor="textSecondary">
          Complete seus dados ({preenchidos}/{TOTAL_CAMPOS_PESSOAIS}) para ganhar a conquista &quot;Quem sou eu&quot;.
        </ThemedText>
      )}
      <Botao texto="Editar dados pessoais" variante="secundario" onPress={() => router.push('/editar-dados-pessoais')} />
    </Cartao>
  );
}

function CartaoSituacao() {
  const s = useSituacao();
  return (
    <Cartao>
      {s ? (
        <>
          <Linha rotulo="Moradia" valor={rotulo(MORADIAS, s.moradia)} />
          <Linha rotulo="Dívidas" valor={rotulo(DIVIDAS, s.dividas)} />
          <Linha rotulo="Reserva" valor={rotulo(RESERVAS, s.reserva)} />
          <Linha rotulo="Investimentos" valor={rotulo(INVESTIMENTOS, s.investe)} />
          <Linha rotulo="Renda extra" valor={s.rendaExtra === null || s.rendaExtra === undefined ? 'Não informado' : s.rendaExtra ? 'Sim' : 'Não'} />
        </>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Conte sobre suas dívidas, reserva e investimentos para receber orientações melhores.
        </ThemedText>
      )}
      <Botao texto="Editar situação financeira" variante="secundario" onPress={() => router.push('/editar-situacao')} />
    </Cartao>
  );
}

function CartaoPerfilFinanceiro() {
  const perfil = usePerfilFinanceiro();
  if (!perfil) return null;
  return (
    <Cartao>
      <Linha rotulo="Renda mensal" valor={formatarCentavos(perfil.rendaMensalCentavos)} />
      <Linha rotulo="Fonte de renda" valor={rotuloFonteRenda(perfil.fonteRenda)} />
      <Linha rotulo="Contas fixas" valor={formatarCentavos(perfil.despesasFixasCentavos)} />
      <Linha
        rotulo="Sobra estimada"
        valor={formatarCentavos(calcularSobraEstimada(perfil.rendaMensalCentavos, perfil.despesasFixasCentavos))}
      />
      <Linha rotulo="Objetivo" valor={rotuloObjetivo(perfil.objetivo)} />
      <Linha rotulo="Meta por mês" valor={formatarCentavos(perfil.metaEconomiaCentavos)} />
      <Botao texto="Editar perfil financeiro" variante="secundario" onPress={() => router.push('/editar-perfil')} />
      <Botao texto="Refazer conversa com o EcoTrust" variante="secundario" onPress={() => router.push('/refazer-conversa')} />
      <Botao texto="Gerenciar categorias" variante="secundario" onPress={() => router.push('/categorias')} />
    </Cartao>
  );
}

function CartaoInvestidor() {
  const theme = useTheme();
  const perfil = usePerfilInvestidor();
  return (
    <Cartao>
      {perfil ? (
        <ThemedText type="small">
          Seu perfil é{' '}
          <ThemedText type="smallBold" style={{ color: theme.accentText }}>
            {DESCRICAO_PERFIL[perfil.tipo].titulo}
          </ThemedText>
          .
        </ThemedText>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Descubra se você é conservador, moderado ou arrojado com 6 perguntas rápidas.
        </ThemedText>
      )}
      <Botao
        texto={perfil ? 'Ver perfil de investidor' : 'Descobrir meu perfil'}
        variante="secundario"
        onPress={() => router.push('/perfil-investidor')}
      />
    </Cartao>
  );
}

function CartaoPlano() {
  const theme = useTheme();
  const assinatura = useAssinatura();
  const plus = assinatura.plano === 'plus';
  return (
    <Cartao>
      <View style={styles.linha}>
        <ThemedText type="small" themeColor="textSecondary">
          Seu plano
        </ThemedText>
        <ThemedText type="smallBold" style={plus ? { color: theme.accentText } : undefined}>
          {plus ? NOME_PLANO_PLUS : 'Gratuito'}
        </ThemedText>
      </View>
      {!plus && (
        <ThemedText type="small" themeColor="textSecondary">
          Análise completa, saúde financeira, perguntas ao EcoTrust e Trust Academy.
        </ThemedText>
      )}
      <Botao
        texto={plus ? 'Gerenciar assinatura' : `Conhecer o ${NOME_PLANO_PLUS}`}
        variante={plus ? 'secundario' : 'primario'}
        onPress={() => router.push('/assinatura')}
      />
    </Cartao>
  );
}

function CartaoConta() {
  function confirmarApagar() {
    Alert.alert(
      'Apagar conta e dados',
      'Sua conta e todos os lançamentos, orçamentos, metas e conquistas deste aparelho serão apagados. Isso não pode ser desfeito.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Apagar tudo', style: 'destructive', onPress: () => apagarContaEDados() },
      ],
    );
  }
  return (
    <Cartao>
      <Botao texto="Sair" variante="secundario" onPress={sair} />
      <Botao texto="Apagar conta e dados" variante="perigo" onPress={confirmarApagar} />
    </Cartao>
  );
}

const styles = StyleSheet.create({
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  pressionado: {
    opacity: 0.7,
  },
  flex: {
    flex: 1,
    gap: Spacing.half,
  },
  nome: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 700,
  },
  secao: {
    gap: Spacing.two,
  },
  linha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  valor: {
    flexShrink: 1,
    textAlign: 'right',
  },
});
