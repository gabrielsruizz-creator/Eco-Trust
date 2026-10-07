import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormularioLancamento } from '@/components/formulario-lancamento';
import { Botao } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTransacao } from '@/hooks/use-dados';
import { editarTransacao } from '@/services/transacoes-service';

export default function EditarLancamentoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const transacao = useTransacao(Number(id));

  if (!transacao) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.vazio}>
          <ThemedText themeColor="textSecondary">Este lançamento não existe mais.</ThemedText>
          <Botao texto="Voltar" onPress={() => router.back()} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <FormularioLancamento
      titulo="Editar lançamento"
      inicial={transacao}
      aoSalvar={(dados) => editarTransacao(transacao.id, dados)}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  vazio: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
});
