import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { BloqueioPremium } from '@/components/bloqueio-premium';
import { Chip } from '@/components/chip';
import { Botao, Cartao } from '@/components/tela';
import { TelaSecundaria } from '@/components/tela-secundaria';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { CATEGORIAS_ACADEMY } from '@/data/academy-conteudo';
import { useAssinatura } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import { temAcesso } from '@/services/assinatura-service';
import { ErroValidacao } from '@/services/erros';
import { criarTopico, LIMITES_FORUM, REGRAS_FORUM } from '@/services/forum-service';
import { vibrarErro, vibrarSucesso } from '@/utils/vibracao';

export default function NovoTopicoScreen() {
  const theme = useTheme();
  const plus = temAcesso('academy', useAssinatura());
  const [categoria, setCategoria] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');

  if (!plus) {
    return (
      <TelaSecundaria titulo="Novo tópico" textoVoltar="Cancelar">
        <BloqueioPremium recurso="academy" />
      </TelaSecundaria>
    );
  }

  const podePublicar =
    categoria !== null &&
    titulo.trim().length >= LIMITES_FORUM.titulo.min &&
    texto.trim().length >= LIMITES_FORUM.texto.min;

  function publicar() {
    if (!categoria) return;
    try {
      const id = criarTopico({ categoriaId: categoria, titulo, texto });
      vibrarSucesso();
      router.replace({ pathname: '/forum/[id]', params: { id: String(id) } });
    } catch (erro) {
      vibrarErro();
      Alert.alert('Não foi possível publicar', erro instanceof ErroValidacao ? erro.message : 'Tente novamente.');
    }
  }

  const estiloCampo = [styles.campo, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }];

  return (
    <TelaSecundaria
      titulo="Novo tópico"
      textoVoltar="Cancelar"
      rodape={<Botao texto="Publicar" onPress={publicar} disabled={!podePublicar} />}>
      <ThemedText type="smallBold">Tema</ThemedText>
      <View style={styles.chips} accessibilityRole="radiogroup">
        {CATEGORIAS_ACADEMY.map((c) => (
          <Chip key={c.id} texto={`${c.icone} ${c.nome}`} ativo={categoria === c.id} aoTocar={() => setCategoria(c.id)} />
        ))}
      </View>

      <ThemedText type="smallBold">Título</ThemedText>
      <TextInput
        value={titulo}
        onChangeText={setTitulo}
        placeholder="Ex.: Como vocês organizam as contas fixas?"
        placeholderTextColor={theme.textSecondary}
        maxLength={LIMITES_FORUM.titulo.max}
        accessibilityLabel="Título do tópico"
        style={estiloCampo}
      />

      <ThemedText type="smallBold">Mensagem</ThemedText>
      <TextInput
        value={texto}
        onChangeText={setTexto}
        placeholder="Conte sua dúvida ou experiência..."
        placeholderTextColor={theme.textSecondary}
        multiline
        maxLength={LIMITES_FORUM.texto.max}
        accessibilityLabel="Mensagem do tópico"
        style={[estiloCampo, styles.mensagem]}
        textAlignVertical="top"
      />
      <ThemedText type="small" themeColor="textSecondary" style={styles.contador}>
        {texto.length}/{LIMITES_FORUM.texto.max}
      </ThemedText>

      <Cartao>
        <ThemedText type="smallBold">Antes de publicar</ThemedText>
        {REGRAS_FORUM.map((r) => (
          <ThemedText key={r} type="small" themeColor="textSecondary">
            • {r}
          </ThemedText>
        ))}
      </Cartao>
    </TelaSecundaria>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  campo: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  mensagem: {
    minHeight: 140,
  },
  contador: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.two,
  },
});
