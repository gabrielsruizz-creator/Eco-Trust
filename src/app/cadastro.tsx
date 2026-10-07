import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TextInput } from 'react-native';

import { CampoSenha } from '@/components/campo-senha';
import { Botao } from '@/components/tela';
import { TelaAcesso } from '@/components/tela-acesso';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { biometriaDisponivel, criarConta, definirBiometria } from '@/services/conta-service';
import { ErroValidacao } from '@/services/erros';

export default function CadastroScreen() {
  const theme = useTheme();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const preenchido = nome.trim() && email.trim() && senha && confirmacao;
  const estiloCampo = [styles.campo, { color: theme.text, backgroundColor: theme.backgroundElement }];

  async function oferecerBiometria() {
    if (!(await biometriaDisponivel())) return;
    Alert.alert('Entrar com biometria?', 'Use sua digital ou Face ID para abrir o EcoTrust mais rápido.', [
      { text: 'Agora não', style: 'cancel' },
      { text: 'Ativar', onPress: () => definirBiometria(true) },
    ]);
  }

  async function cadastrar() {
    if (!preenchido || salvando) return;
    setErro(null);
    setSalvando(true);
    try {
      await criarConta({ nome, email, senha, confirmacao });
      // A conta já está aberta: o app segue sozinho para o perfil financeiro.
      oferecerBiometria();
    } catch (e) {
      setErro(e instanceof ErroValidacao ? e.message : 'Não foi possível criar a conta. Tente novamente.');
      setSalvando(false);
    }
  }

  return (
    <TelaAcesso
      titulo="Crie sua conta"
      subtitulo="Leva menos de um minuto. Depois, o EcoTrust conhece sua vida financeira.">
      <TextInput
        style={estiloCampo}
        value={nome}
        onChangeText={setNome}
        placeholder="Seu nome"
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Seu nome"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        maxLength={40}
      />
      <TextInput
        style={estiloCampo}
        value={email}
        onChangeText={setEmail}
        placeholder="E-mail"
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="E-mail"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
      />
      <CampoSenha
        rotulo="Senha"
        value={senha}
        onChangeText={setSenha}
        placeholder="Senha (8+ caracteres, letras e números)"
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <CampoSenha
        rotulo="Confirmar senha"
        value={confirmacao}
        onChangeText={setConfirmacao}
        placeholder="Confirme a senha"
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={cadastrar}
      />

      {erro && (
        <ThemedText type="small" style={{ color: theme.negative }} accessibilityLiveRegion="polite">
          {erro}
        </ThemedText>
      )}

      {salvando ? (
        <ActivityIndicator color={theme.accent} accessibilityLabel="Criando conta" />
      ) : (
        <Botao texto="Criar conta" disabled={!preenchido} onPress={cadastrar} />
      )}

      <ThemedText type="small" themeColor="textSecondary" style={styles.aviso}>
        Sua conta e seus dados ficam guardados só neste celular, com a senha protegida. Nada é enviado
        para a internet.
      </ThemedText>
    </TelaAcesso>
  );
}

const styles = StyleSheet.create({
  campo: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  aviso: {
    textAlign: 'center',
  },
});
