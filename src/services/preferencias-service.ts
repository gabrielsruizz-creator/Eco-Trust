/**
 * Preferências do app (guardadas na tabela de configurações):
 * tema, dia do pagamento e lembretes. Aplicar o tema e agendar lembretes são efeitos colaterais
 * que ficam aqui, fora das telas.
 */

import * as Notifications from 'expo-notifications';
import { Appearance, Platform } from 'react-native';

import { lerConfiguracao, salvarConfiguracao } from '@/repositories/configuracoes-repository';
import { ErroValidacao } from '@/services/erros';

export type Tema = 'sistema' | 'claro' | 'escuro';

export type Preferencias = {
  tema: Tema;
  /** Dia do mês em que o salário cai (1 a 31), ou null */
  diaPagamento: number | null;
  lembreteDiario: boolean;
  /** Hora do lembrete diário (0 a 23) */
  horaLembrete: number;
  lembretePagamento: boolean;
};

export const HORAS_LEMBRETE = [8, 12, 18, 21];

const PADRAO: Preferencias = {
  tema: 'escuro',
  diaPagamento: null,
  lembreteDiario: false,
  horaLembrete: 21,
  lembretePagamento: false,
};

export function obterPreferencias(): Preferencias {
  const texto = lerConfiguracao('preferencias');
  if (!texto) return PADRAO;
  try {
    return { ...PADRAO, ...(JSON.parse(texto) as Partial<Preferencias>) };
  } catch {
    return PADRAO;
  }
}

export function validarPreferencias(p: Preferencias): Preferencias {
  if (!['sistema', 'claro', 'escuro'].includes(p.tema)) throw new ErroValidacao('Tema inválido.');
  if (p.diaPagamento !== null && (!Number.isInteger(p.diaPagamento) || p.diaPagamento < 1 || p.diaPagamento > 31)) {
    throw new ErroValidacao('O dia do pagamento deve ser de 1 a 31.');
  }
  if (!Number.isInteger(p.horaLembrete) || p.horaLembrete < 0 || p.horaLembrete > 23) {
    throw new ErroValidacao('Hora do lembrete inválida.');
  }
  if (p.lembretePagamento && p.diaPagamento === null) {
    throw new ErroValidacao('Informe o dia do pagamento para receber esse lembrete.');
  }
  return p;
}

/** Salva, aplica o tema e reagenda os lembretes. Retorna false se a pessoa negou notificações. */
export async function salvarPreferencias(p: Preferencias): Promise<boolean> {
  const validas = validarPreferencias(p);
  salvarConfiguracao('preferencias', JSON.stringify(validas));
  aplicarTema(validas.tema);
  return agendarLembretes(validas);
}

export function aplicarTema(tema: Tema) {
  Appearance.setColorScheme(tema === 'claro' ? 'light' : tema === 'escuro' ? 'dark' : 'unspecified');
}

// ---------- Lembretes (notificações locais) ----------

const CANAL = 'lembretes';

async function garantirPermissao() {
  const atual = await Notifications.getPermissionsAsync();
  if (atual.granted) return true;
  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.granted;
}

/** Cancela e recria os lembretes conforme as preferências. */
export async function agendarLembretes(p: Preferencias): Promise<boolean> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!p.lembreteDiario && !p.lembretePagamento) return true;
  if (!(await garantirPermissao())) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL, {
      name: 'Lembretes',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  if (p.lembreteDiario) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'EcoTrust', body: 'Já registrou seus gastos de hoje? Leva menos de um minuto.' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: p.horaLembrete,
        minute: 0,
        channelId: CANAL,
      },
    });
  }
  if (p.lembretePagamento && p.diaPagamento !== null) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Dia de pagamento',
        body: 'Que tal separar primeiro o valor das suas metas? Pague-se primeiro!',
      },
      // Meses curtos não têm dia 29-31: nesses casos o lembrete vem no dia 28.
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: Math.min(p.diaPagamento, 28),
        hour: 9,
        minute: 0,
        channelId: CANAL,
      },
    });
  }
  return true;
}

/** Como as notificações aparecem com o app aberto. Chamado uma vez ao iniciar. */
export function configurarNotificacoes() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
