import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet } from 'react-native';

import { CampoSenha } from '@/components/campo-senha';
import { Botao } from '@/components/tela';
import { TelaAcesso } from '@/components/tela-acesso';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useConta } from '@/hooks/use-sessao';
import { useTheme } from '@/hooks/use-theme';
import { apagarContaEDados, entrar, entrarComBiometria } from '@/services/conta-service';
import { ErroValidacao } from '@/services/erros';
import { primeiroNome } from '@/services/perfil-financeiro-service';

export default function EntrarScreen() {
  const theme = useTheme();
  const conta = useConta();
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);
  const biometriaPedida = useRef(false);

  // Com biometria ativada, pede a digital/Face ID assim que a tela abre (uma vez).
  useEffect(() => {
    if (conta?.biometria && !biometriaPedida.current) {
      biometriaPedida.current = true;
      entrarComBiometria();
    }
  }, [conta?.biometria]);

  async function entrarComSenha() {
    if (!conta || !senha || entrando) return;
    setErro(null);
    setEntrando(true);
    try {
      await entrar(conta.email, senha);
    } catch (e) {
      setErro(e instanceof ErroValidacao ? e.message : 'Não foi possível entrar. Tente novamente.');
      setEntrando(false);
    }
  }

  function esqueciSenha() {
    Alert.alert(
      'Esqueceu a senha?',
      'Sua conta fica só neste celular, então não dá para recuperar a senha por e-mail. Se não lembrar, a única opção é apagar a conta e os dados deste aparelho e começar de novo.',
      [
        { text: 'Vou tentar lembrar', style: 'cancel' },
        { text: 'Apagar conta e dados', style: 'destructive', onPress: confirmarApagar },
      ],
    );
  }

  function confirmarApagar() {
    Alert.alert('Tem certeza?', 'Todos os seus lançamentos, orçamentos e metas serão apagados. Isso não pode ser desfeito.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar tudo', style: 'destructive', onPress: () => apagarContaEDados() },
    ]);
  }

  const nome = conta ? primeiroNome(conta.nome) : '';

  return (
    <TelaAcesso titulo={nome ? `Olá de novo, ${nome}!` : 'Entrar'} subtitulo={conta?.email ?? ''}>
      <CampoSenha
        rotulo="Senha"
        value={senha}
        onChangeText={(t) => {
          setSenha(t);
          setErro(null);
        }}
        placeholder="Sua senha"
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={entrarComSenha}
        returnKeyType="go"
      />

      {erro && (
        <ThemedText type="small" style={{ color: theme.negative }} accessibilityLiveRegion="polite">
          {erro}
        </ThemedText>
      )}

      {entrando ? (
        <ActivityIndicator color={theme.accent} accessibilityLabel="Entrando" />
      ) : (
        <Botao texto="Entrar" disabled={!senha} onPress={entrarComSenha} />
      )}

      {conta?.biometria && (
        <Botao texto="Entrar com biometria" variante="secundario" onPress={() => entrarComBiometria()} />
      )}

      <Pressable onPress={esqueciSenha} accessibilityRole="button" style={styles.link} hitSlop={8}>
        <ThemedText type="smallBold" style={{ color: theme.accentText }}>
          Esqueci minha senha
        </ThemedText>
      </Pressable>
    </TelaAcesso>
  );
}

const styles = StyleSheet.create({
  link: {
    alignSelf: 'center',
    paddingVertical: Spacing.two,
  },
});
