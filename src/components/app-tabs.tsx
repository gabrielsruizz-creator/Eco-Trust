import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { ICONES } from '@/components/icone';
import { useTheme } from '@/hooks/use-theme';

/** Abas: Início · Transações · Impostos · Metas · Perfil. (A Academy abre pelo Início e pelo Perfil.) */
export default function AppTabs() {
  const theme = useTheme();

  return (
    <NativeTabs
      backgroundColor={theme.background}
      indicatorColor={theme.accentSoft}
      iconColor={{ default: theme.textSecondary, selected: theme.accentText }}
      labelStyle={{ default: { color: theme.textSecondary }, selected: { color: theme.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Início</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={ICONES.inicio.ios} md={ICONES.inicio.android} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="transacoes">
        <NativeTabs.Trigger.Label>Transações</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={ICONES.transacoes.ios} md={ICONES.transacoes.android} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="impostos">
        <NativeTabs.Trigger.Label>Impostos</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={ICONES.impostos.ios} md={ICONES.impostos.android} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="metas">
        <NativeTabs.Trigger.Label>Metas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={ICONES.metas.ios} md={ICONES.metas.android} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="perfil">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={ICONES.perfil.ios} md={ICONES.perfil.android} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
