import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Botao } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { adicionarCategoria, MAX_NOME_CATEGORIA } from '@/services/categorias-service';
import { ErroValidacao } from '@/services/erros';
import type { TipoTransacao } from '@/types/financas';

type Props = {
  tipo: TipoTransacao;
  aoCriar: (id: number) => void;
  aoCancelar?: () => void;
};

/** Campo para criar uma categoria do usuário. Mostra o erro de validação logo abaixo. */
export function CampoNovaCategoria({ tipo, aoCriar, aoCancelar }: Props) {
  const theme = useTheme();
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  function criar() {
    try {
      const id = adicionarCategoria(nome, tipo);
      setNome('');
      setErro(null);
      aoCriar(id);
    } catch (e) {
      setErro(e instanceof ErroValidacao ? e.message : 'Não foi possível criar a categoria.');
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.campo, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        value={nome}
        onChangeText={(t) => {
          setNome(t);
          setErro(null);
        }}
        placeholder={tipo === 'despesa' ? 'Ex.: Pets, Academia' : 'Ex.: Aluguel recebido'}
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel={`Nome da nova categoria de ${tipo}`}
        maxLength={MAX_NOME_CATEGORIA}
        autoCapitalize="sentences"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={criar}
      />
      {erro && (
        <ThemedText type="small" style={{ color: theme.negative }} accessibilityLiveRegion="polite">
          {erro}
        </ThemedText>
      )}
      <View style={styles.botoes}>
        {aoCancelar && (
          <Botao texto="Cancelar" variante="secundario" onPress={aoCancelar} style={styles.flex} />
        )}
        <Botao texto="Criar categoria" disabled={!nome.trim()} onPress={criar} style={styles.flex} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  campo: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  botoes: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
