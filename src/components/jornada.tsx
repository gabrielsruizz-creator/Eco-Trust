import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { BarraProgresso } from '@/components/barra-progresso';
import { SeloNivel } from '@/components/selo-nivel';
import { Cartao } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ConquistaJornada, Jornada } from '@/services/gamificacao-service';
import { formatarData, paraDataLocal } from '@/utils/datas';

/** Nível, XP, sequência e números da jornada. */
export function CartaoJornada({ jornada }: { jornada: Jornada }) {
  const theme = useTheme();
  const percentual = jornada.xpParaProximo ? (jornada.xpNoNivel / jornada.xpParaProximo) * 100 : 100;

  return (
    <Cartao>
      <View style={styles.linha}>
        <SeloNivel tamanho={72} numero={jornada.nivel} />
        <View style={styles.flex}>
          <ThemedText style={styles.tituloNivel}>Nível {jornada.nivel}</ThemedText>
          <ThemedText type="small" style={{ color: theme.accentText }}>
            {jornada.nomeNivel} · {jornada.xp} XP
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Você está evoluindo!
          </ThemedText>
        </View>
      </View>
      <BarraProgresso
        percentual={percentual}
        altura={10}
        rotuloAcessivel={
          jornada.xpParaProximo
            ? `Progresso para o nível ${jornada.nivel + 1}: ${jornada.xpNoNivel} de ${jornada.xpParaProximo} XP`
            : 'Nível máximo alcançado'
        }
      />
      <ThemedText type="small" themeColor="textSecondary">
        {jornada.xpParaProximo
          ? `Faltam ${jornada.xpParaProximo - jornada.xpNoNivel} XP para o próximo nível.`
          : 'Você chegou ao nível máximo. Parabéns!'}
      </ThemedText>

      <View style={styles.numeros}>
        <Numero valor={`🔥 ${jornada.sequenciaAtual}`} rotulo={jornada.sequenciaAtual === 1 ? 'dia seguido' : 'dias seguidos'} />
        <Numero valor={String(jornada.totalLancamentos)} rotulo="lançamentos" />
        <Numero valor={String(jornada.metasConcluidas)} rotulo="metas concluídas" />
        <Numero valor={String(jornada.diasDeUso)} rotulo={jornada.diasDeUso === 1 ? 'dia de EcoTrust' : 'dias de EcoTrust'} />
      </View>
      {jornada.melhorSequencia > jornada.sequenciaAtual && (
        <ThemedText type="small" themeColor="textSecondary">
          Sua melhor sequência: {jornada.melhorSequencia} dias.
        </ThemedText>
      )}
      <ThemedText type="small" themeColor="textSecondary">
        Ganhe XP registrando seus gastos, guardando nas metas e mantendo o orçamento em dia.
      </ThemedText>
    </Cartao>
  );
}

function Numero({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <View style={styles.numero} accessible accessibilityLabel={`${valor.replace('🔥 ', '')} ${rotulo}`}>
      <ThemedText style={styles.valorNumero}>{valor}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.rotuloNumero}>
        {rotulo}
      </ThemedText>
    </View>
  );
}

/** Grade de medalhas. Alcançadas aparecem coloridas; as outras, apagadas com o progresso. */
export function GradeConquistas({ conquistas }: { conquistas: ConquistaJornada[] }) {
  const theme = useTheme();
  return (
    <View style={styles.grade}>
      {conquistas.map((c) => (
        <Pressable
          key={c.id}
          onPress={() =>
            Alert.alert(
              `${c.icone} ${c.nome}`,
              `${c.descricao}\n\n${
                c.alcancada
                  ? c.alcancadaEm
                    ? `Alcançada em ${formatarData(paraDataLocal(new Date(c.alcancadaEm)))}.`
                    : 'Alcançada!'
                  : `Ainda não alcançada${c.progresso ? ` (${c.progresso})` : ''}.`
              }`,
            )
          }
          accessibilityRole="button"
          accessibilityLabel={`${c.nome}: ${c.alcancada ? 'alcançada' : 'bloqueada'}. ${c.descricao}${!c.alcancada && c.progresso ? ` Progresso: ${c.progresso}` : ''}`}
          style={({ pressed }) => [styles.medalha, pressed && styles.pressionado]}>
          <View
            style={[
              styles.circulo,
              { backgroundColor: c.alcancada ? theme.accentSoft : theme.backgroundSelected },
              !c.alcancada && styles.bloqueada,
            ]}>
            <ThemedText style={styles.icone}>{c.icone}</ThemedText>
          </View>
          <ThemedText type="small" style={styles.nomeMedalha} numberOfLines={2}>
            {c.nome}
          </ThemedText>
          {!c.alcancada && c.progresso && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.progresso}>
              {c.progresso}
            </ThemedText>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  tituloNivel: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 700,
  },
  numeros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.two,
  },
  numero: {
    width: '50%',
    paddingVertical: Spacing.one,
  },
  valorNumero: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 700,
  },
  rotuloNumero: {
    marginTop: -2,
  },
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.three,
  },
  medalha: {
    width: '33.33%',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  circulo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloqueada: {
    opacity: 0.4,
  },
  icone: {
    fontSize: 26,
    lineHeight: 32,
  },
  nomeMedalha: {
    textAlign: 'center',
  },
  progresso: {
    fontSize: 11,
    lineHeight: 14,
  },
  pressionado: {
    opacity: 0.6,
  },
});
