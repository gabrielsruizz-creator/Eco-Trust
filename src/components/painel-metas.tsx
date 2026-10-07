import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { BarraProgresso } from '@/components/barra-progresso';
import { Botao, Cartao } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useMetas } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import { descreverMeta } from '@/services/metas-service';
import type { ProgressoMeta } from '@/types/financas';
import { formatarCentavos } from '@/utils/moeda';

/** Lista de metas, mostrada dentro da aba Planejar. */
export function PainelMetas() {
  const metas = useMetas();
  const ativas = metas.filter((m) => !m.concluida);
  const alcancadas = metas.filter((m) => m.concluida);

  if (metas.length === 0) {
    return (
      <Cartao>
        <ThemedText type="smallBold">Transforme economia em conquistas</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Crie metas como uma reserva de emergência, uma viagem ou um carro. O EcoTrust mostra seu
          progresso e quanto guardar por mês para chegar lá.
        </ThemedText>
        <Botao texto="+ Criar minha primeira meta" onPress={() => router.push('/nova-meta')} />
      </Cartao>
    );
  }

  return (
    <>
      {ativas.map((m) => (
        <CartaoMeta key={m.id} meta={m} />
      ))}
      <Botao texto="+ Nova meta" variante="secundario" onPress={() => router.push('/nova-meta')} />

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
    </>
  );
}

function CartaoMeta({ meta }: { meta: ProgressoMeta }) {
  const theme = useTheme();
  const percentual = Math.floor(meta.percentual);
  const descricao = descreverMeta(meta);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/meta/[id]', params: { id: String(meta.id) } })}
      accessibilityRole="button"
      accessibilityLabel={`Meta ${meta.nome}: ${formatarCentavos(meta.atualCentavos)} de ${formatarCentavos(meta.objetivoCentavos)}, ${percentual}%. ${descricao}`}
      accessibilityHint="Abre os detalhes da meta"
      style={({ pressed }) => pressed && styles.pressionado}>
      <Cartao>
        <View style={styles.linha}>
          <ThemedText type="smallBold" style={styles.flex} numberOfLines={1}>
            {meta.nome}
          </ThemedText>
          <ThemedText type="smallBold" style={{ color: meta.concluida ? theme.positive : theme.accent }}>
            {percentual}%
          </ThemedText>
        </View>
        <ThemedText>
          {formatarCentavos(meta.atualCentavos)}{' '}
          <ThemedText themeColor="textSecondary">/ {formatarCentavos(meta.objetivoCentavos)}</ThemedText>
        </ThemedText>
        <BarraProgresso
          percentual={meta.percentual}
          cor={meta.concluida ? theme.positive : theme.accent}
          altura={10}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {descricao}
        </ThemedText>
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
});
