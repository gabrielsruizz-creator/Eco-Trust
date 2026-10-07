/**
 * Chat do cadastro: o EcoTrust pergunta e a pessoa responde com botões ou digitando.
 * A lógica (perguntas, validação, reações, salvar) fica em onboarding-chat-service.
 */

import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { Botao } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ErroValidacao } from '@/services/erros';
import {
  concluirChat,
  passoAtual,
  responder,
  type PassoChat,
  type RespostasChat,
} from '@/services/onboarding-chat-service';
import { centavosParaTexto } from '@/utils/moeda';

type Troca = { passo: PassoChat; textoUsuario: string; reacao: string | null; antes: RespostasChat };

/** Atraso entre as mensagens do EcoTrust, para parecer uma conversa (ms). */
const RITMO = 450;

type Props = {
  nomeConta?: string;
  /** 'cadastro': primeiro acesso; 'atualizar': refazer a conversa a partir do Perfil */
  modo?: 'cadastro' | 'atualizar';
};

export function ChatCadastro({ nomeConta, modo = 'cadastro' }: Props) {
  const theme = useTheme();
  const [respostas, setRespostas] = useState<RespostasChat>({});
  const [historico, setHistorico] = useState<Troca[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const rolagem = useRef<ScrollView>(null);

  const passo = passoAtual(respostas, nomeConta);

  function enviar(resposta: string | string[]) {
    if (!passo) return;
    try {
      const resultado = responder(respostas, passo, resposta);
      setErro(null);
      if (resultado.respostas.confirmado) {
        if (modo === 'atualizar') {
          concluirChat(resultado.respostas, { pularMetasExistentes: true });
          router.back();
        } else {
          concluirChat(resultado.respostas); // libera o app: o Expo Router sai do cadastro sozinho
        }
        return;
      }
      const recomecou = passo.id === 'resumo';
      setHistorico(
        recomecou
          ? []
          : [...historico, { passo, textoUsuario: resultado.textoUsuario, reacao: resultado.reacao, antes: respostas }],
      );
      setRespostas(resultado.respostas);
    } catch (e) {
      if (e instanceof ErroValidacao) setErro(e.message);
      else Alert.alert('Algo deu errado', 'Não foi possível salvar suas respostas. Tente novamente.');
    }
  }

  function desfazer() {
    const ultima = historico.at(-1);
    if (!ultima) return;
    setRespostas(ultima.antes);
    setHistorico(historico.slice(0, -1));
    setErro(null);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topo}>
          <View style={styles.marca}>
            <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
              <ThemedText style={[styles.letraAvatar, { color: theme.onAccent }]}>E</ThemedText>
            </View>
            <View>
              <ThemedText type="smallBold">EcoTrust</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {modo === 'atualizar' ? 'Atualizando seu perfil' : 'Conhecendo você'}
              </ThemedText>
            </View>
          </View>
          {modo === 'atualizar' && historico.length === 0 && (
            <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={10}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Cancelar
              </ThemedText>
            </Pressable>
          )}
          {historico.length > 0 && (
            <Pressable onPress={desfazer} accessibilityRole="button" accessibilityLabel="Desfazer a última resposta" hitSlop={10}>
              <ThemedText type="smallBold" style={{ color: theme.accentText }}>
                Desfazer
              </ThemedText>
            </Pressable>
          )}
        </View>

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={rolagem}
            style={styles.flex}
            contentContainerStyle={styles.conversa}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => rolagem.current?.scrollToEnd({ animated: true })}>
            {historico.map((troca, i) => (
              <View key={`${i}-${troca.passo.id}`} style={styles.troca}>
                {troca.passo.mensagens.map((m, j) => (
                  <Balao key={j} autor="ecotrust" texto={m} />
                ))}
                <Balao autor="usuario" texto={troca.textoUsuario} />
                {troca.reacao && <Balao autor="ecotrust" texto={troca.reacao} />}
              </View>
            ))}

            {passo && (
              <View key={`atual-${historico.length}-${passo.id}`} style={styles.troca}>
                {passo.mensagens.map((m, j) => (
                  <Animated.View key={j} entering={FadeInDown.delay(150 + j * RITMO).duration(300)}>
                    <Balao autor="ecotrust" texto={m} />
                  </Animated.View>
                ))}
              </View>
            )}
          </ScrollView>

          {passo && (
            <Animated.View
              key={`entrada-${historico.length}-${passo.id}`}
              entering={FadeInDown.delay(150 + passo.mensagens.length * RITMO).duration(300)}
              style={[styles.entrada, { borderTopColor: theme.backgroundSelected }]}>
              {erro && (
                <ThemedText type="small" style={{ color: theme.negative }} accessibilityLiveRegion="polite">
                  {erro}
                </ThemedText>
              )}
              <EntradaResposta passo={passo} aoEnviar={enviar} />
            </Animated.View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Balao({ autor, texto }: { autor: 'ecotrust' | 'usuario'; texto: string }) {
  const theme = useTheme();
  const usuario = autor === 'usuario';
  return (
    <View
      style={[
        styles.balao,
        usuario
          ? [styles.balaoUsuario, { backgroundColor: theme.accent }]
          : [styles.balaoEcoTrust, { backgroundColor: theme.backgroundElement }],
      ]}
      accessible
      accessibilityLabel={`${usuario ? 'Você' : 'EcoTrust'}: ${texto}`}>
      <ThemedText style={usuario && { color: theme.onAccent }}>{texto}</ThemedText>
    </View>
  );
}

/** O jeito de responder muda conforme a pergunta: texto, valor, uma opção ou várias. */
function EntradaResposta({ passo, aoEnviar }: { passo: PassoChat; aoEnviar: (r: string | string[]) => void }) {
  const theme = useTheme();
  const [texto, setTexto] = useState('');
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const entrada = passo.entrada;

  if (entrada.tipo === 'opcoes') {
    return (
      <View style={styles.opcoes} accessibilityRole="radiogroup">
        {entrada.opcoes.map((o) => (
          <Botao key={o.valor} texto={o.rotulo} variante="secundario" onPress={() => aoEnviar(o.valor)} />
        ))}
      </View>
    );
  }

  if (entrada.tipo === 'multipla') {
    // "Nenhuma por enquanto" desmarca as outras (e vice-versa).
    const exclusiva = entrada.exclusiva;
    const alternar = (valor: string) => {
      if (valor === exclusiva) return setMarcadas(marcadas.includes(valor) ? [] : [valor]);
      const sem = marcadas.filter((m) => m !== exclusiva);
      setMarcadas(sem.includes(valor) ? sem.filter((m) => m !== valor) : [...sem, valor]);
    };
    return (
      <View style={styles.opcoes}>
        <View style={styles.chips}>
          {entrada.opcoes.map((o) => (
            <Chip key={o.valor} texto={o.rotulo} ativo={marcadas.includes(o.valor)} aoTocar={() => alternar(o.valor)} />
          ))}
        </View>
        <Botao texto="Continuar" disabled={marcadas.length === 0} onPress={() => aoEnviar(marcadas)} />
      </View>
    );
  }

  const ehValor = entrada.tipo === 'valor';
  return (
    <View style={styles.opcoes}>
      {entrada.sugestoes && entrada.sugestoes.length > 0 && (
        <View style={styles.chips}>
          {entrada.sugestoes.map((s) => (
            <Chip
              key={s.valor}
              texto={s.rotulo}
              ativo={false}
              aoTocar={() => aoEnviar(ehValor ? centavosParaTexto(Number(s.valor)) : s.valor)}
            />
          ))}
        </View>
      )}
      <View style={styles.linhaEntrada}>
        {ehValor && (
          <ThemedText type="smallBold" themeColor="textSecondary">
            R$
          </ThemedText>
        )}
        <TextInput
          style={[styles.campo, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          value={texto}
          onChangeText={setTexto}
          placeholder={ehValor ? '0,00' : entrada.placeholder}
          placeholderTextColor={theme.textSecondary}
          keyboardType={ehValor ? 'decimal-pad' : 'default'}
          autoCapitalize={ehValor ? 'none' : 'sentences'}
          accessibilityLabel={ehValor ? 'Valor em reais' : entrada.placeholder}
          returnKeyType="send"
          onSubmitEditing={() => texto.trim() && aoEnviar(texto)}
          autoFocus
        />
        <Pressable
          onPress={() => aoEnviar(texto)}
          disabled={!texto.trim()}
          accessibilityRole="button"
          accessibilityLabel="Enviar resposta"
          style={[styles.enviar, { backgroundColor: theme.accent }, !texto.trim() && styles.apagado]}>
          <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
            Enviar
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
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
  },
  marca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letraAvatar: {
    fontWeight: 800,
  },
  conversa: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  troca: {
    gap: Spacing.two,
  },
  balao: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    maxWidth: '85%',
  },
  balaoEcoTrust: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: Spacing.one,
  },
  balaoUsuario: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: Spacing.one,
  },
  entrada: {
    padding: Spacing.three,
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  opcoes: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  linhaEntrada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  campo: {
    flex: 1,
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
