import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  CartaoAtalho,
  CartaoCategoria,
  CartaoCurso,
  ItemRecente,
  TituloSecao,
} from '@/components/academy-cartoes';
import { Cartao } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAcademy } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import { calcularProgressoCurso } from '@/services/academy-service';

const NENHUM = new Set<string>();

/** Trust Academy: meus cursos, categorias, conteúdos recentes e fórum. (Só para assinantes Plus.) */
export function PainelAcademy() {
  const theme = useTheme();
  const academy = useAcademy();

  return (
    <ScrollView contentContainerStyle={styles.conteudo}>
      {/* 1. Meus cursos */}
      <TituloSecao titulo="Meus cursos" />
      {academy.meusCursos.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carrossel}
          style={styles.sangria}>
          {academy.meusCursos.map((p) => (
            <CartaoCurso key={p.curso.id} progresso={p} />
          ))}
        </ScrollView>
      ) : (
        <>
          <Cartao>
            <ThemedText type="smallBold">Escolha seu primeiro curso</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Cursos curtos, com aulas de cerca de 3 minutos e uma pergunta no fim. Comece por uma
              sugestão ou explore as categorias abaixo.
            </ThemedText>
          </Cartao>
          {academy.recomendados.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carrossel}
              style={styles.sangria}>
              {academy.recomendados.map((r) => (
                <CartaoCurso
                  key={r.curso.id}
                  progresso={calcularProgressoCurso(r.curso, NENHUM, NENHUM)}
                  motivo={r.motivo}
                />
              ))}
            </ScrollView>
          )}
        </>
      )}

      {/* 2. Categorias */}
      <TituloSecao titulo="Categorias" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carrossel}
        style={styles.sangria}>
        {academy.categorias.map((c) => (
          <CartaoCategoria key={c.id} categoria={c} />
        ))}
      </ScrollView>

      {/* 3. Recentes */}
      <TituloSecao titulo="Recentes" />
      <View style={styles.lista}>
        {academy.recentes.map((r) => (
          <ItemRecente key={r.aula.id} recente={r} />
        ))}
      </View>

      {/* 4. Comunidade */}
      <TituloSecao titulo="Comunidade" />
      <CartaoAtalho
        icone="💬"
        titulo="Fórum"
        subtitulo={`${academy.totalTopicos} ${academy.totalTopicos === 1 ? 'tópico' : 'tópicos'} · dúvidas e experiências`}
        aoTocar={() => router.push('/forum')}
      />

      <View style={[styles.dica, { backgroundColor: theme.accentSoft }]} accessible>
        <ThemedText type="smallBold" style={{ color: theme.accentText }}>
          Dica do dia
        </ThemedText>
        <ThemedText>{academy.dica}</ThemedText>
      </View>

      <CartaoAtalho
        icone="📖"
        titulo="Glossário"
        subtitulo={`${academy.totalConceitos} termos explicados de forma simples`}
        aoTocar={() => router.push('/academy/glossario')}
        cor={theme.backgroundSelected}
      />

      <ThemedText type="small" themeColor="textSecondary" style={styles.rodape}>
        Conteúdo educativo. Não é recomendação de investimento.
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  // Os carrosséis vão até a borda da tela, mas o primeiro cartão fica alinhado com o resto.
  sangria: {
    marginHorizontal: -Spacing.three,
    flexGrow: 0,
  },
  carrossel: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  lista: {
    gap: Spacing.two,
  },
  dica: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  rodape: {
    textAlign: 'center',
  },
});
