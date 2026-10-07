/**
 * Cartões da Trust Academy: cursos (com anel de progresso), categorias, aulas recentes e fórum.
 * Os cartões coloridos usam a cor da categoria com texto branco (contraste ≥ 5:1 em todas).
 */

import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnelProgresso } from '@/components/anel-progresso';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { AulaRecente, ProgressoCurso, ResumoCategoria } from '@/services/academy-service';
import { formatarDataCurta } from '@/utils/datas';

const BRANCO = '#FFFFFF';
const BRANCO_SUAVE = 'rgba(255,255,255,0.85)';
const TRILHO_SOBRE_COR = 'rgba(255,255,255,0.3)';

export const LARGURA_CARTAO_CURSO = 248;

export function abrirCurso(id: string) {
  router.push({ pathname: '/academy/curso/[id]', params: { id } });
}

export function abrirAula(id: string) {
  router.push({ pathname: '/academy/aula/[id]', params: { id } });
}

function textoAcao(p: ProgressoCurso) {
  if (p.concluido) return 'Concluído ✓';
  if (p.concluidas === 0) return 'Iniciar';
  return 'Continuar';
}

/** Título de seção com uma ação opcional à direita (ex.: "Ver todos"). */
export function TituloSecao({ titulo, acao }: { titulo: string; acao?: { texto: string; aoTocar: () => void } }) {
  const theme = useTheme();
  return (
    <View style={styles.tituloSecao}>
      <ThemedText type="smallBold" accessibilityRole="header" style={styles.flex}>
        {titulo}
      </ThemedText>
      {acao && (
        <Pressable onPress={acao.aoTocar} accessibilityRole="button" hitSlop={12}>
          <ThemedText type="smallBold" style={{ color: theme.accentText }}>
            {acao.texto}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

/** Cartão grande e colorido de um curso (usado em "Meus cursos" e nas sugestões). */
export function CartaoCurso({ progresso, motivo }: { progresso: ProgressoCurso; motivo?: string }) {
  const { curso, categoria } = progresso;
  return (
    <Pressable
      onPress={() => abrirCurso(curso.id)}
      accessibilityRole="button"
      accessibilityLabel={`Curso ${curso.titulo}, ${categoria.nome}. ${progresso.concluidas} de ${progresso.total} aulas concluídas.${motivo ? ` Sugerido porque: ${motivo}` : ''}`}
      style={({ pressed }) => [styles.cursoCartao, { backgroundColor: categoria.cor }, pressed && styles.pressionado]}>
      <View style={styles.cursoTopo}>
        <ThemedText type="small" style={[styles.etiqueta, { color: BRANCO_SUAVE }]}>
          {categoria.icone} {categoria.nome}
        </ThemedText>
        <ThemedText style={[styles.cursoTitulo, { color: BRANCO }]} numberOfLines={2}>
          {curso.titulo}
        </ThemedText>
        {motivo && (
          <ThemedText type="small" style={{ color: BRANCO_SUAVE }} numberOfLines={2}>
            {motivo}
          </ThemedText>
        )}
      </View>
      <View style={styles.cursoRodape}>
        <AnelProgresso
          percentual={progresso.percentual}
          cor={BRANCO}
          corTrilho={TRILHO_SOBRE_COR}
          corTexto={BRANCO}
          tamanho={56}
          espessura={6}
        />
        <View style={styles.flex}>
          <ThemedText type="smallBold" style={{ color: BRANCO }}>
            {textoAcao(progresso)}
          </ThemedText>
          <ThemedText type="small" style={{ color: BRANCO_SUAVE }}>
            {progresso.concluidas} de {progresso.total} aulas
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

export function CartaoCategoria({ categoria }: { categoria: ResumoCategoria }) {
  const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/academy/categoria/[id]', params: { id: categoria.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Categoria ${categoria.nome}: ${plural(categoria.cursos, 'curso', 'cursos')}, ${plural(categoria.aulas, 'aula', 'aulas')}`}
      style={({ pressed }) => [styles.categoriaCartao, { backgroundColor: categoria.cor }, pressed && styles.pressionado]}>
      <ThemedText style={styles.categoriaIcone}>{categoria.icone}</ThemedText>
      <View>
        <ThemedText style={[styles.categoriaNome, { color: BRANCO }]} numberOfLines={2}>
          {categoria.nome}
        </ThemedText>
        <ThemedText type="small" style={{ color: BRANCO_SUAVE }}>
          {plural(categoria.cursos, 'curso', 'cursos')} · {plural(categoria.aulas, 'aula', 'aulas')}
        </ThemedText>
      </View>
    </Pressable>
  );
}

/** Linha de uma aula recente: miniatura com a cor do tema, título, resumo e data. */
export function ItemRecente({ recente }: { recente: AulaRecente }) {
  const theme = useTheme();
  const { aula, curso, categoria, concluida } = recente;
  return (
    <Pressable
      onPress={() => abrirAula(aula.id)}
      accessibilityRole="button"
      accessibilityLabel={`${aula.titulo}. ${aula.resumo}. Curso ${curso.titulo}, ${aula.minutos} minutos.${concluida ? ' Concluída.' : ''}`}
      style={({ pressed }) => [
        styles.recente,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && styles.pressionado,
      ]}>
      <View style={[styles.miniatura, { backgroundColor: categoria.cor }]}>
        <ThemedText style={styles.miniaturaIcone}>{categoria.icone}</ThemedText>
        <View style={styles.selo}>
          <ThemedText type="small" style={[styles.seloTexto, { color: BRANCO }]}>
            {aula.minutos} min
          </ThemedText>
        </View>
      </View>
      <View style={[styles.flex, styles.recenteTexto]}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {aula.titulo}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {aula.resumo}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.etiqueta}>
          {concluida ? '✓ Concluída · ' : ''}
          {formatarDataCurta(aula.publicadaEm)}
        </ThemedText>
      </View>
    </Pressable>
  );
}

/** Atalho grande (ex.: Fórum, Glossário) com ícone num quadrado colorido. */
export function CartaoAtalho({
  icone,
  titulo,
  subtitulo,
  aoTocar,
  cor,
}: {
  icone: ReactNode;
  titulo: string;
  subtitulo: string;
  aoTocar: () => void;
  cor?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. ${subtitulo}`}
      style={({ pressed }) => [
        styles.atalho,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && styles.pressionado,
      ]}>
      <View style={[styles.atalhoIcone, { backgroundColor: cor ?? theme.accent }]}>
        <ThemedText style={styles.miniaturaIcone}>{icone}</ThemedText>
      </View>
      <View style={styles.flex}>
        <ThemedText style={styles.atalhoTitulo}>{titulo}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {subtitulo}
        </ThemedText>
      </View>
      <ThemedText themeColor="textSecondary">›</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  pressionado: {
    opacity: 0.8,
  },
  tituloSecao: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 24,
  },
  etiqueta: {
    fontSize: 12,
    lineHeight: 16,
  },
  cursoCartao: {
    width: LARGURA_CARTAO_CURSO,
    minHeight: 176,
    borderRadius: Spacing.four,
    padding: Spacing.three,
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  cursoTopo: {
    gap: Spacing.one,
  },
  cursoTitulo: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 700,
  },
  cursoRodape: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  categoriaCartao: {
    width: 168,
    minHeight: 132,
    borderRadius: Spacing.four,
    padding: Spacing.three,
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  categoriaIcone: {
    fontSize: 28,
    lineHeight: 34,
  },
  categoriaNome: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: 700,
  },
  recente: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
  },
  recenteTexto: {
    gap: Spacing.half,
    paddingVertical: Spacing.one,
  },
  miniatura: {
    width: 88,
    minHeight: 88,
    borderRadius: Spacing.two + Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniaturaIcone: {
    fontSize: 30,
    lineHeight: 38,
  },
  selo: {
    position: 'absolute',
    left: Spacing.one,
    bottom: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  seloTexto: {
    fontSize: 11,
    lineHeight: 18,
    fontWeight: 700,
  },
  atalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
  },
  atalhoIcone: {
    width: 56,
    height: 56,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atalhoTitulo: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: 700,
  },
});
