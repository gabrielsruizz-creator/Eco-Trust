import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { CampoData } from '@/components/calendario';
import { Chip } from '@/components/chip';
import { Botao } from '@/components/tela';
import { TelaSecundaria } from '@/components/tela-secundaria';
import { ThemedText } from '@/components/themed-text';
import { AvatarColors, Spacing } from '@/constants/theme';
import { useDadosPessoais } from '@/hooks/use-dados';
import { useConta } from '@/hooks/use-sessao';
import { useTheme } from '@/hooks/use-theme';
import { ErroValidacao } from '@/services/erros';
import { AVATARES, ESTADOS_CIVIS, salvarDadosPessoais } from '@/services/perfil-pessoal-service';
import type { EstadoCivil } from '@/types/financas';
import { formatarData, hoje, idadeEm, somarMesesNaData } from '@/utils/datas';

export default function EditarDadosPessoaisScreen() {
  const theme = useTheme();
  const conta = useConta();
  const inicial = useDadosPessoais();
  const [avatar, setAvatar] = useState(inicial.avatar);
  const [cor, setCor] = useState(inicial.corAvatar);
  const [dataNascimento, setDataNascimento] = useState<string | null>(inicial.dataNascimento);
  const [cidade, setCidade] = useState(inicial.cidade ?? '');
  const [profissao, setProfissao] = useState(inicial.profissao ?? '');
  const [estadoCivil, setEstadoCivil] = useState<EstadoCivil | null>(inicial.estadoCivil);
  const [dependentes, setDependentes] = useState<number | null>(inicial.dependentes);

  const estiloCampo = [styles.campo, { color: theme.text, backgroundColor: theme.backgroundElement }];

  function salvar() {
    try {
      salvarDadosPessoais({
        avatar,
        corAvatar: cor,
        dataNascimento,
        // Quem só tinha informado o ano continua com ele até escolher a data completa.
        anoNascimento: dataNascimento ? null : inicial.anoNascimento,
        cidade,
        profissao,
        estadoCivil,
        dependentes,
      });
      router.back();
    } catch (e) {
      Alert.alert('Não foi possível salvar', e instanceof ErroValidacao ? e.message : 'Tente novamente.');
    }
  }

  return (
    <TelaSecundaria
      titulo="Dados pessoais"
      textoVoltar="Cancelar"
      rodape={<Botao texto="Salvar" onPress={salvar} />}>
      <View style={styles.centro}>
        <Avatar nome={conta?.nome ?? ''} avatar={avatar} cor={cor} tamanho={88} />
      </View>

      <Secao titulo="Avatar">
        <View style={styles.grade} accessibilityRole="radiogroup">
          <Chip texto="Iniciais" ativo={avatar === null} aoTocar={() => setAvatar(null)} />
          {AVATARES.map((a) => (
            <Chip key={a} texto={a} ativo={avatar === a} aoTocar={() => setAvatar(a)} />
          ))}
        </View>
        <View style={styles.cores} accessibilityRole="radiogroup">
          {AvatarColors.map((c, i) => (
            <Pressable
              key={c}
              onPress={() => setCor(i)}
              accessibilityRole="radio"
              accessibilityState={{ checked: cor === i }}
              accessibilityLabel={`Cor ${i + 1}`}
              hitSlop={4}
              style={[styles.cor, { backgroundColor: c }, cor === i && { borderColor: theme.text }]}
            />
          ))}
        </View>
      </Secao>

      <Secao titulo="Data de nascimento">
        <CampoData
          rotulo="Data de nascimento"
          valor={dataNascimento}
          aoMudar={setDataNascimento}
          min={somarMesesNaData(hoje(), -110 * 12)}
          max={somarMesesNaData(hoje(), -10 * 12)}
          mesInicial={`${inicial.anoNascimento ?? Number(hoje().slice(0, 4)) - 30}-01`}
          visaoInicial={dataNascimento ? 'dias' : 'anos'}
          permitirLimpar
          formatar={(d) => `${formatarData(d)} · ${idadeEm(d)} anos`}
          placeholder={inicial.anoNascimento ? `Ano informado: ${inicial.anoNascimento}` : 'Escolher no calendário'}
        />
        {!dataNascimento && inicial.anoNascimento !== null && (
          <ThemedText type="small" themeColor="textSecondary">
            Escolha o dia e o mês para o EcoTrust saber a sua idade exata.
          </ThemedText>
        )}
      </Secao>

      <Secao titulo="Cidade">
        <TextInput
          style={estiloCampo}
          value={cidade}
          onChangeText={setCidade}
          placeholder="Ex.: São Paulo"
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel="Cidade"
          maxLength={40}
        />
      </Secao>

      <Secao titulo="Profissão">
        <TextInput
          style={estiloCampo}
          value={profissao}
          onChangeText={setProfissao}
          placeholder="Ex.: Designer"
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel="Profissão"
          maxLength={40}
        />
      </Secao>

      <Secao titulo="Estado civil">
        <View style={styles.grade} accessibilityRole="radiogroup">
          {ESTADOS_CIVIS.map((e) => (
            <Chip
              key={e.valor}
              texto={e.rotulo}
              ativo={estadoCivil === e.valor}
              aoTocar={() => setEstadoCivil(estadoCivil === e.valor ? null : e.valor)}
            />
          ))}
        </View>
      </Secao>

      <Secao titulo="Dependentes (filhos ou outras pessoas que dependem da sua renda)">
        <View style={styles.contador}>
          <Botao
            texto="−"
            variante="secundario"
            disabled={!dependentes}
            onPress={() => setDependentes(Math.max(0, (dependentes ?? 0) - 1))}
            accessibilityLabel="Diminuir dependentes"
            style={styles.botaoContador}
          />
          <ThemedText style={styles.numero} accessibilityLiveRegion="polite">
            {dependentes ?? '–'}
          </ThemedText>
          <Botao
            texto="+"
            variante="secundario"
            onPress={() => setDependentes(Math.min(20, (dependentes ?? 0) + 1))}
            accessibilityLabel="Aumentar dependentes"
            style={styles.botaoContador}
          />
        </View>
      </Secao>

      <ThemedText type="small" themeColor="textSecondary">
        Todos os campos são opcionais e ficam só neste celular. Eles ajudam o EcoTrust a entender sua
        realidade.
      </ThemedText>
    </TelaSecundaria>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={styles.secao}>
      <ThemedText type="smallBold">{titulo}</ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  centro: {
    alignItems: 'center',
  },
  secao: {
    gap: Spacing.two,
  },
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  cores: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  cor: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  campo: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  contador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  botaoContador: {
    width: 56,
  },
  numero: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: 700,
    minWidth: 32,
    textAlign: 'center',
  },
});
