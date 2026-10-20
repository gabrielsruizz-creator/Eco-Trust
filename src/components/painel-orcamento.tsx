import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BarraProgresso } from '@/components/barra-progresso';
import { GraficoOrcamento } from '@/components/grafico-orcamento';
import { EtiquetaSituacao, useCorSituacao } from '@/components/situacao-orcamento';
import { Botao, Cartao } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useImpostometro, useOrcamentos } from '@/hooks/use-dados';
import type { StatusOrcamento } from '@/services/orcamento-service';
import { mesAtual, nomeDoMes } from '@/utils/datas';
import { formatarCentavos } from '@/utils/moeda';

function abrirEdicao(categoria?: number | 'geral') {
  router.push(
    categoria === undefined
      ? '/editar-orcamento'
      : { pathname: '/editar-orcamento', params: { categoria: String(categoria) } },
  );
}

/** Conteúdo do Orçamento, mostrado dentro da aba Planejar. */
export function PainelOrcamento() {
  const mes = mesAtual();
  const orcamentos = useOrcamentos(mes);
  const impostometro = useImpostometro(mes);
  const impostosPorCategoria = new Map(impostometro.porCategoria.map((c) => [c.categoriaId, c.impostosCentavos]));
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);
  // Se a categoria escolhida perdeu o orçamento, volta a mostrar o total.
  const selecionado = orcamentos.categorias.find((c) => c.categoriaId === selecionadoId) ?? null;

  return (
    <>
      <ThemedText themeColor="textSecondary" style={styles.mes}>
        {nomeDoMes(mes)}
      </ThemedText>

      {/* Orçamento geral do mês */}
      <Cartao>
        <ThemedText type="small" themeColor="textSecondary">
          Orçamento mensal
        </ThemedText>
        {orcamentos.geral ? (
          <ResumoGeral status={orcamentos.geral} />
        ) : (
          <>
            <ThemedText type="small">
              Defina quanto você quer gastar por mês, no total. O EcoTrust avisa quando estiver
              chegando perto do limite.
            </ThemedText>
            {orcamentos.sugestaoGeralCentavos !== null && orcamentos.sugestaoGeralCentavos > 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                Sugestão pelo seu perfil (renda menos a meta de economia):{' '}
                {formatarCentavos(orcamentos.sugestaoGeralCentavos)}
              </ThemedText>
            )}
            <Botao texto="Definir orçamento mensal" onPress={() => abrirEdicao('geral')} />
          </>
        )}
      </Cartao>

      {/* Gráfico interativo por categoria */}
      <ThemedText type="smallBold" accessibilityRole="header">
        Por categoria
      </ThemedText>
      {orcamentos.categorias.length === 0 ? (
        <Cartao>
          <ThemedText type="small" themeColor="textSecondary">
            Defina limites para as categorias em que você mais gasta, como Alimentação ou Lazer.
          </ThemedText>
          <Botao texto="+ Orçamento por categoria" onPress={() => abrirEdicao()} />
        </Cartao>
      ) : (
        <>
          <Cartao>
            <ThemedText type="small" themeColor="textSecondary">
              Como seu gasto se divide entre as categorias com orçamento. Toque numa fatia ou na
              lista para ver os detalhes.
            </ThemedText>
            <GraficoOrcamento
              itens={orcamentos.categorias}
              selecionadoId={selecionado?.categoriaId ?? null}
              aoSelecionar={setSelecionadoId}
              impostosPorCategoria={impostosPorCategoria}
            />
          </Cartao>

          {selecionado && (
            <DetalheCategoria
              status={selecionado}
              impostosCentavos={selecionado.categoriaId !== null ? (impostosPorCategoria.get(selecionado.categoriaId) ?? 0) : 0}
            />
          )}

          <Botao
            texto="+ Orçamento por categoria"
            variante="secundario"
            onPress={() => abrirEdicao()}
          />
        </>
      )}

      <ThemedText type="small" themeColor="textSecondary">
        Os limites valem para todos os meses, até você mudar.
      </ThemedText>
    </>
  );
}

function ResumoGeral({ status }: { status: StatusOrcamento }) {
  const cor = useCorSituacao()(status.situacao);
  return (
    <>
      <View style={styles.linhaValores}>
        <ThemedText style={styles.valorGrande}>{formatarCentavos(status.gastoCentavos)}</ThemedText>
        <ThemedText themeColor="textSecondary">de {formatarCentavos(status.limiteCentavos)}</ThemedText>
      </View>
      <BarraProgresso
        percentual={status.percentual}
        cor={cor}
        altura={10}
        rotuloAcessivel="Orçamento mensal usado"
      />
      <View style={styles.linhaValores}>
        <EtiquetaSituacao situacao={status.situacao} />
        <ThemedText type="small" themeColor="textSecondary">
          {Math.floor(status.percentual)}% usado
        </ThemedText>
      </View>
      <ThemedText type="small">{status.mensagem ?? textoRestante(status)}</ThemedText>
      <Botao texto="Alterar orçamento mensal" variante="secundario" onPress={() => abrirEdicao('geral')} />
    </>
  );
}

function textoRestante(status: StatusOrcamento) {
  if (status.restanteCentavos <= 0) return 'Você chegou ao limite.';
  const base = `Restam ${formatarCentavos(status.restanteCentavos)}`;
  return status.porDiaCentavos !== null
    ? `${base}, cerca de ${formatarCentavos(status.porDiaCentavos)} por dia até o fim do mês.`
    : `${base}.`;
}

function DetalheCategoria({ status, impostosCentavos }: { status: StatusOrcamento; impostosCentavos: number }) {
  const cor = useCorSituacao()(status.situacao);
  return (
    <Cartao>
      <View style={styles.linhaValores}>
        <ThemedText type="smallBold" accessibilityRole="header" accessibilityLiveRegion="polite">
          {status.nome}
        </ThemedText>
        <EtiquetaSituacao situacao={status.situacao} />
      </View>
      <View style={styles.linhaValores}>
        <ThemedText style={styles.valorMedio}>{formatarCentavos(status.gastoCentavos)}</ThemedText>
        <ThemedText themeColor="textSecondary">
          de {formatarCentavos(status.limiteCentavos)} · {Math.floor(status.percentual)}%
        </ThemedText>
      </View>
      <BarraProgresso
        percentual={status.percentual}
        cor={cor}
        rotuloAcessivel={`Orçamento de ${status.nome} usado`}
      />
      <ThemedText type="small">{status.mensagem ?? textoRestante(status)}</ThemedText>
      {impostosCentavos > 0 && status.gastoCentavos > 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          Desse gasto, cerca de {formatarCentavos(impostosCentavos)} (
          {Math.round((impostosCentavos / status.gastoCentavos) * 100)}%) foram impostos.
        </ThemedText>
      )}
      {status.mensagem && status.situacao === 'atencao' && (
        <ThemedText type="small" themeColor="textSecondary">
          {textoRestante(status)}
        </ThemedText>
      )}
      <Botao
        texto="Editar limite"
        variante="secundario"
        onPress={() => status.categoriaId !== null && abrirEdicao(status.categoriaId)}
      />
    </Cartao>
  );
}

const styles = StyleSheet.create({
  mes: {
    textTransform: 'capitalize',
  },
  linhaValores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  valorGrande: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: 700,
  },
  valorMedio: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: 700,
  },
});
