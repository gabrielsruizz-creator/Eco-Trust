import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AvisoConquista } from '@/components/aviso-conquista';
import { Colors } from '@/constants/theme';
import { usePerfilFinanceiro } from '@/hooks/use-dados';
import { useSessao } from '@/hooks/use-sessao';
import { iniciarSincronizacaoJornada } from '@/services/celebracao-service';
import { BLOQUEIO_SEGUNDO_PLANO_MS, sair } from '@/services/conta-service';
import { aplicarTema, configurarNotificacoes, obterPreferencias } from '@/services/preferencias-service';

// Se algo falhar ao abrir o banco ou montar uma tela, o Expo Router mostra uma tela de erro com "tentar de novo".
export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();
configurarNotificacoes();

/** Aplica o tema escolhido nas preferências (claro, escuro ou o do sistema). */
function useTemaPreferido() {
  useEffect(() => {
    aplicarTema(obterPreferencias().tema);
  }, []);
}

/** Com o app liberado, mantém conquistas e histórico da saúde em dia. */
function useJornadaAutomatica(ativa: boolean) {
  useEffect(() => (ativa ? iniciarSincronizacaoJornada() : undefined), [ativa]);
}

/** Depois de alguns minutos com o app em segundo plano, pede para entrar de novo. */
function useBloqueioAutomatico() {
  useEffect(() => {
    let saiuEm: number | null = null;
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'background') {
        saiuEm = Date.now();
      } else if (estado === 'active' && saiuEm !== null) {
        if (Date.now() - saiuEm > BLOQUEIO_SEGUNDO_PLANO_MS) sair();
        saiuEm = null;
      }
    });
    return () => assinatura.remove();
  }, []);
}

/** Cores da navegação iguais às do app (evita o fundo branco piscando entre telas no tema escuro). */
function temaNavegacao(esquema: 'light' | 'dark') {
  const base = esquema === 'dark' ? DarkTheme : DefaultTheme;
  const c = Colors[esquema];
  return {
    ...base,
    colors: { ...base.colors, background: c.background, card: c.background, text: c.text, border: c.border, primary: c.accent },
  };
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { temConta, logado } = useSessao();
  const temPerfil = usePerfilFinanceiro() !== null;
  useBloqueioAutomatico();
  useTemaPreferido();
  useJornadaAutomatica(logado && temPerfil);

  return (
    <ThemeProvider value={temaNavegacao(colorScheme === 'light' ? 'light' : 'dark')}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        {/*
          Fluxo de acesso (o Expo Router troca de tela sozinho quando a condição muda):
          sem conta → cadastro · com conta, sem entrar → entrar · sem perfil → onboarding · pronto → app
        */}
        <Stack.Protected guard={!temConta}>
          <Stack.Screen name="cadastro" />
        </Stack.Protected>
        <Stack.Protected guard={temConta && !logado}>
          <Stack.Screen name="entrar" />
        </Stack.Protected>
        <Stack.Protected guard={logado && !temPerfil}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={logado && temPerfil}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="editar-perfil" options={{ presentation: 'modal' }} />
          <Stack.Screen name="novo-lancamento" options={{ presentation: 'modal' }} />
          <Stack.Screen name="ler-nota" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="lancamento/[id]" />
          <Stack.Screen name="editar-lancamento/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="categorias" />
          <Stack.Screen name="editar-orcamento" options={{ presentation: 'modal' }} />
          <Stack.Screen name="nova-meta" options={{ presentation: 'modal' }} />
          <Stack.Screen name="meta/[id]" />
          <Stack.Screen name="editar-meta/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="movimentar-meta/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="saude-financeira" />
          <Stack.Screen name="insights" />
          <Stack.Screen name="orcamento" />
          <Stack.Screen name="ajustar-impostos" />
          <Stack.Screen name="impostos-renda" options={{ presentation: 'modal' }} />
          <Stack.Screen name="assinatura" options={{ presentation: 'modal' }} />
          <Stack.Screen name="academy/index" />
          <Stack.Screen name="academy/curso/[id]" />
          <Stack.Screen name="academy/aula/[id]" />
          <Stack.Screen name="academy/categoria/[id]" />
          <Stack.Screen name="academy/glossario" />
          <Stack.Screen name="forum" />
          <Stack.Screen name="forum/[id]" />
          <Stack.Screen name="forum/novo" options={{ presentation: 'modal' }} />
          <Stack.Screen name="perfil-investidor" />
          <Stack.Screen name="editar-dados-pessoais" options={{ presentation: 'modal' }} />
          <Stack.Screen name="editar-situacao" options={{ presentation: 'modal' }} />
          <Stack.Screen name="refazer-conversa" options={{ presentation: 'modal' }} />
          <Stack.Screen name="conquistas" />
        </Stack.Protected>
      </Stack>
      {/* Por cima de todas as telas */}
      <AvisoConquista />
    </ThemeProvider>
  );
}
