import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icone, type NomeIcone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type AcaoTopo = { icone: NomeIcone; rotulo: string; aoTocar: () => void };

/** Estrutura das abas: título grande (com subtítulo e ações opcionais) e conteúdo rolável. */
export function Tela({
  titulo,
  subtitulo,
  acoes,
  topo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  acoes?: AcaoTopo[];
  /** Substitui o título padrão (ex.: saudação com avatar no Início) */
  topo?: ReactNode;
  children: ReactNode;
}) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          {topo ?? (
            <View style={styles.cabecalho}>
              <View style={styles.flex}>
                <ThemedText style={styles.titulo} accessibilityRole="header">
                  {titulo}
                </ThemedText>
                {subtitulo && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {subtitulo}
                  </ThemedText>
                )}
              </View>
              {acoes?.map((a) => (
                <BotaoIcone key={a.rotulo} {...a} />
              ))}
            </View>
          )}
          {children}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** Botão redondo só com ícone (ações do topo). */
export function BotaoIcone({ icone, rotulo, aoTocar }: AcaoTopo) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      hitSlop={6}
      style={({ pressed }) => [
        styles.botaoIcone,
        { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement, borderColor: theme.border },
      ]}>
      <Icone nome={icone} cor={theme.text} tamanho={20} />
    </Pressable>
  );
}

/** Cartão com efeito de vidro: fundo do elemento, borda fina e um leve brilho no topo. */
export function Cartao({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.cartao,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          experimental_backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0))',
        },
        style,
      ]}>
      {children}
    </View>
  );
}

/** Fundo em degradê da marca (cartão de saldo, botões principais, barras). */
export function useDegrade(angulo = 135): ViewStyle {
  const theme = useTheme();
  return {
    backgroundColor: theme.accent,
    experimental_backgroundImage: `linear-gradient(${angulo}deg, ${theme.gradienteInicio}, ${theme.gradienteFim})`,
  };
}

type BotaoProps = PressableProps & {
  texto: string;
  /** "perigo" é para ações destrutivas, como excluir */
  variante?: 'primario' | 'secundario' | 'perigo';
  selecionado?: boolean;
  icone?: NomeIcone;
};

export function Botao({ texto, variante = 'primario', selecionado, disabled, style, icone, ...rest }: BotaoProps) {
  const theme = useTheme();
  const degrade = useDegrade(90);
  const primario = variante === 'primario' || selecionado;
  const perigo = variante === 'perigo';
  const corTexto = primario ? theme.onAccent : perigo ? theme.negative : theme.text;

  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, selected: selecionado }}
      style={(state) => [
        styles.botao,
        primario
          ? [degrade, !disabled && { boxShadow: `0 6px 18px ${theme.brilho}` }]
          : perigo
            ? { backgroundColor: theme.negativeSoft }
            : { backgroundColor: theme.backgroundSelected, borderColor: theme.border, borderWidth: StyleSheet.hairlineWidth },
        (state.pressed || disabled) && styles.apagado,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      {icone && <Icone nome={icone} cor={corTexto} tamanho={18} />}
      <ThemedText type="smallBold" style={{ color: corTexto }}>
        {texto}
      </ThemedText>
    </Pressable>
  );
}

/** Seletor de 2 a 4 opções lado a lado (ex.: Todos · Receitas · Despesas). */
export function Segmentado<T extends string>({
  opcoes,
  valor,
  aoMudar,
  rotulo,
}: {
  opcoes: { valor: T; texto: string }[];
  valor: T;
  aoMudar: (v: T) => void;
  rotulo: string;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={rotulo}
      style={[styles.segmentado, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <Pressable
            key={o.valor}
            onPress={() => aoMudar(o.valor)}
            accessibilityRole="radio"
            accessibilityState={{ checked: ativo }}
            style={[styles.segmento, ativo && { backgroundColor: theme.text }]}>
            <ThemedText type="smallBold" style={{ color: ativo ? theme.background : theme.textSecondary }}>
              {o.texto}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Ícone dentro de um círculo colorido (categorias, metas, itens de lista). */
export function IconeCirculo({
  icone,
  cor,
  tamanho = 40,
  solido = false,
}: {
  icone: NomeIcone;
  cor: string;
  tamanho?: number;
  /** true: círculo cheio com ícone branco; false: fundo suave com ícone colorido */
  solido?: boolean;
}) {
  return (
    <View
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: tamanho / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: solido ? cor : `${cor}2E`,
      }}>
      <Icone nome={icone} cor={solido ? '#FFFFFF' : cor} tamanho={Math.round(tamanho * 0.5)} />
    </View>
  );
}

/** Linha de lista: ícone, título, subtítulo, valor à direita e seta. */
export function LinhaLista({
  icone,
  corIcone,
  titulo,
  subtitulo,
  direita,
  aoTocar,
  rotuloAcessivel,
  separador,
}: {
  icone?: NomeIcone;
  corIcone?: string;
  titulo: string;
  subtitulo?: string;
  direita?: ReactNode;
  aoTocar?: () => void;
  rotuloAcessivel?: string;
  separador?: boolean;
}) {
  const theme = useTheme();
  const conteudo = (pressionado: boolean) => (
    <View
      style={[
        styles.linhaLista,
        separador && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
        pressionado && styles.apagado,
      ]}>
      {icone && (corIcone ? <IconeCirculo icone={icone} cor={corIcone} /> : <Icone nome={icone} cor={theme.textSecondary} />)}
      <View style={styles.flex}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {titulo}
        </ThemedText>
        {subtitulo && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {subtitulo}
          </ThemedText>
        )}
      </View>
      {direita}
      {aoTocar && <Icone nome="avancar" cor={theme.textSecondary} tamanho={16} />}
    </View>
  );
  if (!aoTocar) return conteudo(false);
  return (
    <Pressable onPress={aoTocar} accessibilityRole="button" accessibilityLabel={rotuloAcessivel ?? titulo}>
      {({ pressed }) => conteudo(pressed)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  flex: {
    flex: 1,
  },
  conteudo: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  titulo: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: 700,
  },
  botaoIcone: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartao: {
    padding: Spacing.three,
    borderRadius: Spacing.four - Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  botao: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  apagado: {
    opacity: 0.6,
  },
  segmentado: {
    flexDirection: 'row',
    padding: Spacing.one,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segmento: {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linhaLista: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 56,
    paddingVertical: Spacing.two,
  },
});
