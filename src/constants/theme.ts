/**
 * Cores, espaçamentos e tipografia do EcoTrust (tema escuro padrão e claro opcional).
 * Os cartões podem ser de "vidro" (Liquid Glass) ou de "papel" (sólidos): escolha nas Preferências.
 */

import { Platform } from 'react-native';

export const Colors = {
  // Paleta "Papel e tinta": creme e preto no claro, grafite e creme no escuro, poucos tons e sem
  // degradês coloridos (referência: interfaces editoriais em preto e branco + Liquid Glass da Apple).
  // A cor vem dos gráficos e das situações (positivo/negativo); o resto é tinta sobre papel.
  // Contrastes (WCAG AA): text, textSecondary, accentText e onAccent ≥ 4,5:1 nos dois temas.
  light: {
    text: '#16150F',
    background: '#F3EEE4',
    backgroundElement: '#FFFDF8',
    backgroundSelected: '#E9E2D4',
    border: '#E2DACB',
    textSecondary: '#6B6458',
    /** Preenchimento de botões e elementos ativos: tinta */
    accent: '#16150F',
    /** Texto/ícone sobre o accent */
    onAccent: '#FFFDF8',
    /** Links e textos de destaque */
    accentText: '#16150F',
    /** Elementos decorativos (anéis, ícones em círculo) */
    brand: '#16150F',
    positive: '#2E7A4B',
    negative: '#B23F2C',
    accentSoft: '#E9E2D4',
    positiveSoft: '#E3EFE4',
    negativeSoft: '#F6E3DD',
    /** Cartões de destaque (saldo, Impostômetro): tinta com texto claro, nos dois temas */
    heroi: '#16150F',
    gradienteInicio: '#16150F',
    gradienteFim: '#2A2820',
    /** Sombra suave atrás de elementos de destaque */
    brilho: 'rgba(22, 21, 15, 0.14)',
    /** Vidro (Liquid Glass simulado onde o efeito nativo não existe) */
    vidro: 'rgba(255, 253, 248, 0.58)',
    vidroBorda: 'rgba(255, 255, 255, 0.85)',
    vidroBrilho: 'rgba(255, 255, 255, 0.55)',
    /** Manchas de cor do fundo, que dão o que o vidro refletir */
    fundoMancha1: 'rgba(214, 186, 140, 0.55)',
    fundoMancha2: 'rgba(160, 182, 160, 0.45)',
    fundoMancha3: 'rgba(222, 160, 136, 0.35)',
    // Gráficos: cores de situação (sempre com ícone + texto, nunca sozinhas) e linhas finas
    statusGood: '#0ca30c',
    statusWarning: '#fab219',
    statusCritical: '#d03b3b',
    chartGrid: '#E4DCCC',
    chartBaseline: '#C9BFAD',
  },
  dark: {
    text: '#F3EEE4',
    background: '#0F0F0D',
    backgroundElement: '#1B1A17',
    backgroundSelected: '#2A2925',
    border: '#2E2C27',
    textSecondary: '#A9A293',
    accent: '#F3EEE4',
    onAccent: '#16150F',
    accentText: '#F3EEE4',
    brand: '#F3EEE4',
    positive: '#6FCF97',
    negative: '#F0907D',
    accentSoft: '#2A2925',
    positiveSoft: '#14271C',
    negativeSoft: '#2E1915',
    heroi: '#26241F',
    gradienteInicio: '#26241F',
    gradienteFim: '#34312A',
    brilho: 'rgba(0, 0, 0, 0.45)',
    vidro: 'rgba(40, 38, 33, 0.55)',
    vidroBorda: 'rgba(255, 255, 255, 0.14)',
    vidroBrilho: 'rgba(255, 255, 255, 0.08)',
    fundoMancha1: 'rgba(150, 118, 70, 0.40)',
    fundoMancha2: 'rgba(70, 104, 84, 0.38)',
    fundoMancha3: 'rgba(140, 74, 58, 0.30)',
    statusGood: '#0ca30c',
    statusWarning: '#fab219',
    statusCritical: '#d03b3b',
    chartGrid: '#2B2925',
    chartBaseline: '#423F37',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Cores de fundo do avatar (todas com bom contraste para texto branco). */
export const AvatarColors = ['#16150F', '#3D5A80', '#2E7A4B', '#A0522D', '#8C3B5A', '#2F6F6A'] as const;

/**
 * Cores para séries de gráficos (identidade de cada categoria), sempre nesta ordem.
 * Ordem validada para daltonismo entre vizinhas. Nunca gerar uma 9ª cor: agrupe em "Outras".
 */
export const SeriesColors = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
  /** Cor neutra para a fatia "Outras" */
  outras: { light: '#898781', dark: '#898781' },
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
