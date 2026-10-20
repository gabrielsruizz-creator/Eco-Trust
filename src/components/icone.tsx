/**
 * Ícones de linha do app: SF Symbols no iOS e Material Symbols no Android (via expo-symbols).
 * Use sempre um nome deste catálogo, para o mesmo ícone aparecer nos dois sistemas.
 */

import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

type NomeSimbolo = ComponentProps<typeof SymbolView>['name'];

export const ICONES = {
  inicio: { ios: 'house.fill', android: 'home' },
  transacoes: { ios: 'list.bullet.rectangle', android: 'receipt_long' },
  metas: { ios: 'target', android: 'track_changes' },
  aprender: { ios: 'graduationcap.fill', android: 'school' },
  perfil: { ios: 'person.crop.circle', android: 'person' },
  busca: { ios: 'magnifyingglass', android: 'search' },
  mais: { ios: 'plus', android: 'add' },
  sino: { ios: 'bell', android: 'notifications' },
  voltar: { ios: 'chevron.left', android: 'chevron_left' },
  avancar: { ios: 'chevron.right', android: 'chevron_right' },
  fechar: { ios: 'xmark', android: 'close' },
  categorias: { ios: 'chart.pie', android: 'pie_chart' },
  ia: { ios: 'sparkles', android: 'auto_awesome' },
  trofeu: { ios: 'trophy.fill', android: 'trophy' },
  escudo: { ios: 'shield.lefthalf.filled', android: 'shield' },
  calendario: { ios: 'calendar', android: 'calendar_month' },
  subindo: { ios: 'arrow.up.right', android: 'trending_up' },
  descendo: { ios: 'arrow.down.right', android: 'trending_down' },
  entrada: { ios: 'arrow.down.circle', android: 'south_west' },
  saida: { ios: 'arrow.up.circle', android: 'north_east' },
  fogo: { ios: 'flame.fill', android: 'local_fire_department' },
  estrela: { ios: 'star.fill', android: 'star' },
  coracao: { ios: 'heart.text.square', android: 'monitor_heart' },
  ajuda: { ios: 'questionmark.circle', android: 'help' },
  sair: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
  cadeado: { ios: 'lock', android: 'lock' },
  editar: { ios: 'pencil', android: 'edit' },
  lixeira: { ios: 'trash', android: 'delete' },
  chat: { ios: 'bubble.left.and.bubble.right', android: 'forum' },
  livro: { ios: 'book', android: 'menu_book' },
  ajustes: { ios: 'slider.horizontal.3', android: 'tune' },
  usuario: { ios: 'person', android: 'person' },
  bandeira: { ios: 'flag', android: 'flag' },
  carteira: { ios: 'wallet.bifold', android: 'account_balance_wallet' },
  coroa: { ios: 'crown.fill', android: 'workspace_premium' },
  check: { ios: 'checkmark', android: 'check' },
  impostos: { ios: 'building.columns', android: 'account_balance' },
  recibo: { ios: 'doc.text', android: 'receipt' },
  relogio: { ios: 'clock', android: 'schedule' },
  qrcode: { ios: 'qrcode.viewfinder', android: 'qr_code_scanner' },
  lanterna: { ios: 'flashlight.on.fill', android: 'flashlight_on' },
  // Categorias e metas
  alimentacao: { ios: 'fork.knife', android: 'restaurant' },
  supermercado: { ios: 'cart', android: 'shopping_cart' },
  combustivel: { ios: 'fuelpump', android: 'local_gas_station' },
  contas: { ios: 'bolt', android: 'bolt' },
  telefone: { ios: 'wifi', android: 'wifi' },
  transporte: { ios: 'car.fill', android: 'directions_car' },
  moradia: { ios: 'house', android: 'home' },
  saude: { ios: 'cross.case', android: 'medical_services' },
  educacao: { ios: 'book.closed', android: 'auto_stories' },
  lazer: { ios: 'gamecontroller', android: 'sports_esports' },
  compras: { ios: 'bag', android: 'shopping_bag' },
  assinaturas: { ios: 'play.rectangle', android: 'subscriptions' },
  viagem: { ios: 'airplane', android: 'flight' },
  outros: { ios: 'square.grid.2x2', android: 'category' },
  salario: { ios: 'banknote', android: 'payments' },
  freelance: { ios: 'laptopcomputer', android: 'laptop' },
  investimentos: { ios: 'chart.line.uptrend.xyaxis', android: 'show_chart' },
  etiqueta: { ios: 'tag', android: 'sell' },
} as const satisfies Record<string, Extract<NomeSimbolo, object>>;

export type NomeIcone = keyof typeof ICONES;

type Props = {
  nome: NomeIcone;
  tamanho?: number;
  cor: ColorValue;
};

/** Ícone decorativo (o texto ao lado é que dá o significado para o leitor de tela). */
export function Icone({ nome, tamanho = 22, cor }: Props) {
  return (
    <SymbolView
      name={ICONES[nome]}
      size={tamanho}
      tintColor={cor}
      style={{ width: tamanho, height: tamanho }}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
