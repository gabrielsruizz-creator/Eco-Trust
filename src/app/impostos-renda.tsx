import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { Botao, Cartao, Segmentado } from '@/components/tela';
import { TelaSecundaria } from '@/components/tela-secundaria';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { usePerfilFinanceiro, useImpostosFixos } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import { ErroValidacao } from '@/services/erros';
import {
  calcularImpostosFixosDoMes,
  limparImpostosFixos,
  salvarImpostosFixos,
} from '@/services/impostos-renda-service';
import { centavosParaTexto, formatarCentavos, lerValorEmCentavos } from '@/utils/moeda';
import { vibrarErro, vibrarSucesso } from '@/utils/vibracao';

type Modo = 'clt' | 'valores';

function textoInicial(centavos: number | null | undefined) {
  return centavos ? centavosParaTexto(centavos) : '';
}

/** Lê um campo opcional: vazio = 0; texto inválido = null. */
function lerCampo(texto: string): number | null {
  return texto.trim() === '' ? 0 : lerValorEmCentavos(texto, true);
}

/** Impostos que não vêm nas despesas: INSS e IR da renda, IPVA e IPTU, e outros (ex.: DAS do MEI). */
export default function ImpostosRendaScreen() {
  const atual = useImpostosFixos();
  const perfil = usePerfilFinanceiro();
  const [modo, setModo] = useState<Modo>(
    atual ? (atual.salarioBrutoCentavos ? 'clt' : 'valores') : perfil?.fonteRenda === 'clt' || !perfil ? 'clt' : 'valores',
  );
  const [salario, setSalario] = useState(textoInicial(atual?.salarioBrutoCentavos));
  const [dependentes, setDependentes] = useState(atual?.dependentes ? String(atual.dependentes) : '');
  const [inss, setInss] = useState(textoInicial(atual?.inssCentavos));
  const [ir, setIr] = useState(textoInicial(atual?.irCentavos));
  const [ipva, setIpva] = useState(textoInicial(atual?.ipvaAnualCentavos));
  const [iptu, setIptu] = useState(textoInicial(atual?.iptuAnualCentavos));
  const [outros, setOutros] = useState(textoInicial(atual?.outrosMensalCentavos));

  const valores = {
    salario: modo === 'clt' ? lerCampo(salario) : 0,
    dependentes: modo === 'clt' && dependentes.trim() !== '' ? Number(dependentes) : 0,
    inss: modo === 'valores' ? lerCampo(inss) : 0,
    ir: modo === 'valores' ? lerCampo(ir) : 0,
    ipva: lerCampo(ipva),
    iptu: lerCampo(iptu),
    outros: lerCampo(outros),
  };
  const invalido =
    Object.values(valores).some((v) => v === null || Number.isNaN(v)) || !Number.isInteger(valores.dependentes);
  const dados = invalido
    ? null
    : {
        salarioBrutoCentavos: valores.salario || null,
        dependentes: valores.dependentes,
        inssCentavos: valores.inss || null,
        irCentavos: valores.ir || null,
        ipvaAnualCentavos: valores.ipva!,
        iptuAnualCentavos: valores.iptu!,
        outrosMensalCentavos: valores.outros!,
      };
  const previa = dados ? calcularImpostosFixosDoMes(dados) : null;

  function salvar() {
    if (!dados) return;
    try {
      if (calcularImpostosFixosDoMes(dados) === null) limparImpostosFixos();
      else salvarImpostosFixos(dados);
      vibrarSucesso();
      router.back();
    } catch (e) {
      vibrarErro();
      Alert.alert('Não foi possível salvar', e instanceof ErroValidacao ? e.message : 'Tente novamente.');
    }
  }

  return (
    <TelaSecundaria
      titulo="Impostos da renda"
      textoVoltar="Cancelar"
      rodape={
        <>
          {invalido && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.centro}>
              Confira os valores digitados.
            </ThemedText>
          )}
          <Botao texto="Salvar" disabled={invalido} onPress={salvar} />
        </>
      }>
      <ThemedText type="small" themeColor="textSecondary">
        Além do que vem embutido nas compras, você paga impostos sobre o que ganha e sobre o que tem.
        Eles entram na carga total do seu Impostômetro todo mês.
      </ThemedText>

      <ThemedText type="smallBold" accessibilityRole="header">
        Renda
      </ThemedText>
      <Segmentado
        rotulo="Como informar os impostos da renda"
        valor={modo}
        aoMudar={setModo}
        opcoes={[
          { valor: 'clt', texto: 'Sou CLT' },
          { valor: 'valores', texto: 'Informar valores' },
        ]}
      />
      {modo === 'clt' ? (
        <>
          <Campo
            rotulo="Salário bruto por mês"
            dica="O valor antes dos descontos, que aparece no topo do holerite."
            valor={salario}
            aoMudar={setSalario}
            exemplo="Ex.: 4500"
          />
          <Campo
            rotulo="Dependentes no Imposto de Renda"
            valor={dependentes}
            aoMudar={(t) => setDependentes(t.replace(/\D/g, '').slice(0, 2))}
            exemplo="0"
            numeroInteiro
          />
        </>
      ) : (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            Para autônomos, MEI e aposentados: some o que você paga por mês (guia do INSS, carnê-leão).
          </ThemedText>
          <Campo rotulo="INSS por mês" valor={inss} aoMudar={setInss} exemplo="Ex.: 303,60" />
          <Campo rotulo="Imposto de Renda por mês" valor={ir} aoMudar={setIr} exemplo="Ex.: 0" />
        </>
      )}

      <ThemedText type="smallBold" accessibilityRole="header">
        Patrimônio e outros
      </ThemedText>
      <Campo rotulo="IPVA por ano" dica="Do carro ou da moto, somando todas as parcelas." valor={ipva} aoMudar={setIpva} exemplo="Ex.: 1800" />
      <Campo rotulo="IPTU por ano" dica="Se você paga o IPTU do imóvel onde mora." valor={iptu} aoMudar={setIptu} exemplo="Ex.: 900" />
      <Campo
        rotulo="Outros impostos por mês"
        dica="Ex.: DAS do MEI. Não inclua o que já registrou como despesa."
        valor={outros}
        aoMudar={setOutros}
        exemplo="Ex.: 81,05"
      />

      {previa && (
        <Cartao>
          <ThemedText type="smallBold">Por mês, isso dá {formatarCentavos(previa.totalCentavos)}</ThemedText>
          <Linha rotulo={previa.descontadosNaFonte ? 'INSS (descontado no holerite)' : 'INSS'} valor={previa.inssCentavos} />
          <Linha rotulo={previa.descontadosNaFonte ? 'Imposto de Renda (na fonte)' : 'Imposto de Renda'} valor={previa.irCentavos} />
          <Linha rotulo="IPVA (1/12)" valor={previa.ipvaCentavos} />
          <Linha rotulo="IPTU (1/12)" valor={previa.iptuCentavos} />
          <Linha rotulo="Outros" valor={previa.outrosCentavos} />
          {previa.descontadosNaFonte && (
            <ThemedText type="small" themeColor="textSecondary">
              Calculado com as tabelas de 2026, já com a isenção do IR para quem ganha até R$ 5 mil.
            </ThemedText>
          )}
        </Cartao>
      )}
    </TelaSecundaria>
  );
}

