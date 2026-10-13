import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { BarraProgresso } from '@/components/barra-progresso';
import { Icone } from '@/components/icone';
import { Botao, Cartao, useDegrade } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useMetas } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import { descreverMeta } from '@/services/metas-service';
import type { ProgressoMeta } from '@/types/financas';
import { formatarCentavos } from '@/utils/moeda';
import { iconeMeta } from '@/utils/visual';

/** Lista de metas (aba Metas). */
export function PainelMetas() {
  const theme = useTheme();
  const metas = useMetas();
  const ativas = metas.filter((m) => !m.concluida);
  const alcancadas = metas.filter((m) => m.concluida);

  return (
    <>
      {metas.length === 0 ? (
        <Cartao>
          <ThemedText type="smallBold">Transforme economia em conquistas</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Crie metas como uma reserva de emergência, uma viagem ou um carro. O EcoTrust mostra seu
            progresso e quanto guardar por mês para chegar lá.
          </ThemedText>
          <Botao texto="Criar minha primeira meta" icone="mais" onPress={() => router.push('/nova-meta')} />
        </Cartao>
      ) : (
        ativas.map((m) => <CartaoMeta key={m.id} meta={m} />)
      )}

      {alcancadas.length > 0 && (
        <>
          <ThemedText type="smallBold" accessibilityRole="header" style={styles.secao}>
            Metas alcançadas
          </ThemedText>
          {alcancadas.map((m) => (
            <CartaoMeta key={m.id} meta={m} />
          ))}
        </>
      )}

      <Pressable
        onPress={() => router.push('/conquistas')}
        accessibilityRole="button"
        accessibilityLabel="Conquiste mais! Veja suas conquistas e ganhe XP."
        style={({ pressed }) => pressed && styles.pressionado}>
        <Cartao style={styles.conquistas}>
          <View style={[styles.trofeu, { backgroundColor: theme.accentSoft }]}>
            <Icone nome="trofeu" cor={theme.accentText} tamanho={26} />
          </View>
          <View style={styles.flex}>
            <ThemedText type="smallBold">Conquiste mais!</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Complete desafios da sua jornada e ganhe XP.
            </ThemedText>
          </View>
          <Icone nome="avancar" cor={theme.textSecondary} tamanho={16} />
        </Cartao>
      </Pressable>
    </>
  );
}

function CartaoMeta({ meta }: { meta: ProgressoMeta }) {
  const theme = useTheme();
  const degrade = useDegrade();
  const percentual = Math.floor(meta.percentual);
  const descricao = descreverMeta(meta);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/meta/[id]', params: { id: String(meta.id) } })}
      accessibilityRole="button"
      accessibilityLabel={`Meta ${meta.nome}: ${formatarCentavos(meta.atualCentavos)} de ${formatarCentavos(meta.objetivoCentavos)}, ${percentual}%. ${descricao}`}
      accessibilityHint="Abre os detalhes da meta"
      style={({ pressed }) => pressed && styles.pressionado}>
      <Cartao style={styles.meta}>
        <View
          style={[
            styles.iconeMeta,
            meta.concluida ? { backgroundColor: theme.positive } : [degrade, { boxShadow: `0 6px 16px ${theme.brilho}` }],
          ]}>
          <Icone nome={meta.concluida ? 'check' : iconeMeta(meta.nome)} cor="#FFFFFF" tamanho={26} />
        </View>
        <View style={[styles.flex, styles.textosMeta]}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {meta.nome}
          </ThemedText>
          <View style={styles.linha}>
            <ThemedText type="small" style={styles.flex}>
              {formatarCentavos(meta.atualCentavos)}
              <ThemedText type="small" themeColor="textSecondary">
                {' '}
                / {formatarCentavos(meta.objetivoCentavos)}
              </ThemedText>
            </ThemedText>
            <ThemedText type="smallBold" style={{ color: meta.concluida ? theme.positive : theme.accentText }}>
              {percentual}%
            </ThemedText>
          </View>
          <BarraProgresso percentual={meta.percentual} cor={meta.concluida ? theme.positive : undefined} altura={6} />
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {descricao}
          </ThemedText>
        </View>
      </Cartao>
    </Pressable>
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
  secao: {
    marginTop: Spacing.two,
  },
  pressionado: {
    opacity: 0.7,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconeMeta: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textosMeta: {
    gap: Spacing.one,
  },
  conquistas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  trofeu: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
