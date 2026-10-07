import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Botao } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePerfilInvestidor } from '@/hooks/use-dados';
import { montarContextoIA } from '@/services/contexto-ia-service';

type Mensagem = { role: 'user' | 'assistant'; content: string };

const SUGESTOES = [
  'Como estão meus gastos este mês?',
  'Onde posso reduzir meus gastos?',
  'Como chego mais rápido na minha meta?',
  'Por onde começo a investir?',
];

/** Chat com o Claude ("Perguntar ao EcoTrust"), mostrado dentro da aba EcoTrust IA. */
export function PainelChat() {
  const theme = useTheme();
  const perfil = usePerfilInvestidor();
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [carregando, setCarregando] = useState(false);
  const rolagem = useRef<ScrollView>(null);

  async function enviar(conteudo: string) {
    const pergunta = conteudo.trim();
    if (!pergunta || carregando) return;

    const historico: Mensagem[] = [...mensagens, { role: 'user', content: pergunta }];
    setMensagens(historico);
    setTexto('');
    setCarregando(true);

    try {
      const resposta = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagens: historico,
          contexto: montarContextoIA(),
        }),
      });
      const dados = (await resposta.json()) as { resposta?: string; erro?: string };
      setMensagens([
        ...historico,
        { role: 'assistant', content: dados.resposta ?? dados.erro ?? 'Não consegui responder agora.' },
      ]);
    } catch {
      setMensagens([
        ...historico,
        {
          role: 'assistant',
          content: 'Não consegui me conectar ao servidor. Confira se o "npx expo start" está rodando.',
        },
      ]);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={rolagem}
        style={styles.flex}
        contentContainerStyle={styles.conversa}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => rolagem.current?.scrollToEnd({ animated: true })}>
        {mensagens.length === 0 && (
          <View style={styles.vazio}>
            <ThemedText type="small" themeColor="textSecondary">
              Pergunte sobre seus gastos, orçamento, metas, como montar uma reserva ou quais
              tipos de investimento combinam com você. O EcoTrust vê o resumo dos seus dados,
              não cada lançamento.
            </ThemedText>
            {!perfil && (
              <ThemedText type="small" style={{ color: theme.negative }}>
                Dica: responda o questionário na aba Perfil para receber orientações mais
                adequadas.
              </ThemedText>
            )}
            {SUGESTOES.map((s) => (
              <Botao key={s} texto={s} variante="secundario" onPress={() => enviar(s)} />
            ))}
          </View>
        )}

        {mensagens.map((m, i) => (
          <ThemedView
            key={i}
            type={m.role === 'user' ? undefined : 'backgroundElement'}
            style={[
              styles.balao,
              m.role === 'user'
                ? [styles.balaoUsuario, { backgroundColor: theme.accent }]
                : styles.balaoAssistente,
            ]}>
            <ThemedText style={m.role === 'user' && { color: theme.onAccent }}>{m.content}</ThemedText>
          </ThemedView>
        ))}

        {carregando && <ActivityIndicator color={theme.accent} style={styles.carregando} />}

        {mensagens.length > 0 && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.aviso}>
            Conteúdo educativo, não é recomendação de investimento.
          </ThemedText>
        )}
      </ScrollView>

      <View style={styles.entrada}>
        <TextInput
          style={[styles.campo, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          placeholder="Escreva sua pergunta..."
          placeholderTextColor={theme.textSecondary}
          value={texto}
          onChangeText={setTexto}
          multiline
        />
        <Pressable
          onPress={() => enviar(texto)}
          disabled={carregando || !texto.trim()}
          style={[
            styles.enviar,
            { backgroundColor: theme.accent },
            (carregando || !texto.trim()) && styles.apagado,
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
            Enviar
          </ThemedText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  conversa: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  vazio: {
    gap: Spacing.two,
  },
  balao: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    maxWidth: '88%',
  },
  balaoUsuario: {
    alignSelf: 'flex-end',
  },
  balaoAssistente: {
    alignSelf: 'flex-start',
  },
  carregando: {
    alignSelf: 'flex-start',
    margin: Spacing.two,
  },
  aviso: {
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  entrada: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.two,
  },
  campo: {
    flex: 1,
    maxHeight: 120,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
    fontSize: 16,
  },
  enviar: {
    paddingVertical: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  apagado: {
    opacity: 0.5,
  },
});
