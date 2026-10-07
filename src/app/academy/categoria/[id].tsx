import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { abrirCurso } from '@/components/academy-cartoes';
import { BarraProgresso } from '@/components/barra-progresso';
import { BloqueioPremium } from '@/components/bloqueio-premium';
import { Botao, Cartao } from '@/components/tela';
import { TelaSecundaria } from '@/components/tela-secundaria';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAssinatura, useCursosDaCategoria } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import { temAcesso } from '@/services/assinatura-service';

const BRANCO = '#FFFFFF';

export default function CategoriaScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dados = useCursosDaCategoria(String(id));
  const plus = temAcesso('academy', useAssinatura());

  if (!plus) {
    return (
      <TelaSecundaria titulo="Categoria">
        <BloqueioPremium recurso="academy" />
      </TelaSecundaria>
    );
  }

  if (!dados) {
    return (
      <TelaSecundaria titulo="Categoria">
        <ThemedText themeColor="textSecondary">Categoria não encontrada.</ThemedText>
        <Botao texto="Voltar" onPress={() => router.back()} />
      </TelaSecundaria>
    );
  }

  const { categoria, cursos } = dados;

  return (
    <TelaSecundaria titulo={categoria.nome}>
      <View style={[styles.capa, { backgroundColor: categoria.cor }]}>
        <ThemedText style={styles.icone}>{categoria.icone}</ThemedText>
        <ThemedText style={[styles.titulo, { color: BRANCO }]} accessibilityRole="header">
          {categoria.nome}
        </ThemedText>
        <ThemedText type="small" style={{ color: BRANCO }}>
          {categoria.descricao}
        </ThemedText>
      </View>

      <ThemedText type="smallBold" accessibilityRole="header">
        {cursos.length === 1 ? '1 curso' : `${cursos.length} cursos`}
      </ThemedText>
      {cursos.map((p) => (
        <Pressable
          key={p.curso.id}
          onPress={() => abrirCurso(p.curso.id)}
          accessibilityRole="button"
          accessibilityLabel={`${p.curso.titulo}. ${p.curso.resumo}. ${p.concluidas} de ${p.total} aulas concluídas.`}
          style={({ pressed }) => pressed && styles.pressionado}>
          <Cartao>
            <View style={styles.linha}>
              <ThemedText type="smallBold" style={styles.flex}>
                {p.curso.titulo}
              </ThemedText>
              {p.noMeusCursos && (
                <ThemedText type="small" style={{ color: theme.accentText }}>
                  Meus cursos
                </ThemedText>
              )}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {p.curso.resumo}
            </ThemedText>
            <BarraProgresso percentual={p.percentual} cor={categoria.cor} altura={6} />
            <ThemedText type="small" themeColor="textSecondary">
              {p.concluido ? '✓ Concluído' : `${p.concluidas} de ${p.total} aulas`} ·{' '}
              {p.aulas.reduce((soma, a) => soma + a.minutos, 0)} min no total
            </ThemedText>
          </Cartao>
        </Pressable>
      ))}
    </TelaSecundaria>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  capa: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.one,
  },
  icone: {
    fontSize: 36,
    lineHeight: 44,
  },
  titulo: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: 700,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pressionado: {
    opacity: 0.7,
  },
});