function Campo({
  rotulo,
  dica,
  valor,
  aoMudar,
  exemplo,
  numeroInteiro,
}: {
  rotulo: string;
  dica?: string;
  valor: string;
  aoMudar: (texto: string) => void;
  exemplo: string;
  numeroInteiro?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.campo}>
      <ThemedText type="small">{rotulo}</ThemedText>
      <TextInput
        style={[styles.entrada, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        value={valor}
        onChangeText={aoMudar}
        placeholder={exemplo}
        placeholderTextColor={theme.textSecondary}
        keyboardType={numeroInteiro ? 'number-pad' : 'decimal-pad'}
        accessibilityLabel={numeroInteiro ? rotulo : `${rotulo}, em reais`}
        accessibilityHint={dica}
        returnKeyType="done"
      />
      {dica && (
        <ThemedText type="small" themeColor="textSecondary">
          {dica}
        </ThemedText>
      )}
    </View>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: number }) {
  if (valor === 0) return null;
  return (
    <View style={styles.linha} accessible accessibilityLabel={`${rotulo}: ${formatarCentavos(valor)}`}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
        {rotulo}
      </ThemedText>
      <ThemedText type="small">{formatarCentavos(valor)}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centro: {
    textAlign: 'center',
  },
  campo: {
    gap: Spacing.one,
  },
  entrada: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  linha: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
