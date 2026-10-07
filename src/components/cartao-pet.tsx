import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BarraProgresso } from '@/components/barra-progresso';
import { PetEco } from '@/components/pet-eco';
import { Botao, Cartao } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { usePet } from '@/hooks/use-dados';
import { useConta } from '@/hooks/use-sessao';
import { useTheme } from '@/hooks/use-theme';
import { ErroValidacao } from '@/services/erros';
import { renomearPet, ROTULO_HUMOR } from '@/services/pet-service';

/** O mascote do EcoTrust: conversa, reage aos seus hábitos e cresce com o seu nível. */
export function CartaoPet() {
  const theme = useTheme();
  const conta = useConta();
  const pet = usePet(conta?.nome ?? '', conta?.criadoEm ?? null);
  const [indiceFala, setIndiceFala] = useState(0);
  const [editandoNome, setEditandoNome] = useState(false);
  const [novoNome, setNovoNome] = useState(pet.nome);

  const fala = pet.falas[indiceFala % pet.falas.length];
  const corEnergia = pet.energia >= 60 ? theme.statusGood : pet.energia >= 30 ? theme.statusWarning : theme.statusCritical;

  function salvarNome() {
    try {
      renomearPet(novoNome);
      setEditandoNome(false);
    } catch (e) {
      Alert.alert('Nome inválido', e instanceof ErroValidacao ? e.message : 'Tente outro nome.');
    }
  }

  return (
    <Cartao>
      {/* Nome, estágio e humor */}
      <View style={styles.linha}>
        {editandoNome ? (
          <View style={[styles.linha, styles.flex]}>
            <TextInput
              style={[styles.campoNome, { color: theme.text, backgroundColor: theme.background }]}
              value={novoNome}
              onChangeText={setNovoNome}
              maxLength={16}
              autoFocus
              onSubmitEditing={salvarNome}
              accessibilityLabel="Nome do seu companheiro"
            />
            <Pressable onPress={salvarNome} accessibilityRole="button" hitSlop={8}>
              <ThemedText type="smallBold" style={{ color: theme.accentText }}>
                Salvar
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            <ThemedText type="smallBold" style={styles.nomePet}>
              {pet.nome}
            </ThemedText>
            <Pressable
              onPress={() => {
                setNovoNome(pet.nome);
                setEditandoNome(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Renomear ${pet.nome}`}
              hitSlop={8}>
              <ThemedText type="small" themeColor="textSecondary">
                ✎
              </ThemedText>
            </Pressable>
            <View style={styles.flex} />
            <ThemedText type="small" themeColor="textSecondary">
              {pet.nomeEstagio} · {ROTULO_HUMOR[pet.humor]}
            </ThemedText>
          </>
        )}
      </View>

      {/* Balão de fala */}
      <Pressable onPress={() => setIndiceFala(indiceFala + 1)} accessibilityRole="button" accessibilityHint="Mostra a próxima frase">
        <Animated.View
          key={indiceFala}
          entering={FadeIn.duration(250)}
          style={[styles.balao, { backgroundColor: theme.backgroundSelected }]}
          accessibilityLiveRegion="polite">
          <ThemedText type="small">{fala}</ThemedText>
          <View style={[styles.rabinho, { borderTopColor: theme.backgroundSelected }]} />
        </Animated.View>
      </Pressable>

      <View style={styles.centro}>
        <PetEco
          humor={pet.humor}
          estagio={pet.estagio}
          aoTocar={() => setIndiceFala(indiceFala + 1)}
          rotuloAcessivel={`${pet.nome}, ${pet.nomeEstagio}, está ${ROTULO_HUMOR[pet.humor].toLocaleLowerCase('pt-BR')}. Diz: ${fala}`}
        />
      </View>

      {/* Energia */}
      <View style={styles.linha}>
        <ThemedText type="small" themeColor="textSecondary">
          Energia
        </ThemedText>
        <View style={styles.flex}>
          <BarraProgresso percentual={pet.energia} cor={corEnergia} rotuloAcessivel={`Energia de ${pet.nome}`} />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {pet.energia}%
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Registrar gastos alimenta o {pet.nome}.{pet.proximaEvolucao ? ` ${pet.proximaEvolucao}` : ''}
      </ThemedText>

      <Botao texto="Ver minha saúde financeira" variante="secundario" onPress={() => router.push('/saude-financeira')} />
    </Cartao>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  nomePet: {
    fontSize: 18,
    lineHeight: 24,
  },
  campoNome: {
    flex: 1,
    fontSize: 16,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  balao: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    marginTop: Spacing.one,
  },
  rabinho: {
    position: 'absolute',
    bottom: -10,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  centro: {
    alignItems: 'center',
  },
});
