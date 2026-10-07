/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export const Colors = {
  // Paleta "Verde confiança": verde EcoTrust + azul-marinho. Contrastes conferidos (WCAG AA):
  // accent x onAccent 5,3:1 (claro) e 9,2:1 (escuro); accentText sobre cartão e accentSoft ≥ 4,6:1.
  light: {
    text: '#0B2545',
    background: '#F6FAF8',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E6EFEB',
    border: '#DDE6E2',
    textSecondary: '#5B6B73',
    /** Preenchimento de botões e elementos ativos */
    accent: '#0A7A5E',
    /** Texto/ícone sobre o accent */
    onAccent: '#FFFFFF',
    /** Links e textos de destaque */
    accentText: '#0A7A5E',
    /** Verde da marca, só para elementos decorativos (anéis, gráficos, mascote) */
    brand: '#0F9D7A',
    positive: '#1A7F4B',
    negative: '#C93636',
    accentSoft: '#E1F4EE',
    positiveSoft: '#E5F4EC',
    negativeSoft: '#FBEAEA',
    // Gráficos: cores de situação (sempre com ícone + texto, nunca sozinhas) e linhas finas
    statusGood: '#0ca30c',
    statusWarning: '#fab219',
    statusCritical: '#d03b3b',
    chartGrid: '#DDE6E2',
    chartBaseline: '#B9C7C1',
  },
  dark: {
    text: '#EAF4F1',
    background: '#08141C',
    backgroundElement: '#11222C',
    backgroundSelected: '#1A3240',
    border: '#1F3340',
    textSecondary: '#9FB3BB',
    accent: '#3DDC97',
    onAccent: '#04261C',
    accentText: '#3DDC97',
    brand: '#3DDC97',
    positive: '#3DD68C',
    negative: '#FF6B6B',
    accentSoft: '#0F2E2A',
    positiveSoft: '#11281C',
    negativeSoft: '#2E1616',
    statusGood: '#0ca30c',
    statusWarning: '#fab219',
    statusCritical: '#d03b3b',
    chartGrid: '#1F3340',
    chartBaseline: '#2C4452',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Cores de fundo do avatar (todas com bom contraste para texto branco). */
export const AvatarColors = ['#2a78d6', '#1a7f4b', '#c2410c', '#6d28d9', '#be185d', '#0f766e'] as const;

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
