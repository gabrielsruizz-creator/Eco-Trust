import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { BloqueioPremium } from '@/components/bloqueio-premium';
import { Botao, Cartao } from '@/components/tela';
import { TelaSecundaria } from '@/components/tela-secundaria';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAssinatura, useAula } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import { concluirAula, type DadosAula } from '@/services/academy-service';
import { temAcesso } from '@/services/assinatura-service';
import { ErroValidacao } from '@/services/erros';
import { vibrarErro, vibrarSucesso } from '@/utils/vibracao';

const BRANCO = '#FFFFFF';

export default function AulaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dados = useAula(String(id));
  const plus = temAcesso('academy', useAssinatura());

  if (!plus) {
    return (
      <TelaSecundaria titulo="Aula">
        <BloqueioPremium
          recurso="academy"
          previa={dados ? <ThemedText type="smallBold">{dados.aula.titulo}</ThemedText> : undefined}
        />
      </TelaSecundaria>
    );
  }

  if (!dados) {
    return (
      <TelaSecundaria titulo="Aula">
        <ThemedText themeColor="textSecondary">Aula não encontrada.</ThemedText>
        <Botao texto="Voltar" onPress={() => router.back()} />
      </TelaSecundaria>
    );
  }

  // A chave reinicia a pergunta ao trocar de aula.
  return <ConteudoAula key={dados.aula.id} dados={dados} />;
}

function ConteudoAula({ dados }: { dados: DadosAula }) {
  const theme = useTheme();
  const { aula, curso, categoria, numero, total, proxima, registro } = dados;
  const [escolhida, setEscolhida] = useState<number | null>(null);
  const [cursoTerminado, setCursoTerminado] = useState(false);
  const respondeu = escolhida !== null;
  const acertou = escolhida === aula.quiz.correta;

  function irParaProxima() {
    if (proxima) router.replace({ pathname: '/academy/aula/[id]', params: { id: proxima.id } });
    else router.back();
  }

  function concluir() {
    if (escolhida === null) return;
    try {
      concluirAula(aula.id, escolhida);
      vibrarSucesso();
      if (proxima) irParaProxima();
      else setCursoTerminado(true);
    } catch (erro) {
      vibrarErro();
      Alert.alert('Não foi possível concluir', erro instanceof ErroValidacao ? erro.message : 'Tente novamente.');
    }
  }

  let rodape;
  if (cursoTerminado) {
    rodape = <Botao texto="Voltar ao curso" onPress={() => router.back()} />;
  } else if (respondeu) {
    rodape = <Botao texto={proxima ? 'Concluir e ir para a próxima' : 'Concluir o curso'} onPress={concluir} />;
  } else if (registro) {
    rodape = (
      <Botao texto={proxima ? 'Próxima aula' : 'Voltar ao curso'} variante="secundario" onPress={irParaProxima} />
    );
  } else {
    rodape = (
      <ThemedText type="small" themeColor="textSecondary" style={styles.centro}>
        Responda a pergunta no fim da aula para concluir.
      </ThemedText>
    );
  }

  return (
    <TelaSecundaria titulo={`Aula ${numero} de ${total}`} rodape={rodape}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.etiqueta}>
        {categoria.icone} {curso.titulo} · {aula.minutos} min de leitura
      </ThemedText>
      <ThemedText style={styles.titulo} accessibilityRole="header">
        {aula.titulo}
      </ThemedText>
      {registro && (
        <ThemedText type="small" style={{ color: theme.positive }}>
          ✓ Você já concluiu esta aula
        </ThemedText>
      )}

      {aula.paragrafos.map((p, i) => (
        <ThemedText key={i} style={styles.paragrafo}>
          {p}
        </ThemedText>
      ))}

      <View style={[styles.pontos, { backgroundColor: theme.accentSoft }]}>
        <ThemedText type="smallBold" style={{ color: theme.accentText }}>
          Pontos-chave
        </ThemedText>
        {aula.pontosChave.map((p) => (
          <ThemedText key={p} type="small">
            • {p}
          </ThemedText>
        ))}
      </View>

      <Cartao>
        <ThemedText type="small" themeColor="textSecondary" style={styles.etiqueta}>
          Pergunta de fixação
        </ThemedText>
        <ThemedText type="smallBold" accessibilityRole="header">
          {aula.quiz.pergunta}
        </ThemedText>
        <View accessibilityRole="radiogroup" style={styles.opcoes}>
          {aula.quiz.opcoes.map((opcao, i) => {
            const marcada = escolhida === i;
            const certa = respondeu && i === aula.quiz.correta;
            const errada = marcada && !acertou;
            const borda = certa ? theme.positive : errada ? theme.negative : theme.border;
            const fundo = certa ? theme.positiveSoft : errada ? theme.negativeSoft : theme.background;
            return (
              <Pressable
                key={opcao}
                onPress={() => setEscolhida(i)}
                disabled={respondeu}
                accessibilityRole="radio"
                accessibilityState={{ checked: marcada, disabled: respondeu }}
                accessibilityLabel={`${opcao}${certa ? ', resposta certa' : ''}${errada ? ', sua resposta, incorreta' : ''}`}
                style={[styles.opcao, { borderColor: borda, backgroundColor: fundo }]}>
                <ThemedText
                  style={[styles.marcador, { color: certa ? theme.positive : errada ? theme.negative : theme.textSecondary }]}>
                  {certa ? '✓' : errada ? '✕' : '○'}
                </ThemedText>
                <ThemedText type="small" style={styles.flex}>
                  {opcao}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        {respondeu && (
          <View accessibilityLiveRegion="polite" style={styles.feedback}>
            <ThemedText type="smallBold" style={{ color: acertou ? theme.positive : theme.negative }}>
              {acertou ? '✓ Isso mesmo!' : '✕ Não foi dessa vez'}
            </ThemedText>
            <ThemedText type="small">{aula.quiz.explicacao}</ThemedText>
          </View>
        )}
      </Cartao>

      {cursoTerminado && (
        <View style={[styles.parabens, { backgroundColor: categoria.cor }]} accessibilityLiveRegion="polite">
          <ThemedText style={styles.parabensIcone}>🎓</ThemedText>
          <ThemedText style={[styles.parabensTitulo, { color: BRANCO }]}>Curso concluído!</ThemedText>
          <ThemedText type="small" style={[styles.centro, { color: BRANCO }]}>
            Você terminou “{curso.titulo}”. Que tal colocar em prática no app hoje?
          </ThemedText>
        </View>
      )}
    </TelaSecundaria>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centro: {
    textAlign: 'center',
  },
  etiqueta: {
    textTransform: 'uppercase',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
  },
  titulo: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: 700,
  },
  paragrafo: {
    lineHeight: 26,
  },
  pontos: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  opcoes: {
    gap: Spacing.two,
  },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
  },
  marcador: {
    width: 20,
    textAlign: 'center',
    fontWeight: 700,
  },
  feedback: {
    gap: Spacing.one,
  },
  parabens: {
    alignItems: 'center',
    gap: Spacing.one,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  parabensIcone: {
    fontSize: 40,
    lineHeight: 48,
  },
  parabensTitulo: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 700,
  },
});
