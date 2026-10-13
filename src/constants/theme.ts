/**
 * Cores, espaçamentos e tipografia do EcoTrust (tema escuro padrão e claro opcional).
 */

import { Platform } from 'react-native';

export const Colors = {
  // Paleta "Noite EcoTrust": azul-marinho profundo + degradê roxo → azul (referência de design).
  // O app abre no escuro; o claro é opcional nas Preferências. Contrastes conferidos (WCAG AA)
  // em teste automático: texto, textSecondary, accentText e onAccent ≥ 4,5:1 nos dois temas.
  light: {
    text: '#0B1230',
    background: '#F5F6FB',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E9ECF7',
    border: '#E1E5F2',
    textSecondary: '#5A6385',
    /** Preenchimento de botões e elementos ativos */
    accent: '#5B3FE0',
    /** Texto/ícone sobre o accent e sobre o degradê */
    onAccent: '#FFFFFF',
    /** Links e textos de destaque */
    accentText: '#5B3FE0',
    /** Cor da marca para elementos decorativos (anéis, gráficos) */
    brand: '#6D4AFF',
    positive: '#1A7F4B',
    negative: '#C93636',
    accentSoft: '#ECE8FF',
    positiveSoft: '#E5F4EC',
    negativeSoft: '#FBEAEA',
    /** Degradê da marca (botões principais, cartão de saldo, barras de progresso) */
    gradienteInicio: '#6D4AFF',
    gradienteFim: '#3A5CF5',
    /** Brilho atrás de elementos de destaque */
    brilho: 'rgba(109, 74, 255, 0.22)',
    // Gráficos: cores de situação (sempre com ícone + texto, nunca sozinhas) e linhas finas
    statusGood: '#0ca30c',
    statusWarning: '#fab219',
    statusCritical: '#d03b3b',
    chartGrid: '#E3E6F2',
    chartBaseline: '#C5CADF',
  },
  dark: {
    text: '#F4F6FF',
    background: '#070B1A',
    backgroundElement: '#111833',
    backgroundSelected: '#1B2448',
    border: '#242E57',
    textSecondary: '#9AA3C7',
    accent: '#6D4AFF',
    onAccent: '#FFFFFF',
    accentText: '#A99BFF',
    brand: '#8B6CFF',
    positive: '#34D399',
    negative: '#F87171',
    accentSoft: '#1E1A4A',
    positiveSoft: '#0F2A24',
    negativeSoft: '#2E1620',
    gradienteInicio: '#7454FA',
    gradienteFim: '#3A5CF5',
    brilho: 'rgba(123, 92, 255, 0.45)',
    statusGood: '#0ca30c',
    statusWarning: '#fab219',
    statusCritical: '#d03b3b',
    chartGrid: '#1F2850',
    chartBaseline: '#2E3866',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Cores de fundo do avatar (todas com bom contraste para texto branco). */
export const AvatarColors = ['#5B3FE0', '#2a5fd6', '#1a7f4b', '#c2410c', '#be185d', '#0f766e'] as const;

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
