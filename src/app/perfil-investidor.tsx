import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Botao, Cartao } from '@/components/tela';
import { TelaSecundaria } from '@/components/tela-secundaria';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { usePerfilInvestidor } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import {
  DESCRICAO_PERFIL,
  PERGUNTAS,
  responderQuestionario,
} from '@/services/perfil-investidor-service';

const AVISO =
  'Este questionário é simplificado e tem fins educativos. Ele não substitui a análise de perfil (suitability) feita por uma corretora ou consultor registrado na CVM.';

/** Perfil de investidor: resultado e questionário (movido da aba Perfil). */
export default function PerfilInvestidorScreen() {
  const theme = useTheme();
  const perfil = usePerfilInvestidor();
  const [refazendo, setRefazendo] = useState(false);
  const [respostas, setRespostas] = useState<(number | null)[]>(() => PERGUNTAS.map(() => null));

  if (perfil && !refazendo) {
    const descricao = DESCRICAO_PERFIL[perfil.tipo];
    return (
      <TelaSecundaria titulo="Perfil de investidor">
        <Cartao>
          <ThemedText type="small" themeColor="textSecondary">
            Seu perfil é
          </ThemedText>
          <ThemedText style={[styles.perfil, { color: theme.accentText }]}>{descricao.titulo}</ThemedText>
          <ThemedText type="small">{descricao.texto}</ThemedText>
          {!perfil.temReserva && (
            <ThemedText type="small" style={{ color: theme.negative }}>
              Antes de investir com risco, o ideal é montar uma reserva de emergência de 6 meses de
              gastos em algo seguro e com resgate rápido.
            </ThemedText>
          )}
        </Cartao>
        <Botao texto="Conversar com o EcoTrust" onPress={() => router.push('/insights')} />
        <Botao
          texto="Refazer questionário"
          variante="secundario"
          onPress={() => {
            setRespostas(PERGUNTAS.map(() => null));
            setRefazendo(true);
          }}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {AVISO}
        </ThemedText>
      </TelaSecundaria>
    );
  }

  const completo = respostas.every((r) => r !== null);

  return (
    <TelaSecundaria
      titulo="Perfil de investidor"
      rodape={
        <Botao
          texto="Ver meu perfil"
          disabled={!completo}
          onPress={() => {
            responderQuestionario(respostas as number[]);
            setRefazendo(false);
          }}
        />
      }>
      <ThemedText type="small" themeColor="textSecondary">
        Responda com sinceridade. Não existe resposta certa: o objetivo é entender como você lida com
        dinheiro e risco.
      </ThemedText>
      {PERGUNTAS.map((pergunta, i) => (
        <Cartao key={pergunta.texto}>
          <ThemedText type="smallBold">
            {i + 1}. {pergunta.texto}
          </ThemedText>
          {pergunta.opcoes.map((opcao, j) => {
            const selecionada = respostas[i] === j;
            return (
              <Pressable
                key={opcao.texto}
                onPress={() => setRespostas(respostas.map((r, k) => (k === i ? j : r)))}
                accessibilityRole="radio"
                accessibilityState={{ checked: selecionada }}
                style={[styles.opcao, { backgroundColor: selecionada ? theme.accent : theme.backgroundSelected }]}>
                <ThemedText type="small" style={selecionada && { color: theme.onAccent }}>
                  {opcao.texto}
                </ThemedText>
              </Pressable>
            );
          })}
        </Cartao>
      ))}
      <ThemedText type="small" themeColor="textSecondary">
        {AVISO}
      </ThemedText>
    </TelaSecundaria>
  );
}

const styles = StyleSheet.create({
  perfil: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: 700,
  },
  opcao: {
    padding: Spacing.two + Spacing.one,
    borderRadius: Spacing.two,
  },
});
