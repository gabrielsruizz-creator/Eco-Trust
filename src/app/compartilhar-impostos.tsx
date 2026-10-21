import { useLocalSearchParams } from 'expo-router';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { LogoEcoTrust } from '@/components/logo-ecotrust';
import { Botao } from '@/components/tela';
import { TelaSecundaria } from '@/components/tela-secundaria';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useImpostometro } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import { mesAtual, nomeDoMes } from '@/utils/datas';
import { formatarCentavos } from '@/utils/moeda';
import { vibrarErro, vibrarSucesso } from '@/utils/vibracao';

function numero(n: number) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

function diaEMes(data: string) {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}

/** Cartão do Impostômetro do mês em imagem, para mandar no WhatsApp ou postar. */
export default function CompartilharImpostosScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ mes?: string }>();
  const mes = params.mes && /^\d{4}-\d{2}$/.test(params.mes) ? params.mes : mesAtual();
  const imp = useImpostometro(mes);
  const [mostrarValores, setMostrarValores] = useState(true);
  const [gerando, setGerando] = useState(false);
  const cartao = useRef<View>(null);
  const nomeMes = nomeDoMes(mes);

  async function compartilhar() {
    setGerando(true);
    try {
      if (!(await isAvailableAsync())) throw new Error('indisponível');
      const uri = await captureRef(cartao, { format: 'png', quality: 1, fileName: 'meu-impostometro' });
      await shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Compartilhar meu Impostômetro' });
      vibrarSucesso();
    } catch {
      vibrarErro();
      Alert.alert('Não foi possível compartilhar', 'Tente novamente.');
    } finally {
      setGerando(false);
    }
  }

  return (
    <TelaSecundaria
      titulo="Compartilhar"
      textoVoltar="Fechar"
      rodape={<Botao texto="Compartilhar imagem" icone="compartilhar" disabled={gerando} onPress={compartilhar} />}>
      {/* O que está dentro deste View vira a imagem */}
      <View ref={cartao} collapsable={false} style={styles.cartao}>
        <View style={styles.decoracao} />
        <ThemedText type="small" style={styles.claro}>
          Meu Impostômetro · {nomeMes}
        </ThemedText>
        {mostrarValores ? (
          <ThemedText style={styles.grande} numberOfLines={1} adjustsFontSizeToFit>
            {formatarCentavos(imp.cargaTotalCentavos)}
          </ThemedText>
        ) : (
          <ThemedText style={styles.grande}>
            {imp.percentualDaRenda !== null ? `${numero(imp.percentualDaRenda)}%` : `${numero(imp.percentualDosGastos ?? 0)}%`}
          </ThemedText>
        )}
        <ThemedText style={styles.branco}>
          {mostrarValores
            ? 'foram para o governo em impostos este mês.'
            : imp.percentualDaRenda !== null
              ? 'da minha renda foi para o governo em impostos.'
              : 'do que gastei foi imposto.'}
        </ThemedText>

        <View style={styles.numeros}>
          {imp.percentualDosGastos !== null && (
            <Numero valor={`${numero(imp.percentualDosGastos)}%`} rotulo="do que gastei era imposto" />
          )}
          {imp.diasTrabalhados !== null && (
            <Numero valor={`${numero(imp.diasTrabalhados)} dias`} rotulo="de trabalho para o governo" />
          )}
        </View>

        {imp.porEsfera.length > 0 && (
          <View style={styles.esferas}>
            {imp.porEsfera.map((e) => (
              <View key={e.esfera} style={styles.esfera}>
                <ThemedText type="small" style={[styles.claro, styles.flex]}>
                  {e.nome}
                </ThemedText>
                <ThemedText type="smallBold" style={styles.branco}>
                  {mostrarValores ? formatarCentavos(e.centavos) : `${numero(e.percentual)}%`}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        {imp.liberdade && (
          <ThemedText type="small" style={styles.claro}>
            Meu Dia da Liberdade de Impostos em {mes.slice(0, 4)}: {diaEMes(imp.liberdade.data)}
          </ThemedText>
        )}

        <View style={styles.rodapeCartao}>
          <LogoEcoTrust tamanho={20} />
          <ThemedText type="smallBold" style={styles.branco}>
            EcoTrust · seu impostômetro pessoal
          </ThemedText>
        </View>
      </View>

      <View style={[styles.opcao, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.flex}>
          <ThemedText type="smallBold">Mostrar valores em reais</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Desligue para mostrar só percentuais.
          </ThemedText>
        </View>
        <Switch
          value={mostrarValores}
          onValueChange={setMostrarValores}
          trackColor={{ true: theme.accent }}
          accessibilityLabel="Mostrar valores em reais na imagem"
        />
      </View>
    </TelaSecundaria>
  );
}

function Numero({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <View style={styles.numero}>
      <ThemedText style={styles.medio}>{valor}</ThemedText>
      <ThemedText type="small" style={styles.claro}>
        {rotulo}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  cartao: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
    overflow: 'hidden',
    backgroundColor: '#5B3FE0',
    experimental_backgroundImage: 'linear-gradient(135deg, #7454FA, #3A5CF5)',
  },
  decoracao: {
    position: 'absolute',
    right: -50,
    top: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  claro: {
    color: 'rgba(255,255,255,0.85)',
  },
  branco: {
    color: '#FFFFFF',
  },
  grande: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: 700,
    color: '#FFFFFF',
  },
  medio: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 700,
    color: '#FFFFFF',
  },
  numeros: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  numero: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  esferas: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  esfera: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rodapeCartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
});
