/**
 * Cores, espaçamentos e tipografia do EcoTrust (tema escuro padrão e claro opcional).
 * Cartões sólidos e planos por padrão; o vidro (Liquid Glass) é opcional nas Preferências.
 */

import { Platform } from 'react-native';

export const Colors = {
  // Paleta "Branco e rosa": superfícies brancas, rosa como cor principal, layout plano no estilo
  // editorial (cartões sólidos com cantos pouco arredondados e botões retangulares).
  // Contrastes (WCAG AA): text, textSecondary, accentText e onAccent ≥ 4,5:1 nos dois temas.
  light: {
    text: '#21141A',
    background: '#FFF9FB',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#FCEBF1',
    border: '#F2E1E8',
    textSecondary: '#7E6872',
    /** Botões, barra de ações e elementos ativos */
    accent: '#C2255C',
    /** Texto/ícone sobre o accent */
    onAccent: '#FFFFFF',
    /** Links e textos de destaque */
    accentText: '#B0204F',
    /** Ícones decorativos (círculos, anéis) */
    brand: '#C2255C',
    positive: '#2E7A4B',
    negative: '#B3261E',
    accentSoft: '#FFE6EE',
    positiveSoft: '#E3EFE4',
    negativeSoft: '#FBE3E1',
    /** Área de destaque clara (topo de telas de ação, círculos de ícone) */
    area: '#FFE6EE',
    /** Banner do Impostômetro e o texto sobre ele */
    banner: '#FFC4D6',
    onBanner: '#21141A',
    /** Cartões de destaque com texto claro, nos dois temas */
    heroi: '#C2255C',
    gradienteInicio: '#C2255C',
    gradienteFim: '#A81D4F',
    brilho: 'rgba(33, 20, 26, 0.08)',
    /** Vidro (opcional nas Preferências) */
    vidro: 'rgba(255, 255, 255, 0.62)',
    vidroBorda: 'rgba(255, 255, 255, 0.9)',
    vidroBrilho: 'rgba(255, 255, 255, 0.6)',
    fundoMancha1: 'rgba(255, 170, 200, 0.55)',
    fundoMancha2: 'rgba(255, 214, 228, 0.6)',
    fundoMancha3: 'rgba(214, 51, 108, 0.22)',
    statusGood: '#0ca30c',
    statusWarning: '#fab219',
    statusCritical: '#d03b3b',
    chartGrid: '#F2E1E8',
    chartBaseline: '#D9C2CC',
  },
  dark: {
    text: '#F8EEF2',
    background: '#141012',
    backgroundElement: '#1F181C',
    backgroundSelected: '#2C2228',
    border: '#30252B',
    textSecondary: '#B6A3AC',
    accent: '#F06A9B',
    onAccent: '#1A0F15',
    accentText: '#F48DB2',
    brand: '#F06A9B',
    positive: '#6FCF97',
    negative: '#F28B82',
    accentSoft: '#3A1F2C',
    positiveSoft: '#14271C',
    negativeSoft: '#331A1A',
    area: '#2B1C24',
    banner: '#F2A7C1',
    onBanner: '#1A0F15',
    heroi: '#8E1E48',
    gradienteInicio: '#8E1E48',
    gradienteFim: '#6E1638',
    brilho: 'rgba(0, 0, 0, 0.4)',
    vidro: 'rgba(40, 30, 36, 0.55)',
    vidroBorda: 'rgba(255, 255, 255, 0.12)',
    vidroBrilho: 'rgba(255, 255, 255, 0.07)',
    fundoMancha1: 'rgba(240, 106, 155, 0.30)',
    fundoMancha2: 'rgba(142, 30, 72, 0.35)',
    fundoMancha3: 'rgba(242, 167, 193, 0.18)',
    statusGood: '#0ca30c',
    statusWarning: '#fab219',
    statusCritical: '#d03b3b',
    chartGrid: '#2E242A',
    chartBaseline: '#4A3B43',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Cores de fundo do avatar (todas com bom contraste para texto branco). */
export const AvatarColors = ['#C2255C', '#21141A', '#2E7A4B', '#3D5A80', '#A0522D', '#6B3FA0'] as const;

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
