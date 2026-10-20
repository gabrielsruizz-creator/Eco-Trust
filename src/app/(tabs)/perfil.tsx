import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { CartaoPet } from '@/components/cartao-pet';
import { Icone } from '@/components/icone';
import { CartaoPreferencias } from '@/components/preferencias';
import { SeloNivel } from '@/components/selo-nivel';
import { Botao, Cartao, LinhaLista, Tela, useDegrade } from '@/components/tela';
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
import { rotuloObjetivo } from '@/services/perfil-financeiro-service';
import { DESCRICAO_PERFIL } from '@/services/perfil-investidor-service';
import { camposPreenchidos, DIVIDAS, idadeDoPerfil, rotulo, TOTAL_CAMPOS_PESSOAIS } from '@/services/perfil-pessoal-service';
import { formatarCentavos } from '@/utils/moeda';

export default function PerfilScreen() {
  const theme = useTheme();
  const degrade = useDegrade(90);
  const conta = useConta();
  const pessoal = useDadosPessoais();
  const situacao = useSituacao();
  const perfilFinanceiro = usePerfilFinanceiro();
  const investidor = usePerfilInvestidor();
  const jornada = useJornada(conta?.criadoEm ?? null);
  const plus = useAssinatura().plano === 'plus';
  const alcancadas = jornada.conquistas.filter((c) => c.alcancada).length;
  const anos = idadeDoPerfil(pessoal);
  const preenchidos = camposPreenchidos(pessoal);

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
    <Tela titulo="Perfil">
      {/* Cabeçalho */}
      <Pressable
        onPress={() => router.push('/editar-dados-pessoais')}
        accessibilityRole="button"
        accessibilityLabel={`${conta?.nome ?? ''}, nível ${jornada.nivel}, ${jornada.xp} XP${plus ? `, ${NOME_PLANO_PLUS}` : ''}. Editar dados pessoais`}
        style={({ pressed }) => pressed && styles.pressionado}>
        <Cartao style={styles.cabecalho}>
          <View style={[styles.anelAvatar, degrade]}>
            <Avatar nome={conta?.nome ?? ''} avatar={pessoal.avatar} cor={pessoal.corAvatar} tamanho={64} />
          </View>
          <View style={styles.flex}>
            <ThemedText style={styles.nome} numberOfLines={1}>
              {conta?.nome}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Nível {jornada.nivel} · {jornada.xp} XP
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {conta?.email}
            </ThemedText>
          </View>
          {plus && (
            <View style={[styles.selo, degrade]}>
              <ThemedText type="smallBold" style={styles.textoSelo}>
                Plus
              </ThemedText>
            </View>
          )}
        </Cartao>
      </Pressable>

      {/* Números da jornada */}
      <View style={styles.numeros}>
        <Numero icone={<Icone nome="fogo" cor="#FF8A3D" tamanho={18} />} valor={jornada.sequenciaAtual} rotulo="Sequência" />
        <Numero icone={<Icone nome="trofeu" cor="#F2C94C" tamanho={18} />} valor={alcancadas} rotulo="Conquistas" />
        <Numero icone={<SeloNivel tamanho={22} />} valor={jornada.nivel} rotulo={jornada.nomeNivel} />
      </View>

      {/* Mascote */}
      <CartaoPet />

      {/* Sobre você */}
      <Grupo titulo="Sobre você">
        <LinhaLista
          icone="usuario"
          titulo="Meus dados"
          subtitulo={
            preenchidos < TOTAL_CAMPOS_PESSOAIS
              ? `${preenchidos} de ${TOTAL_CAMPOS_PESSOAIS} preenchidos`
              : [anos !== null ? `${anos} anos` : null, pessoal.cidade].filter(Boolean).join(' · ')
          }
          aoTocar={() => router.push('/editar-dados-pessoais')}
        />
        <LinhaLista
          separador
          icone="carteira"
          titulo="Situação financeira"
          subtitulo={situacao ? `Dívidas: ${rotulo(DIVIDAS, situacao.dividas).toLocaleLowerCase('pt-BR')}` : 'Conte sobre dívidas e reserva'}
          aoTocar={() => router.push('/editar-situacao')}
        />
        <LinhaLista
          separador
          icone="bandeira"
          titulo="Objetivos financeiros"
          subtitulo={
            perfilFinanceiro
              ? `${rotuloObjetivo(perfilFinanceiro.objetivo)} · ${formatarCentavos(perfilFinanceiro.metaEconomiaCentavos)}/mês`
              : undefined
          }
          aoTocar={() => router.push('/editar-perfil')}
        />
        <LinhaLista
          separador
          icone="investimentos"
          titulo="Perfil de investidor"
          subtitulo={investidor ? DESCRICAO_PERFIL[investidor.tipo].titulo : 'Descubra em 6 perguntas'}
          aoTocar={() => router.push('/perfil-investidor')}
        />
        <LinhaLista
          separador
          icone="chat"
          titulo="Refazer conversa com o EcoTrust"
          aoTocar={() => router.push('/refazer-conversa')}
        />
      </Grupo>

      <Grupo titulo="Sua jornada">
        <LinhaLista
          icone="trofeu"
          titulo="Conquistas"
          subtitulo={`${alcancadas} de ${jornada.conquistas.length} alcançadas`}
          aoTocar={() => router.push('/conquistas')}
        />
        <LinhaLista
          separador
          icone="coracao"
          titulo="Saúde financeira"
          subtitulo="Sua nota e a evolução mês a mês"
          aoTocar={() => router.push('/saude-financeira')}
        />
        <LinhaLista
          separador
          icone="etiqueta"
          titulo="Categorias"
          subtitulo="Crie, renomeie ou exclua"
          aoTocar={() => router.push('/categorias')}
        />
      </Grupo>

      <Grupo titulo="Aprender">
        <LinhaLista
          icone="aprender"
          titulo="EcoTrust Academy"
          subtitulo="Cursos, glossário e fórum da comunidade"
          aoTocar={() => router.push('/academy')}
        />
      </Grupo>

      <View style={styles.grupo}>
        <ThemedText type="smallBold" accessibilityRole="header">
          Preferências
        </ThemedText>
        <CartaoPreferencias />
      </View>

      <Grupo titulo="Plano e conta">
        <LinhaLista
          icone="coroa"
          titulo={plus ? NOME_PLANO_PLUS : `Conhecer o ${NOME_PLANO_PLUS}`}
          subtitulo={plus ? 'Gerenciar assinatura' : 'Análise, saúde financeira, IA e Academy'}
          aoTocar={() => router.push('/assinatura')}
          direita={
            !plus ? (
              <ThemedText type="smallBold" style={{ color: theme.accentText }}>
                Ver
              </ThemedText>
            ) : undefined
          }
        />
        <LinhaLista separador icone="sair" titulo="Sair" aoTocar={sair} />
      </Grupo>

      <Botao texto="Apagar conta e dados" variante="perigo" icone="lixeira" onPress={confirmarApagar} />
    </Tela>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={styles.grupo}>
      <ThemedText type="smallBold" accessibilityRole="header">
        {titulo}
      </ThemedText>
      <Cartao style={styles.lista}>{children}</Cartao>
    </View>
  );
}

function Numero({ icone, valor, rotulo: r }: { icone: ReactNode; valor: number; rotulo: string }) {
  return (
    <Cartao style={styles.numero}>
      <View accessible accessibilityLabel={`${r}: ${valor}`} style={styles.numeroConteudo}>
        {icone}
        <ThemedText style={styles.numeroValor}>{valor}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {r}
        </ThemedText>
      </View>
    </Cartao>
  );
}

const styles = StyleSheet.create({
  pressionado: {
    opacity: 0.75,
  },
  flex: {
    flex: 1,
    gap: Spacing.half,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  anelAvatar: {
    padding: 3,
    borderRadius: 999,
  },
  nome: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 700,
  },
  selo: {
    paddingHorizontal: Spacing.two + Spacing.one,
    paddingVertical: Spacing.half,
    borderRadius: 999,
  },
  textoSelo: {
    color: '#FFFFFF',
  },
  numeros: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  numero: {
    flex: 1,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  numeroConteudo: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  numeroValor: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 700,
  },
  grupo: {
    gap: Spacing.two,
  },
  lista: {
    paddingVertical: Spacing.one,
    gap: 0,
  },
});
