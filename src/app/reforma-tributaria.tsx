import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icone } from '@/components/icone';
import { Cartao, useDegrade } from '@/components/tela';
import { TelaSecundaria } from '@/components/tela-secundaria';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { ALIQUOTA_REFERENCIA, ETAPAS_REFORMA } from '@/data/reforma-tributaria';
import { useSimulacaoReforma } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import { mesAtual, nomeDoMesTitulo, somarMeses } from '@/utils/datas';
import { formatarCentavos } from '@/utils/moeda';

/** Quanto as compras do mês pagariam de imposto quando a reforma tributária estiver completa. */
export default function ReformaTributariaScreen() {
  const theme = useTheme();
  const degrade = useDegrade(135);
  const [mes, setMes] = useState(mesAtual());
  const sim = useSimulacaoReforma(mes);
  const pagaMenos = sim.diferencaCentavos < 0;

  return (
    <TelaSecundaria titulo="Reforma tributária">
      <View style={styles.seletor}>
        <Seta icone="voltar" rotulo="Mês anterior" aoTocar={() => setMes(somarMeses(mes, -1))} />
        <ThemedText type="smallBold" style={[styles.flex, styles.centro]} accessibilityLiveRegion="polite">
          Compras de {nomeDoMesTitulo(mes)}
        </ThemedText>
        <Seta icone="avancar" rotulo="Próximo mês" desativado={mes >= mesAtual()} aoTocar={() => setMes(somarMeses(mes, 1))} />
      </View>

      {sim.gastosCentavos === 0 ? (
        <Cartao>
          <ThemedText type="small" themeColor="textSecondary">
            Nenhuma despesa neste mês para simular.
          </ThemedText>
        </Cartao>
      ) : (
        <>
          <View
            style={[styles.destaque, degrade]}
            accessible
            accessibilityLabel={`Hoje: ${formatarCentavos(sim.hojeCentavos)} em impostos. Com a reforma: ${formatarCentavos(sim.reformaCentavos)}. ${pagaMenos ? 'Menos' : 'Mais'} ${formatarCentavos(Math.abs(sim.diferencaCentavos))}.`}>
            <ThemedText type="small" style={styles.textoClaro}>
              Impostos sobre {formatarCentavos(sim.gastosCentavos)} de compras
            </ThemedText>
            <View style={styles.comparacao}>
              <View style={styles.flex}>
                <ThemedText type="small" style={styles.textoClaro}>
                  Hoje
                </ThemedText>
                <ThemedText style={styles.valor}>{formatarCentavos(sim.hojeCentavos)}</ThemedText>
              </View>
              <Icone nome="avancar" cor="#FFFFFF" tamanho={20} />
              <View style={styles.flex}>
                <ThemedText type="small" style={styles.textoClaro}>
                  Com a reforma (2033)
                </ThemedText>
                <ThemedText style={styles.valor}>{formatarCentavos(sim.reformaCentavos)}</ThemedText>
              </View>
            </View>
            <ThemedText type="smallBold" style={styles.textoBranco}>
              {sim.diferencaCentavos === 0
                ? 'Praticamente o mesmo imposto.'
                : `${pagaMenos ? 'Você pagaria' : 'Você pagaria'} ${formatarCentavos(Math.abs(sim.diferencaCentavos))} ${pagaMenos ? 'a menos' : 'a mais'} por mês.`}
            </ThemedText>
          </View>

          <ThemedText type="smallBold" accessibilityRole="header">
            O que muda no que você compra
          </ThemedText>
          <Cartao style={styles.lista}>
            {sim.porGrupo.map((g, i) => {
              const dif = g.reformaCentavos - g.hojeCentavos;
              const cor = dif < 0 ? theme.positive : dif > 0 ? theme.negative : theme.textSecondary;
              return (
                <View
                  key={g.nome}
                  style={[styles.item, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}
                  accessible
                  accessibilityLabel={`${g.nome}: hoje ${formatarCentavos(g.hojeCentavos)}, na reforma ${formatarCentavos(g.reformaCentavos)}`}>
                  <View style={styles.flex}>
                    <ThemedText type="small" numberOfLines={1}>
                      {g.nome.charAt(0).toLocaleUpperCase('pt-BR') + g.nome.slice(1)}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatarCentavos(g.hojeCentavos)} → {formatarCentavos(g.reformaCentavos)}
                    </ThemedText>
                  </View>
                  <ThemedText type="smallBold" style={{ color: cor }}>
                    {dif === 0 ? '=' : `${dif > 0 ? '+' : '−'} ${formatarCentavos(Math.abs(dif))}`}
                  </ThemedText>
                </View>
              );
            })}
          </Cartao>
        </>
      )}

      <Cartao>
        <ThemedText type="smallBold">Como fica a regra nova</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          ICMS, ISS, PIS/Cofins e IPI viram dois impostos: IBS (estados e municípios) e CBS (União), com
          alíquota estimada de {ALIQUOTA_REFERENCIA.toLocaleString('pt-BR')}% cobrada por fora do preço.
          Cesta básica, carnes, frutas, verduras e ovos ficam com alíquota zero; saúde, educação,
          alimentos, higiene e limpeza pagam 40% da alíquota. Cigarro e bebidas alcoólicas e açucaradas
          pagam também o Imposto Seletivo. Serviços em geral passam a pagar mais; produtos, menos.
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Famílias de baixa renda do CadÚnico terão parte do imposto devolvida (cashback).
        </ThemedText>
      </Cartao>

      <Cartao>
        <ThemedText type="smallBold">Linha do tempo</ThemedText>
        {ETAPAS_REFORMA.map((e) => (
          <View key={e.ano} style={styles.etapa}>
            <ThemedText type="smallBold" style={styles.ano}>
              {e.ano}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
              {e.texto}
            </ThemedText>
          </View>
        ))}
      </Cartao>

      <ThemedText type="small" themeColor="textSecondary">
        Simulação aproximada: a alíquota final ainda será fixada, o Imposto Seletivo ainda não tem valores
        (supomos a mesma carga do IPI de hoje) e combustíveis terão regra própria (mantivemos a carga atual).
        Supõe que as empresas repassem toda a mudança para o preço.
      </ThemedText>
    </TelaSecundaria>
  );
}

function Seta({
  icone,
  rotulo,
  aoTocar,
  desativado,
}: {
  icone: 'voltar' | 'avancar';
  rotulo: string;
  aoTocar: () => void;
  desativado?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={aoTocar}
      disabled={desativado}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: !!desativado }}
      hitSlop={8}
      style={[styles.seta, { borderColor: theme.border, backgroundColor: theme.backgroundElement }, desativado && styles.apagado]}>
      <Icone nome={icone} cor={theme.text} tamanho={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centro: {
    textAlign: 'center',
  },
  apagado: {
    opacity: 0.35,
  },
  seletor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  seta: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destaque: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  comparacao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  textoClaro: {
    color: 'rgba(255,255,255,0.85)',
  },
  textoBranco: {
    color: '#FFFFFF',
  },
  valor: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: 700,
    color: '#FFFFFF',
  },
  lista: {
    paddingVertical: Spacing.one,
    gap: 0,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 52,
    paddingVertical: Spacing.two,
  },
  etapa: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  ano: {
    width: 76,
  },
});
