/**
 * Perguntas do perfil financeiro, uma por tela. Usado no onboarding e para editar o perfil depois.
 */

import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { CampoValor } from '@/components/campo-valor';
import { Botao, Cartao } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ErroValidacao } from '@/services/erros';
import {
  calcularSobraEstimada,
  FONTES_RENDA,
  OBJETIVOS,
  primeiroNome,
  rotuloFonteRenda,
  rotuloObjetivo,
  salvarPerfil,
  sugerirMetasEconomia,
} from '@/services/perfil-financeiro-service';
import type { FonteRenda, ObjetivoFinanceiro, PerfilFinanceiro } from '@/types/financas';
import { centavosParaTexto, formatarCentavos, lerValorEmCentavos } from '@/utils/moeda';

type Props = {
  modo: 'onboarding' | 'edicao';
  inicial?: PerfilFinanceiro | null;
};

const TOTAL_PERGUNTAS = 5;

export function FluxoPerfil({ modo, inicial }: Props) {
  const theme = useTheme();
  const [passo, setPasso] = useState(0);
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [rendaTexto, setRendaTexto] = useState(
    inicial ? centavosParaTexto(inicial.rendaMensalCentavos) : '',
  );
  const [fonteRenda, setFonteRenda] = useState<FonteRenda | null>(inicial?.fonteRenda ?? null);
  const [fixasTexto, setFixasTexto] = useState(
    inicial ? centavosParaTexto(inicial.despesasFixasCentavos) : '',
  );
  const [objetivo, setObjetivo] = useState<ObjetivoFinanceiro | null>(inicial?.objetivo ?? null);
  const [metaTexto, setMetaTexto] = useState(
    inicial ? centavosParaTexto(inicial.metaEconomiaCentavos) : '',
  );

  const renda = lerValorEmCentavos(rendaTexto, true);
  const fixas = lerValorEmCentavos(fixasTexto, true);
  const meta = lerValorEmCentavos(metaTexto, true);
  const sobra = renda !== null && fixas !== null ? calcularSobraEstimada(renda, fixas) : null;
  const nomeCurto = primeiroNome(nome);

  const passoValido = [
    nome.trim().length > 0,
    renda !== null && fonteRenda !== null,
    fixas !== null,
    objetivo !== null,
    meta !== null,
    true,
  ][passo];

  function voltar() {
    if (passo > 0) setPasso(passo - 1);
    else if (modo === 'edicao') router.back();
  }

  function concluir() {
    if (renda === null || fixas === null || meta === null || !fonteRenda || !objetivo) return;
    try {
      salvarPerfil({
        nome,
        rendaMensalCentavos: renda,
        fonteRenda,
        despesasFixasCentavos: fixas,
        objetivo,
        metaEconomiaCentavos: meta,
      });
      // No onboarding, salvar o perfil libera as abas e o app troca de tela sozinho.
      if (modo === 'edicao') router.back();
    } catch (erro) {
      Alert.alert(
        'Não foi possível salvar',
        erro instanceof ErroValidacao ? erro.message : 'Tente novamente.',
      );
    }
  }

  function avancar() {
    if (!passoValido) return;
    if (passo < TOTAL_PERGUNTAS) setPasso(passo + 1);
    else concluir();
  }

  const campoValor = (valor: string, aoMudar: (t: string) => void, rotulo: string) => (
    <CampoValor valor={valor} aoMudar={aoMudar} rotulo={rotulo} autoFocus aoConfirmar={avancar} />
  );

  let conteudo: ReactNode;
  switch (passo) {
    case 0:
      conteudo = (
        <>
          {modo === 'onboarding' && (
            <ThemedText themeColor="textSecondary">
              Olá! Eu sou o EcoTrust, seu assistente financeiro. Vou te fazer 5 perguntas rápidas
              para entender sua vida financeira.
            </ThemedText>
          )}
          <Pergunta>Como podemos te chamar?</Pergunta>
          <TextInput
            style={[styles.inputTexto, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            value={nome}
            onChangeText={setNome}
            placeholder="Seu nome"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="Seu nome"
            autoCapitalize="words"
            autoComplete="given-name"
            maxLength={40}
            autoFocus
            returnKeyType="next"
            onSubmitEditing={avancar}
          />
        </>
      );
      break;

    case 1:
      conteudo = (
        <>
          <Pergunta>{nomeCurto ? `${nomeCurto}, quanto` : 'Quanto'} você recebe por mês?</Pergunta>
          {campoValor(rendaTexto, setRendaTexto, 'Renda mensal em reais')}
          <Dica>Se a sua renda varia, use uma média dos últimos meses.</Dica>
          <ThemedText type="smallBold" style={styles.subpergunta}>
            De onde vem a maior parte?
          </ThemedText>
          <Opcoes
            opcoes={FONTES_RENDA.map((f) => ({ valor: f.valor, rotulo: f.rotulo }))}
            selecionada={fonteRenda}
            aoEscolher={setFonteRenda}
          />
        </>
      );
      break;

    case 2:
      conteudo = (
        <>
          <Pergunta>Quanto você gasta por mês com contas fixas?</Pergunta>
          {campoValor(fixasTexto, setFixasTexto, 'Despesas fixas mensais em reais')}
          <Dica>
            Some o que se repete todo mês: aluguel ou financiamento, condomínio, luz, água, internet,
            celular, escola, planos e assinaturas. Um valor aproximado já ajuda.
          </Dica>
          {sobra !== null && (
            <Cartao>
              <ThemedText type="small" themeColor="textSecondary">
                Sobra estimada depois das contas fixas
              </ThemedText>
              <ThemedText
                style={[styles.destaque, { color: sobra >= 0 ? theme.positive : theme.negative }]}>
                {formatarCentavos(sobra)}
              </ThemedText>
              {sobra < 0 && (
                <ThemedText type="small">
                  Suas contas fixas passam da sua renda. O EcoTrust vai te ajudar a encontrar onde
                  ajustar.
                </ThemedText>
              )}
            </Cartao>
          )}
        </>
      );
      break;

    case 3:
      conteudo = (
        <>
          <Pergunta>Qual é o seu principal objetivo agora?</Pergunta>
          <Opcoes
            opcoes={OBJETIVOS.map((o) => ({ valor: o.valor, rotulo: o.rotulo, descricao: o.descricao }))}
            selecionada={objetivo}
            aoEscolher={setObjetivo}
            emLista
          />
        </>
      );
      break;

    case 4: {
      const sugestoes = renda !== null && fixas !== null ? sugerirMetasEconomia(renda, fixas) : [];
      conteudo = (
        <>
          <Pergunta>Quanto você quer guardar por mês?</Pergunta>
          {campoValor(metaTexto, setMetaTexto, 'Meta de economia mensal em reais')}
          {sugestoes.length > 0 && (
            <>
              <Dica>Sugestões com base na sua renda:</Dica>
              <View style={styles.linhaOpcoes}>
                {sugestoes.map((s) => (
                  <Botao
                    key={s}
                    texto={formatarCentavos(s)}
                    variante="secundario"
                    selecionado={meta === s}
                    onPress={() => setMetaTexto(centavosParaTexto(s))}
                  />
                ))}
                <Botao
                  texto="Ainda não sei"
                  variante="secundario"
                  selecionado={meta === 0}
                  onPress={() => setMetaTexto('0')}
                />
              </View>
            </>
          )}
          {meta !== null && sobra !== null && meta > Math.max(sobra, 0) && (
            <ThemedText type="small" style={{ color: theme.negative }}>
              Essa meta é maior do que a sobra estimada ({formatarCentavos(Math.max(sobra, 0))}). Você
              pode manter, mas vai precisar reduzir outros gastos.
            </ThemedText>
          )}
          {meta === 0 && <Dica>Sem problemas. Você pode definir uma meta depois.</Dica>}
        </>
      );
      break;
    }

    default:
      conteudo = (
        <>
          <Pergunta>
            {modo === 'onboarding' ? `Tudo pronto, ${nomeCurto}!` : 'Confira seus dados'}
          </Pergunta>
          <Cartao>
            <LinhaResumo rotulo="Renda mensal" valor={formatarCentavos(renda ?? 0)} />
            <LinhaResumo rotulo="Fonte de renda" valor={fonteRenda ? rotuloFonteRenda(fonteRenda) : '-'} />
            <LinhaResumo rotulo="Contas fixas" valor={formatarCentavos(fixas ?? 0)} />
            <LinhaResumo rotulo="Sobra estimada" valor={formatarCentavos(sobra ?? 0)} />
            <LinhaResumo rotulo="Objetivo" valor={objetivo ? rotuloObjetivo(objetivo) : '-'} />
            <LinhaResumo rotulo="Meta por mês" valor={formatarCentavos(meta ?? 0)} />
          </Cartao>
          {modo === 'onboarding' && (
            <Dica>
              Agora registre suas receitas e despesas para o EcoTrust analisar sua vida financeira.
              Você pode mudar esses dados quando quiser, na aba Perfil.
            </Dica>
          )}
        </>
      );
  }

  const ultimoPasso = passo === TOTAL_PERGUNTAS;
  const textoBotao = ultimoPasso
    ? modo === 'onboarding'
      ? 'Ir para o Dashboard'
      : 'Salvar alterações'
    : 'Continuar';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.topo}>
            {passo > 0 || modo === 'edicao' ? (
              <Pressable onPress={voltar} accessibilityRole="button" hitSlop={12}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {passo === 0 ? 'Cancelar' : '‹ Voltar'}
                </ThemedText>
              </Pressable>
            ) : (
              <View />
            )}
            <ThemedText type="small" themeColor="textSecondary">
              {ultimoPasso ? 'Resumo' : `${passo + 1} de ${TOTAL_PERGUNTAS}`}
            </ThemedText>
          </View>
          <View
            style={[styles.trilho, { backgroundColor: theme.backgroundSelected }]}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: TOTAL_PERGUNTAS, now: passo }}>
            <View
              style={[
                styles.progresso,
                { width: `${(passo / TOTAL_PERGUNTAS) * 100}%`, backgroundColor: theme.accent },
              ]}
            />
          </View>

          <ScrollView
            key={passo}
            style={styles.flex}
            contentContainerStyle={styles.conteudo}
            keyboardShouldPersistTaps="handled">
            {conteudo}
          </ScrollView>

          <View style={styles.rodape}>
            <Botao texto={textoBotao} disabled={!passoValido} onPress={avancar} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Pergunta({ children }: { children: ReactNode }) {
  return (
    <ThemedText style={styles.pergunta} accessibilityRole="header">
      {children}
    </ThemedText>
  );
}

