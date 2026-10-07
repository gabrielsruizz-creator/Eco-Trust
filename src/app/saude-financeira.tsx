import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AnelProgresso } from '@/components/anel-progresso';
import { BarraProgresso } from '@/components/barra-progresso';
import { BloqueioPremium } from '@/components/bloqueio-premium';
import { ICONE_FATOR, useCorFaixa, useCorFator } from '@/components/saude-financeira';
import { SecaoEvolucao } from '@/components/secao-evolucao';
import { IconeSituacao } from '@/components/situacao-orcamento';
import { Botao, Cartao } from '@/components/tela';
import { TelaSecundaria } from '@/components/tela-secundaria';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAssinatura, useSaude } from '@/hooks/use-dados';
import { temAcesso } from '@/services/assinatura-service';
import { ROTULO_FAIXA, type FatorSaude } from '@/services/saude-service';

const FAIXAS = [
  { faixa: 'atencao', de: 0, ate: 39 },
  { faixa: 'regular', de: 40, ate: 59 },
  { faixa: 'boa', de: 60, ate: 79 },
  { faixa: 'excelente', de: 80, ate: 100 },
] as const;

export default function SaudeFinanceiraScreen() {
  const saude = useSaude();
  const corFaixa = useCorFaixa();
  const plus = temAcesso('saude', useAssinatura());

  return (
    <TelaSecundaria titulo="Saúde financeira">
      {!plus ? (
        <BloqueioPremium recurso="saude" />
      ) : (
        <>
          <View style={styles.cabecalho}>
            <AnelProgresso
              percentual={saude.nota ?? 0}
              cor={corFaixa(saude.faixa)}
              tamanho={168}
              espessura={16}
              rotulo={saude.nota === null ? '–' : String(saude.nota)}
              subrotulo="de 100"
              rotuloAcessivel={
                saude.nota === null ? 'Saúde financeira sem dados' : `Saúde financeira: ${saude.nota} de 100`
              }
            />
            <ThemedText style={styles.faixa}>{saude.rotuloFaixa}</ThemedText>
          </View>

          {saude.nota === null ? (
            <Cartao>
              <ThemedText>
                Registre suas receitas e despesas para o EcoTrust calcular sua saúde financeira.
              </ThemedText>
              <Botao texto="+ Novo lançamento" onPress={() => router.push('/novo-lancamento')} />
            </Cartao>
          ) : (
            <>
              <ThemedText type="smallBold" accessibilityRole="header">
                Sua evolução
              </ThemedText>
              <SecaoEvolucao />
              <ThemedText type="smallBold" accessibilityRole="header">
                O que compõe a sua nota
              </ThemedText>
              {saude.fatores.map((f) => (
                <CartaoFator key={f.id} fator={f} />
              ))}
            </>
          )}

          <ThemedText type="smallBold" accessibilityRole="header">
            Como a nota é calculada
          </ThemedText>
          <Cartao>
            <ThemedText type="small">
              A nota vai de 0 a 100 e soma seis fatores: taxa de poupança (25 pontos), despesas fixas
              (20), orçamento (20), metas (15), gastos não essenciais (10) e saldo acumulado (10).
              Ela é recalculada a cada lançamento.
            </ThemedText>
            <View style={styles.faixas}>
              {FAIXAS.map((f) => (
                <View key={f.faixa} style={styles.itemFaixa}>
                  <View style={[styles.amostra, { backgroundColor: corFaixa(f.faixa) }]} />
                  <ThemedText type="small">
                    {f.de}–{f.ate}: {ROTULO_FAIXA[f.faixa]}
                  </ThemedText>
                </View>
              ))}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              Esta é a primeira versão da metodologia EcoTrust. Ela é educativa e não substitui uma
              análise de crédito ou a orientação de um profissional.
            </ThemedText>
          </Cartao>
        </>
      )}
    </TelaSecundaria>
  );
}

function CartaoFator({ fator }: { fator: FatorSaude }) {
  const cor = useCorFator()(fator.situacao);
  const pontos = Math.round(fator.pontos);
  return (
    <Cartao>
      <View
        style={styles.linhaFator}
        accessible
        accessibilityLabel={`${fator.nome}: ${pontos} de ${fator.maximo} pontos. ${fator.resumo}`}>
        <IconeSituacao situacao={ICONE_FATOR[fator.situacao]} cor={cor} />
        <View style={styles.flex}>
          <ThemedText type="smallBold">{fator.nome}</ThemedText>
          <ThemedText type="small">{fator.resumo}</ThemedText>
        </View>
        <ThemedText type="smallBold">
          {pontos}
          <ThemedText type="small" themeColor="textSecondary">
            /{fator.maximo}
          </ThemedText>
        </ThemedText>
      </View>
      <BarraProgresso percentual={(fator.pontos / fator.maximo) * 100} cor={cor} />
      <ThemedText type="small" themeColor="textSecondary">
        {fator.detalhe}
      </ThemedText>
    </Cartao>
  );
}

const styles = StyleSheet.create({
  cabecalho: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  faixa: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: 700,
  },
  linhaFator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  faixas: {
    gap: Spacing.one,
  },
  itemFaixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  amostra: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
