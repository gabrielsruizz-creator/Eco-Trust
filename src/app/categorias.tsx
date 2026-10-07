import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { CampoNovaCategoria } from '@/components/campo-nova-categoria';
import { Chip } from '@/components/chip';
import { Botao, Cartao } from '@/components/tela';
import { TelaSecundaria } from '@/components/tela-secundaria';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCategorias } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import {
  alterarNomeCategoria,
  excluirCategoria,
  MAX_NOME_CATEGORIA,
} from '@/services/categorias-service';
import { ErroValidacao } from '@/services/erros';
import type { Categoria, TipoTransacao } from '@/types/financas';

export default function CategoriasScreen() {
  const [tipo, setTipo] = useState<TipoTransacao>('despesa');
  const [criando, setCriando] = useState(false);
  const categorias = useCategorias(tipo);
  const minhas = categorias.filter((c) => !c.padrao);
  const padrao = categorias.filter((c) => c.padrao);
  const nomeTipo = tipo === 'despesa' ? 'despesa' : 'receita';

  function trocarTipo(novo: TipoTransacao) {
    setTipo(novo);
    setCriando(false);
  }

  return (
    <TelaSecundaria titulo="Categorias">
      <View style={styles.chips} accessibilityRole="radiogroup">
        <Chip texto="Despesas" ativo={tipo === 'despesa'} aoTocar={() => trocarTipo('despesa')} />
        <Chip texto="Receitas" ativo={tipo === 'receita'} aoTocar={() => trocarTipo('receita')} />
      </View>

      <ThemedText type="smallBold" accessibilityRole="header">
        Suas categorias
      </ThemedText>
      <Cartao>
        {minhas.length === 0 && !criando && (
          <ThemedText type="small" themeColor="textSecondary">
            Você ainda não criou categorias de {nomeTipo}.
          </ThemedText>
        )}
        {minhas.map((c) => (
          <LinhaCategoria key={c.id} categoria={c} />
        ))}
        {criando ? (
          <CampoNovaCategoria
            tipo={tipo}
            aoCriar={() => setCriando(false)}
            aoCancelar={() => setCriando(false)}
          />
        ) : (
          <Botao texto="+ Nova categoria" variante="secundario" onPress={() => setCriando(true)} />
        )}
      </Cartao>

      <ThemedText type="smallBold" accessibilityRole="header">
        Padrão do EcoTrust
      </ThemedText>
      <View style={styles.chips}>
        {padrao.map((c) => (
          <ThemedView key={c.id} type="backgroundElement" style={styles.etiqueta}>
            <ThemedText type="small">{c.nome}</ThemedText>
          </ThemedView>
        ))}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        As categorias padrão não podem ser alteradas. Uma categoria sua só pode ser excluída se
        não tiver lançamentos.
      </ThemedText>
    </TelaSecundaria>
  );
}

function LinhaCategoria({ categoria }: { categoria: Categoria }) {
  const theme = useTheme();
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(categoria.nome);
  const [erro, setErro] = useState<string | null>(null);

  function salvar() {
    try {
      alterarNomeCategoria(categoria.id, nome);
      setEditando(false);
      setErro(null);
    } catch (e) {
      setErro(e instanceof ErroValidacao ? e.message : 'Não foi possível renomear.');
    }
  }

  function confirmarExclusao() {
    Alert.alert('Excluir categoria', `Excluir "${categoria.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          try {
            excluirCategoria(categoria.id);
          } catch (e) {
            Alert.alert(
              'Não foi possível excluir',
              e instanceof ErroValidacao ? e.message : 'Tente novamente.',
            );
          }
        },
      },
    ]);
  }

  if (editando) {
    return (
      <View style={styles.edicao}>
        <TextInput
          style={[styles.campo, { color: theme.text, backgroundColor: theme.background }]}
          value={nome}
          onChangeText={(t) => {
            setNome(t);
            setErro(null);
          }}
          accessibilityLabel={`Novo nome para ${categoria.nome}`}
          maxLength={MAX_NOME_CATEGORIA}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={salvar}
        />
        {erro && (
          <ThemedText type="small" style={{ color: theme.negative }} accessibilityLiveRegion="polite">
            {erro}
          </ThemedText>
        )}
        <View style={styles.botoes}>
          <Botao
            texto="Cancelar"
            variante="secundario"
            style={styles.flex}
            onPress={() => {
              setNome(categoria.nome);
              setErro(null);
              setEditando(false);
            }}
          />
          <Botao texto="Salvar" style={styles.flex} disabled={!nome.trim()} onPress={salvar} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.linha}>
      <ThemedText style={styles.flex}>{categoria.nome}</ThemedText>
      <AcaoTexto texto="Renomear" rotulo={`Renomear ${categoria.nome}`} aoTocar={() => setEditando(true)} />
      <AcaoTexto
        texto="Excluir"
        rotulo={`Excluir ${categoria.nome}`}
        cor={theme.negative}
        aoTocar={confirmarExclusao}
      />
    </View>
  );
}

function AcaoTexto({
  texto,
  rotulo,
  aoTocar,
  cor,
}: {
  texto: string;
  rotulo: string;
  aoTocar: () => void;
  cor?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      hitSlop={8}
      style={({ pressed }) => pressed && styles.pressionado}>
      <ThemedText type="smallBold" style={{ color: cor ?? theme.accent }}>
        {texto}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  etiqueta: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  edicao: {
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
  pressionado: {
    opacity: 0.6,
  },
});