function Dica({ children }: { children: ReactNode }) {
  return (
    <ThemedText type="small" themeColor="textSecondary">
      {children}
    </ThemedText>
  );
}

function LinhaResumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={styles.linhaResumo}>
      <ThemedText type="small" themeColor="textSecondary">
        {rotulo}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.valorResumo}>
        {valor}
      </ThemedText>
    </View>
  );
}

function Opcoes<T extends string>({
  opcoes,
  selecionada,
  aoEscolher,
  emLista,
}: {
  opcoes: { valor: T; rotulo: string; descricao?: string }[];
  selecionada: T | null;
  aoEscolher: (valor: T) => void;
  emLista?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={emLista ? styles.lista : styles.linhaOpcoes} accessibilityRole="radiogroup">
      {opcoes.map((o) => {
        const ativa = o.valor === selecionada;
        return (
          <Pressable
            key={o.valor}
            onPress={() => aoEscolher(o.valor)}
            accessibilityRole="radio"
            accessibilityState={{ checked: ativa }}
            style={({ pressed }) => [
              emLista ? styles.opcaoLista : styles.chip,
              { backgroundColor: ativa ? theme.accent : theme.backgroundElement },
              pressed && styles.pressionado,
            ]}>
            <ThemedText type={emLista ? 'smallBold' : 'small'} style={ativa && { color: theme.onAccent }}>
              {o.rotulo}
            </ThemedText>
            {o.descricao && (
              <ThemedText
                type="small"
                themeColor={ativa ? undefined : 'textSecondary'}
                style={ativa && { color: theme.onAccent }}>
                {o.descricao}
              </ThemedText>
            )}
          </Pressable>
        );
      })}
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
    minHeight: 44,
  },
  trilho: {
    height: 4,
    marginHorizontal: Spacing.three,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progresso: {
    height: '100%',
    borderRadius: 2,
  },
  conteudo: {
    padding: Spacing.three,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  pergunta: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: 700,
  },
  subpergunta: {
    marginTop: Spacing.two,
  },
  inputTexto: {
    fontSize: 20,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  destaque: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: 700,
  },
  linhaOpcoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  lista: {
    gap: Spacing.two,
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
  opcaoLista: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  pressionado: {
    opacity: 0.7,
  },
  linhaResumo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  valorResumo: {
    flexShrink: 1,
    textAlign: 'right',
  },
  rodape: {
    padding: Spacing.three,
  },
});
