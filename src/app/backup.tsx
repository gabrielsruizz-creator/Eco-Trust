import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { Botao, Cartao, IconeCirculo } from '@/components/tela';
import { TelaSecundaria } from '@/components/tela-secundaria';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useUltimoBackup } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import { escolherBackup, exportarBackup, restaurarBackup, resumirBackup } from '@/services/backup-service';
import { ErroValidacao } from '@/services/erros';
import { formatarData, paraDataLocal, tempoRelativo } from '@/utils/datas';
import { vibrarErro, vibrarSucesso } from '@/utils/vibracao';

/** Backup em arquivo: guardar todos os dados fora do celular e trazê-los de volta. */
export default function BackupScreen() {
  const theme = useTheme();
  const ultimo = useUltimoBackup();
  const [ocupado, setOcupado] = useState(false);

  function erro(e: unknown, titulo: string) {
    vibrarErro();
    Alert.alert(titulo, e instanceof ErroValidacao ? e.message : 'Tente novamente.');
  }

  async function exportar() {
    setOcupado(true);
    try {
      await exportarBackup();
      vibrarSucesso();
    } catch (e) {
      erro(e, 'Não foi possível fazer o backup');
    } finally {
      setOcupado(false);
    }
  }

  async function importar() {
    setOcupado(true);
    try {
      const backup = await escolherBackup();
      if (!backup) return;
      const r = resumirBackup(backup);
      Alert.alert(
        'Restaurar backup?',
        `Backup de ${formatarData(paraDataLocal(new Date(r.criadoEm)))}, com ${r.lancamentos} lançamentos, ${r.metas} metas e ${r.notas} notas fiscais.\n\nTODOS os dados atuais deste aparelho serão substituídos pelos do backup.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Restaurar',
            style: 'destructive',
            onPress: () => {
              try {
                restaurarBackup(backup);
                vibrarSucesso();
                Alert.alert('Backup restaurado', 'Seus dados foram recuperados.');
              } catch (e) {
                erro(e, 'Não foi possível restaurar');
              }
            },
          },
        ],
      );
    } catch (e) {
      erro(e, 'Não foi possível abrir o backup');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <TelaSecundaria titulo="Backup dos dados">
      <Cartao style={styles.linha}>
        <IconeCirculo icone="escudo" cor={theme.brand} />
        <View style={styles.flex}>
          <ThemedText type="smallBold">Seus dados ficam só neste celular</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Se ele for perdido ou trocado, o backup é o que traz tudo de volta: lançamentos, notas e
            itens, metas, orçamentos e configurações dos impostos.
          </ThemedText>
        </View>
      </Cartao>

      <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
        {ultimo ? `Último backup: ${tempoRelativo(ultimo)}.` : 'Você ainda não fez nenhum backup.'}
      </ThemedText>

      {ocupado && <ActivityIndicator color={theme.accent} />}

      <Botao texto="Fazer backup agora" icone="escudo" disabled={ocupado} onPress={exportar} />
      <ThemedText type="small" themeColor="textSecondary">
        O app cria um arquivo e abre as opções do celular para guardá-lo: Arquivos/iCloud, Google Drive,
        e-mail ou WhatsApp. Sua senha não vai no arquivo.
      </ThemedText>

      <Botao texto="Restaurar de um arquivo" variante="secundario" disabled={ocupado} onPress={importar} />
      <ThemedText type="small" themeColor="textSecondary">
        Escolha um arquivo de backup do EcoTrust. Antes de substituir qualquer coisa, o app mostra o que
        tem nele e pede confirmação.
      </ThemedText>
    </TelaSecundaria>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
