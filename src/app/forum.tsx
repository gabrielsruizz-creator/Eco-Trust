import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BloqueioPremium } from '@/components/bloqueio-premium';
import { Chip } from '@/components/chip';
import { Botao, Cartao } from '@/components/tela';
import { TelaSecundaria } from '@/components/tela-secundaria';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAssinatura, useForum } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import { temAcesso } from '@/services/assinatura-service';
import type { TopicoForum } from '@/repositories/forum-repository';
import type { CategoriaAcademy } from '@/data/academy-conteudo';
import { tempoRelativo } from '@/utils/datas';

/** Fórum da Trust Academy (protótipo local: os tópicos ficam neste aparelho). */
export default function ForumScreen() {
  const theme = useTheme();
  const [categoria, setCategoria] = useState<string | null>(null);
  const { topicos, categorias } = useForum(categoria);
  const plus = temAcesso('academy', useAssinatura());

  if (!plus) {
    return (
      <TelaSecundaria titulo="Fórum">
        <BloqueioPremium recurso="academy" />
      </TelaSecundaria>
    );
  }

  return (
    <TelaSecundaria
      titulo="Fórum"
      rodape={<Botao texto="+ Novo tópico" onPress={() => router.push('/forum/novo')} />}>
      <View style={[styles.aviso, { backgroundColor: theme.accentSoft }]} accessible>
        <ThemedText type="smallBold" style={{ color: theme.accentText }}>
          Prévia do fórum
        </ThemedText>
        <ThemedText type="small">
          Por enquanto, o que você publica fica só neste aparelho. Os tópicos marcados como
          &quot;Exemplo&quot; mostram como a comunidade vai funcionar.
        </ThemedText>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sangria}>
        <View style={styles.chips} accessibilityRole="radiogroup">
          <Chip texto="Todos" ativo={categoria === null} aoTocar={() => setCategoria(null)} />
          {categorias.map((c) => (
            <Chip key={c.id} texto={`${c.icone} ${c.nome}`} ativo={categoria === c.id} aoTocar={() => setCategoria(c.id)} />
          ))}
        </View>
      </ScrollView>

      {topicos.length === 0 ? (
        <Cartao>
          <ThemedText type="smallBold">Nenhum tópico neste tema ainda</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Que tal começar a conversa com uma dúvida ou uma experiência sua?
          </ThemedText>
        </Cartao>
      ) : (
        topicos.map((t) => (
          <CartaoTopico key={t.id} topico={t} categoria={categorias.find((c) => c.id === t.categoriaId)} />
        ))
      )}
    </TelaSecundaria>
  );
}

function CartaoTopico({ topico, categoria }: { topico: TopicoForum; categoria?: CategoriaAcademy }) {
  const theme = useTheme();
  const respostas = topico.respostas === 1 ? '1 resposta' : `${topico.respostas} respostas`;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/forum/[id]', params: { id: String(topico.id) } })}
      accessibilityRole="button"
      accessibilityLabel={`${topico.titulo}. Por ${topico.autor}, ${tempoRelativo(topico.criadoEm)}. ${respostas}.${topico.exemplo ? ' Tópico de exemplo.' : ''}`}
      style={({ pressed }) => pressed && styles.pressionado}>
      <Cartao>
        <View style={styles.linha}>
          {categoria && (
            <View style={[styles.tag, { backgroundColor: categoria.cor }]}>
              <ThemedText type="small" style={styles.tagTexto}>
                {categoria.nome}
              </ThemedText>
            </View>
          )}
          {topico.exemplo && (
            <View style={[styles.tag, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.tagFonte}>
                Exemplo
              </ThemedText>
            </View>
          )}
          {topico.meu && (
            <View style={[styles.tag, { backgroundColor: theme.accentSoft }]}>
              <ThemedText type="small" style={[styles.tagFonte, { color: theme.accentText }]}>
                Seu tópico
              </ThemedText>
            </View>
          )}
        </View>
        <ThemedText type="smallBold">{topico.titulo}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {topico.texto}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {topico.autor} · {tempoRelativo(topico.ultimaAtividade)} · 💬 {respostas}
        </ThemedText>
      </Cartao>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  aviso: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  sangria: {
    marginHorizontal: -Spacing.three,
    flexGrow: 0,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  linha: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  tag: {
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  tagTexto: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 20,
    fontWeight: 700,
  },
  tagFonte: {
    fontSize: 12,
    lineHeight: 20,
    fontWeight: 700,
  },
  pressionado: {
    opacity: 0.7,
  },
});
