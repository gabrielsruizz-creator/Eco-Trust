import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, TextInput, View } from 'react-native';

import { Chip } from '@/components/chip';
import { Cartao } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { usePreferencias } from '@/hooks/use-dados';
import { useConta } from '@/hooks/use-sessao';
import { useTheme } from '@/hooks/use-theme';
import { biometriaDisponivel, definirBiometria } from '@/services/conta-service';
import { ErroValidacao } from '@/services/erros';
import { HORAS_LEMBRETE, salvarPreferencias, type Preferencias, type Tema } from '@/services/preferencias-service';

const TEMAS: { valor: Tema; rotulo: string }[] = [
  { valor: 'sistema', rotulo: 'Do celular' },
  { valor: 'claro', rotulo: 'Claro' },
  { valor: 'escuro', rotulo: 'Escuro' },
];

/** Tema, dia do pagamento, lembretes e biometria. */
export function CartaoPreferencias() {
  const theme = useTheme();
  const preferencias = usePreferencias();
  const conta = useConta();
  const [biometriaOk, setBiometriaOk] = useState(false);
  const [diaTexto, setDiaTexto] = useState(preferencias.diaPagamento ? String(preferencias.diaPagamento) : '');

  useEffect(() => {
    biometriaDisponivel().then(setBiometriaOk);
  }, []);

  async function atualizar(mudanca: Partial<Preferencias>) {
    try {
      const permitiu = await salvarPreferencias({ ...preferencias, ...mudanca });
      if (!permitiu) {
        await salvarPreferencias({ ...preferencias, ...mudanca, lembreteDiario: false, lembretePagamento: false });
        Alert.alert(
          'Notificações desativadas',
          'Para receber lembretes, permita as notificações do EcoTrust nas configurações do celular.',
        );
      }
    } catch (e) {
      Alert.alert('Não foi possível salvar', e instanceof ErroValidacao ? e.message : 'Tente novamente.');
    }
  }

  function salvarDia() {
    const dia = diaTexto.trim() ? Number(diaTexto) : null;
    if (dia === preferencias.diaPagamento) return;
    atualizar({ diaPagamento: dia, lembretePagamento: dia === null ? false : preferencias.lembretePagamento });
  }

  async function alternarBiometria(ativar: boolean) {
    const ok = await definirBiometria(ativar);
    if (!ok && ativar) Alert.alert('Biometria não ativada', 'Não foi possível confirmar sua digital ou Face ID.');
  }

  return (
    <Cartao>
      <ThemedText type="smallBold">Aparência</ThemedText>
      <View style={styles.chips} accessibilityRole="radiogroup">
        {TEMAS.map((t) => (
          <Chip key={t.valor} texto={t.rotulo} ativo={preferencias.tema === t.valor} aoTocar={() => atualizar({ tema: t.valor })} />
        ))}
      </View>

      <View style={[styles.separador, { borderTopColor: theme.backgroundSelected }]} />
      <View style={styles.linha}>
        <View style={styles.flex}>
          <ThemedText type="small">Dia do pagamento</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Dia do mês em que seu salário cai
          </ThemedText>
        </View>
        <TextInput
          style={[styles.campoDia, { color: theme.text, backgroundColor: theme.background }]}
          value={diaTexto}
          onChangeText={(t) => setDiaTexto(t.replace(/\D/g, '').slice(0, 2))}
          onEndEditing={salvarDia}
          onSubmitEditing={salvarDia}
          placeholder="–"
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          accessibilityLabel="Dia do pagamento, de 1 a 31"
          maxLength={2}
        />
      </View>

      <View style={[styles.separador, { borderTopColor: theme.backgroundSelected }]} />
      <View style={styles.linha}>
        <View style={styles.flex}>
          <ThemedText type="small">Lembrete diário</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Para registrar os gastos do dia
          </ThemedText>
        </View>
        <Switch
          value={preferencias.lembreteDiario}
          onValueChange={(v) => atualizar({ lembreteDiario: v })}
          accessibilityLabel="Lembrete diário"
        />
      </View>
      {preferencias.lembreteDiario && (
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Horário do lembrete">
          {HORAS_LEMBRETE.map((h) => (
            <Chip key={h} texto={`${h}h`} ativo={preferencias.horaLembrete === h} aoTocar={() => atualizar({ horaLembrete: h })} />
          ))}
        </View>
      )}

      <View style={styles.linha}>
        <View style={styles.flex}>
          <ThemedText type="small">Lembrete no dia do pagamento</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {preferencias.diaPagamento ? 'Para guardar nas metas primeiro' : 'Informe o dia do pagamento acima'}
          </ThemedText>
        </View>
        <Switch
          value={preferencias.lembretePagamento}
          disabled={preferencias.diaPagamento === null}
          onValueChange={(v) => atualizar({ lembretePagamento: v })}
          accessibilityLabel="Lembrete no dia do pagamento"
        />
      </View>

      {biometriaOk && conta && (
        <>
          <View style={[styles.separador, { borderTopColor: theme.backgroundSelected }]} />
          <View style={styles.linha}>
            <ThemedText type="small" style={styles.flex}>
              Entrar com biometria
            </ThemedText>
            <Switch value={conta.biometria} onValueChange={alternarBiometria} accessibilityLabel="Entrar com biometria" />
          </View>
        </>
      )}
    </Cartao>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  separador: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginVertical: Spacing.one,
  },
  campoDia: {
    width: 56,
    textAlign: 'center',
    fontSize: 16,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
  },
});
