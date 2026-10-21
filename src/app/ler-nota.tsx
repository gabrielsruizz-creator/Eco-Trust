import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icone } from '@/components/icone';
import { Botao } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sugerirCategoriaPorLoja } from '@/services/categorias-service';
import {
  anexarNotaAoLancamento,
  consultarNota,
  guardarNotaPendente,
  lerQrCode,
  obterNotaDoLancamento,
  type QrNota,
} from '@/services/nota-fiscal-service';
import { obterTransacaoPorChaveNota } from '@/services/transacoes-service';
import { formatarData } from '@/utils/datas';
import { vibrarErro, vibrarSucesso } from '@/utils/vibracao';

/** Lê o QR Code da NFC-e e abre o formulário de despesa já preenchido com o que der para descobrir. */
export default function LerNotaScreen() {
  const theme = useTheme();
  const [permissao, pedirPermissao] = useCameraPermissions();
  const [lanterna, setLanterna] = useState(false);
  const [buscando, setBuscando] = useState(false);
  // A câmera dispara várias leituras por segundo: o ref garante que só a primeira seja tratada.
  const ocupado = useRef(false);

  function liberar() {
    ocupado.current = false;
    setBuscando(false);
  }

  /** Nota registrada antes de existir a lista de itens: busca de novo e completa o lançamento. */
  async function importarItens(qr: QrNota, transacaoId: number) {
    setBuscando(true);
    const nota = await consultarNota(qr);
    if (nota.itens.length === 0) {
      vibrarErro();
      Alert.alert(
        'Itens não encontrados',
        'Não foi possível ler os produtos no site da SEFAZ deste estado. Tente de novo mais tarde.',
        [{ text: 'OK', onPress: liberar }],
      );
      return;
    }
    anexarNotaAoLancamento(transacaoId, nota);
    vibrarSucesso();
    router.replace({ pathname: '/lancamento/[id]', params: { id: String(transacaoId) } });
  }

  async function aoLer({ data }: BarcodeScanningResult) {
    if (ocupado.current) return;
    ocupado.current = true;

    const qr = lerQrCode(data);
    if (!qr) {
      vibrarErro();
      Alert.alert('Não é uma nota fiscal', 'Aponte para o QR Code no fim do cupom fiscal (NFC-e).', [
        { text: 'Tentar de novo', onPress: liberar },
      ]);
      return;
    }

    const existente = obterTransacaoPorChaveNota(qr.chave.chave);
    if (existente) {
      const semItens = !obterNotaDoLancamento(existente.id)?.itens.length;
      vibrarErro();
      Alert.alert(
        'Nota já registrada',
        `Você registrou esta nota em ${formatarData(existente.data)} (${existente.descricao || existente.categoriaNome}).` +
          (semItens ? ' Quer importar a lista de produtos para esse lançamento?' : ''),
        [
          { text: 'Ler outra', onPress: liberar },
          semItens
            ? { text: 'Importar itens', onPress: () => importarItens(qr, existente.id) }
            : {
                text: 'Ver lançamento',
                onPress: () => router.replace({ pathname: '/lancamento/[id]', params: { id: String(existente.id) } }),
              },
        ],
      );
      return;
    }

    setBuscando(true);
    const nota = await consultarNota(qr);
    vibrarSucesso();
    guardarNotaPendente(nota);
    const loja = nota.emitente;
    const categoria = loja ? sugerirCategoriaPorLoja(loja) : null;
    router.replace({
      pathname: '/novo-lancamento',
      params: {
        tipo: 'despesa',
        chave: nota.chave.chave,
        resumo:
          `NFC-e nº ${nota.chave.numero} · ${nota.chave.uf}` +
          (nota.itens.length ? ` · ${nota.itens.length} ${nota.itens.length === 1 ? 'item' : 'itens'}` : '') +
          (nota.cpfNaNota === false ? ' · sem o seu CPF' : ''),
        ...(nota.url && { url: nota.url }),
        ...(nota.valorCentavos && { valor: String(nota.valorCentavos) }),
        ...(nota.tributosCentavos !== null && { tributos: String(nota.tributosCentavos) }),
        ...(nota.data && { data: nota.data }),
        ...(loja && { descricao: loja.slice(0, 120) }),
        ...(categoria !== null && { categoria: String(categoria) }),
      },
    });
  }

  let conteudo;
  if (!permissao) {
    conteudo = <ActivityIndicator color={theme.accent} />;
  } else if (!permissao.granted) {
    conteudo = (
      <View style={styles.pedido}>
        <Icone nome="qrcode" cor={theme.accentText} tamanho={48} />
        <ThemedText style={styles.titulo}>Ler a nota fiscal</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centro}>
          O EcoTrust usa a câmera só para ler o QR Code do cupom e preencher o valor, a data e os
          impostos da compra.
        </ThemedText>
        {permissao.canAskAgain ? (
          <Botao texto="Permitir câmera" onPress={pedirPermissao} />
        ) : (
          <Botao texto="Abrir ajustes do celular" onPress={() => Linking.openSettings()} />
        )}
      </View>
    );
  } else {
    conteudo = (
      <View style={styles.cameraArea}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={lanterna}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={buscando ? undefined : aoLer}
        />
        <View style={styles.mira} pointerEvents="none" />
        <View style={styles.rodapeCamera}>
          {buscando ? (
            <View style={styles.buscando} accessibilityLiveRegion="polite">
              <ActivityIndicator color="#FFFFFF" />
              <ThemedText type="smallBold" style={styles.textoBranco}>
                Buscando a nota no site da SEFAZ...
              </ThemedText>
            </View>
          ) : (
            <ThemedText type="small" style={[styles.textoBranco, styles.centro]}>
              Aponte para o QR Code no fim do cupom fiscal
            </ThemedText>
          )}
          <Pressable
            onPress={() => setLanterna(!lanterna)}
            accessibilityRole="button"
            accessibilityLabel={lanterna ? 'Desligar lanterna' : 'Ligar lanterna'}
            accessibilityState={{ selected: lanterna }}
            style={[styles.botaoLanterna, lanterna && { backgroundColor: theme.accent }]}>
            <Icone nome="lanterna" cor="#FFFFFF" tamanho={22} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.topo}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Cancelar
            </ThemedText>
          </Pressable>
          <ThemedText type="smallBold" accessibilityRole="header">
            QR Code da nota
          </ThemedText>
          <Pressable
            onPress={() => router.replace({ pathname: '/novo-lancamento', params: { tipo: 'despesa' } })}
            accessibilityRole="button"
            accessibilityLabel="Registrar sem a nota"
            hitSlop={12}>
            <ThemedText type="smallBold" style={{ color: theme.accentText }}>
              Digitar
            </ThemedText>
          </Pressable>
        </View>
        <View style={styles.centroTela}>{conteudo}</View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  topo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 44,
  },
  centroTela: {
    flex: 1,
    justifyContent: 'center',
  },
  centro: {
    textAlign: 'center',
  },
  pedido: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  titulo: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: 700,
  },
  cameraArea: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mira: {
    width: 240,
    height: 240,
    borderRadius: Spacing.four,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  rodapeCamera: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
  },
  buscando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  textoBranco: {
    color: '#FFFFFF',
  },
  botaoLanterna: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});
