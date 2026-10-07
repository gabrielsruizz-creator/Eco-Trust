import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { BloqueioPremium } from '@/components/bloqueio-premium';
import { Botao, Cartao } from '@/components/tela';
import { TelaSecundaria } from '@/components/tela-secundaria';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAssinatura, useTopico } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import { temAcesso } from '@/services/assinatura-service';
import { ErroValidacao } from '@/services/erros';
import { excluirResposta, excluirTopico, LIMITES_FORUM, responderTopico } from '@/services/forum-service';
import { tempoRelativo } from '@/utils/datas';
import { vibrarErro, vibrarSucesso } from '@/utils/vibracao';

export default function TopicoScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dados = useTopico(Number(id));
  const plus = temAcesso('academy', useAssinatura());
  const [resposta, setResposta] = useState('');

  if (!plus) {
    return (
      <TelaSecundaria titulo="Tópico">
        <BloqueioPremium recurso="academy" />
      </TelaSecundaria>
    );
  }

  if (!dados) {
    return (
      <TelaSecundaria titulo="Tópico">
        <ThemedText themeColor="textSecondary">Este tópico não existe mais.</ThemedText>
        <Botao texto="Voltar" onPress={() => router.back()} />
      </TelaSecundaria>
    );
  }

  const { topico, categoria, respostas } = dados;

  function enviar() {
    try {
      responderTopico(topico.id, resposta);
      setResposta('');
      vibrarSucesso();
    } catch (erro) {
      vibrarErro();
      Alert.alert('Não foi possível responder', erro instanceof ErroValidacao ? erro.message : 'Tente novamente.');
    }
  }

  function confirmarExclusao(tipo: 'topico' | 'resposta', idItem: number) {
    Alert.alert(
      tipo === 'topico' ? 'Excluir tópico' : 'Excluir resposta',
      tipo === 'topico' ? 'O tópico e todas as respostas serão apagados.' : 'Sua resposta será apagada.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            if (tipo === 'topico') {
              excluirTopico(idItem);
              router.back();
            } else {
              excluirResposta(idItem);
            }
          },
        },
      ],
    );
  }

  const podeEnviar = resposta.trim().length >= LIMITES_FORUM.resposta.min;

  return (
    <TelaSecundaria
      titulo={categoria?.nome ?? 'Tópico'}
      rodape={
        <View style={styles.composicao}>
          <TextInput
            value={resposta}
            onChangeText={setResposta}
            placeholder="Escreva uma resposta..."
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={LIMITES_FORUM.resposta.max}
            accessibilityLabel="Sua resposta"
            style={[styles.campo, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          />
          <Botao texto="Enviar" onPress={enviar} disabled={!podeEnviar} style={styles.enviar} />
        </View>
      }>
      <Cartao>
        {topico.exemplo && (
          <ThemedText type="small" themeColor="textSecondary">
            Tópico de exemplo
          </ThemedText>
        )}
        <ThemedText style={styles.titulo} accessibilityRole="header">
          {topico.titulo}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {topico.autor} · {tempoRelativo(topico.criadoEm)}
        </ThemedText>
        <ThemedText>{topico.texto}</ThemedText>
        {topico.meu && (
          <Pressable
            onPress={() => confirmarExclusao('topico', topico.id)}
            accessibilityRole="button"
            hitSlop={12}
            style={styles.excluir}>
            <ThemedText type="smallBold" style={{ color: theme.negative }}>
              Excluir tópico
            </ThemedText>
          </Pressable>
        )}
      </Cartao>

      <ThemedText type="smallBold" accessibilityRole="header">
        {respostas.length === 0
          ? 'Nenhuma resposta ainda'
          : respostas.length === 1
            ? '1 resposta'
            : `${respostas.length} respostas`}
      </ThemedText>

      {respostas.map((r) => (
        <View
          key={r.id}
          style={[
            styles.resposta,
            { backgroundColor: r.meu ? theme.accentSoft : theme.backgroundElement, borderColor: theme.border },
          ]}>
          <ThemedText type="smallBold">
            {r.meu ? 'Você' : r.autor}
            <ThemedText type="small" themeColor="textSecondary">
              {' '}
              · {tempoRelativo(r.criadoEm)}
            </ThemedText>
          </ThemedText>
          <ThemedText type="small">{r.texto}</ThemedText>
          {r.meu && (
            <Pressable
              onPress={() => confirmarExclusao('resposta', r.id)}
              accessibilityRole="button"
              accessibilityLabel="Excluir sua resposta"
              hitSlop={12}
              style={styles.excluir}>
              <ThemedText type="small" style={{ color: theme.negative }}>
                Excluir
              </ThemedText>
            </Pressable>
          )}
        </View>
      ))}
    </TelaSecundaria>
  );
}

const styles = StyleSheet.create({
  titulo: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 700,
  },
  excluir: {
    alignSelf: 'flex-start',
    minHeight: 32,
    justifyContent: 'center',
  },
  resposta: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one,
  },
  composicao: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  campo: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  enviar: {
    minWidth: 88,
  },
});
