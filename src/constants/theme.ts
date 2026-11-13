/**
 * Cores, espaçamentos e tipografia do EcoTrust (tema escuro padrão e claro opcional).
 * Cartões sólidos e planos por padrão; o vidro (Liquid Glass) é opcional nas Preferências.
 */

import { Platform } from 'react-native';

export const Colors = {
  // Paleta "Aconchego": creme quente, tinta marrom-escura e rosa como destaque; cartões brancos bem
  // arredondados com sombra difusa. O escuro usa marrom quase preto com texto creme (alto contraste).
  // Contrastes (WCAG AA): text, textSecondary, accentText e onAccent ≥ 4,5:1 nos dois temas.
  light: {
    text: '#2B1E1A',
    background: '#FBF6F1',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#F2E9E2',
    border: '#F1E8E1',
    textSecondary: '#76665E',
    /** Centavos e números de apoio, em tom bem apagado */
    textMuted: '#C2B3AA',
    /** Botões principais e elementos ativos */
    accent: '#C23F6E',
    onAccent: '#FFFFFF',
    /** Links e textos de destaque */
    accentText: '#B0335F',
    /** Rosa decorativo (gráficos, mascote, ícones) */
    brand: '#E0628F',
    positive: '#3C8A5A',
    negative: '#C0392B',
    accentSoft: '#FFEEF3',
    positiveSoft: '#F0F8F2',
    negativeSoft: '#FDEDEB',
    positiveBorder: '#CBE6D3',
    warning: '#A86A1E',
    warningSoft: '#FFF8EC',
    warningBorder: '#F1DCB8',
    accentBorder: '#F7CFDC',
    area: '#FFEEF3',
    banner: '#FFE1EA',
    onBanner: '#2B1E1A',
    heroi: '#C23F6E',
    gradienteInicio: '#C23F6E',
    gradienteFim: '#A8335D',
    /** Sombra difusa dos cartões */
    brilho: 'rgba(120, 80, 60, 0.08)',
    vidro: 'rgba(255, 255, 255, 0.62)',
    vidroBorda: 'rgba(255, 255, 255, 0.9)',
    vidroBrilho: 'rgba(255, 255, 255, 0.6)',
    fundoMancha1: 'rgba(255, 180, 205, 0.5)',
    fundoMancha2: 'rgba(255, 222, 200, 0.55)',
    fundoMancha3: 'rgba(224, 98, 143, 0.2)',
    statusGood: '#0ca30c',
    statusWarning: '#fab219',
    statusCritical: '#d03b3b',
    chartGrid: '#F1E8E1',
    chartBaseline: '#DCCDC4',
  },
  dark: {
    text: '#FBF3EE',
    background: '#16110F',
    backgroundElement: '#241D1A',
    backgroundSelected: '#2E2622',
    border: '#352C28',
    textSecondary: '#C9B9B0',
    textMuted: '#8E7E76',
    accent: '#FF7BA6',
    onAccent: '#16110F',
    accentText: '#FF94B8',
    brand: '#FF7BA6',
    positive: '#6EDC97',
    negative: '#FF8A7A',
    accentSoft: '#2E1820',
    positiveSoft: '#132A1D',
    negativeSoft: '#2E1714',
    positiveBorder: '#24513A',
    warning: '#F6C26B',
    warningSoft: '#2A2010',
    warningBorder: '#5A4524',
    accentBorder: '#5B2E3D',
    area: '#2E1820',
    banner: '#F7B6CB',
    onBanner: '#16110F',
    heroi: '#8E2C50',
    gradienteInicio: '#8E2C50',
    gradienteFim: '#73223F',
    brilho: 'rgba(0, 0, 0, 0)',
    vidro: 'rgba(44, 34, 30, 0.6)',
    vidroBorda: 'rgba(255, 255, 255, 0.12)',
    vidroBrilho: 'rgba(255, 255, 255, 0.07)',
    fundoMancha1: 'rgba(255, 123, 166, 0.25)',
    fundoMancha2: 'rgba(160, 90, 60, 0.3)',
    fundoMancha3: 'rgba(247, 182, 203, 0.15)',
    statusGood: '#0ca30c',
    statusWarning: '#fab219',
    statusCritical: '#d03b3b',
    chartGrid: '#352C28',
    chartBaseline: '#4D413B',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Cores de fundo do avatar (todas com bom contraste para texto branco). */
export const AvatarColors = ['#C23F6E', '#2B1E1A', '#3C8A5A', '#3D5A80', '#A0522D', '#6B3FA0'] as const;

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
