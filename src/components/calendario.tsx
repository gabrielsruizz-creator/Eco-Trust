/**
 * Calendário para escolher datas tocando (em vez de digitar).
 * - Toque no nome do mês para pular rápido: anos → meses → dias (útil para data de nascimento).
 * - `min`/`max` desativam o que está fora do intervalo; `marcados` põe um pontinho em alguns dias.
 * - `CampoData` mostra a data escolhida e abre o calendário numa folha na parte de baixo da tela.
 */

import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Botao } from '@/components/tela';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  formatarDataPorExtenso,
  hoje,
  montarGradeDoMes,
  nomeDoMesTitulo,
  somarMeses,
} from '@/utils/datas';
import { vibrarSelecao } from '@/utils/vibracao';

const DIAS_SEMANA = [
  { curto: 'D', nome: 'domingo' },
  { curto: 'S', nome: 'segunda' },
  { curto: 'T', nome: 'terça' },
  { curto: 'Q', nome: 'quarta' },
  { curto: 'Q', nome: 'quinta' },
  { curto: 'S', nome: 'sexta' },
  { curto: 'S', nome: 'sábado' },
];
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const ANOS_POR_PAGINA = 12;

type Visao = 'dias' | 'meses' | 'anos';

type PropsCalendario = {
  /** Data escolhida (AAAA-MM-DD) */
  valor: string | null;
  aoEscolher: (data: string) => void;
  min?: string;
  max?: string;
  /** Dias com um pontinho (ex.: dias com lançamentos) */
  marcados?: Set<string>;
  /** Mês mostrado ao abrir, se não houver valor (AAAA-MM) */
  mesInicial?: string;
  /** Começar escolhendo o ano (ex.: data de nascimento) */
  visaoInicial?: Visao;
};

function limitarMes(mes: string, min?: string, max?: string) {
  if (min && mes < min.slice(0, 7)) return min.slice(0, 7);
  if (max && mes > max.slice(0, 7)) return max.slice(0, 7);
  return mes;
}

export function Calendario({ valor, aoEscolher, min, max, marcados, mesInicial, visaoInicial = 'dias' }: PropsCalendario) {
  const theme = useTheme();
  const dataHoje = hoje();
  const [mes, setMes] = useState(() => limitarMes(valor?.slice(0, 7) ?? mesInicial ?? dataHoje.slice(0, 7), min, max));
  const [visao, setVisao] = useState<Visao>(visaoInicial);
  const ano = Number(mes.slice(0, 4));
  const [inicioPaginaAnos, setInicioPaginaAnos] = useState(() => ano - (ANOS_POR_PAGINA - 1));

  const anoMin = min ? Number(min.slice(0, 4)) : -Infinity;
  const anoMax = max ? Number(max.slice(0, 4)) : Infinity;
  const mesMin = min?.slice(0, 7);
  const mesMax = max?.slice(0, 7);

  // Setas: na visão de dias trocam o mês; na de meses, o ano; na de anos, a página de anos.
  const anterior = {
    dias: { pode: !mesMin || somarMeses(mes, -1) >= mesMin, ir: () => setMes(somarMeses(mes, -1)), rotulo: 'Mês anterior' },
    meses: { pode: ano - 1 >= anoMin, ir: () => setMes(`${ano - 1}${mes.slice(4)}`), rotulo: 'Ano anterior' },
    anos: {
      pode: inicioPaginaAnos - 1 >= anoMin,
      ir: () => setInicioPaginaAnos(inicioPaginaAnos - ANOS_POR_PAGINA),
      rotulo: 'Anos anteriores',
    },
  }[visao];
  const proximo = {
    dias: { pode: !mesMax || somarMeses(mes, 1) <= mesMax, ir: () => setMes(somarMeses(mes, 1)), rotulo: 'Próximo mês' },
    meses: { pode: ano + 1 <= anoMax, ir: () => setMes(`${ano + 1}${mes.slice(4)}`), rotulo: 'Próximo ano' },
    anos: {
      pode: inicioPaginaAnos + ANOS_POR_PAGINA <= anoMax,
      ir: () => setInicioPaginaAnos(inicioPaginaAnos + ANOS_POR_PAGINA),
      rotulo: 'Próximos anos',
    },
  }[visao];

  const titulo =
    visao === 'dias'
      ? nomeDoMesTitulo(mes)
      : visao === 'meses'
        ? String(ano)
        : `${inicioPaginaAnos} – ${inicioPaginaAnos + ANOS_POR_PAGINA - 1}`;

  function tocarTitulo() {
    if (visao === 'dias') {
      setInicioPaginaAnos(ano - Math.floor(ANOS_POR_PAGINA / 2));
      setVisao('anos');
    } else if (visao === 'meses') {
      setVisao('anos');
    } else {
      setVisao('dias');
    }
  }

  function escolherAno(a: number) {
    vibrarSelecao();
    setMes(limitarMes(`${a}${mes.slice(4)}`, min, max));
    setVisao('meses');
  }

  function escolherMes(indice: number) {
    vibrarSelecao();
    setMes(`${ano}-${String(indice + 1).padStart(2, '0')}`);
    setVisao('dias');
  }

  function escolherDia(data: string) {
    vibrarSelecao();
    aoEscolher(data);
  }

  return (
    <View style={styles.calendario}>
      <View style={styles.cabecalho}>
        <BotaoSeta texto="‹" rotulo={anterior.rotulo} desativado={!anterior.pode} aoTocar={anterior.ir} />
        <Pressable
          onPress={tocarTitulo}
          accessibilityRole="button"
          accessibilityLabel={`${titulo}. ${visao === 'anos' ? 'Voltar para os dias' : 'Escolher outro ano'}`}
          hitSlop={8}
          style={({ pressed }) => [styles.titulo, pressed && styles.pressionado]}>
          <ThemedText type="smallBold" style={styles.tituloTexto}>
            {titulo}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.accentText }}>
            {visao === 'anos' ? '▴' : '▾'}
          </ThemedText>
        </Pressable>
        <BotaoSeta texto="›" rotulo={proximo.rotulo} desativado={!proximo.pode} aoTocar={proximo.ir} />
      </View>

      {visao === 'dias' && (
        <>
          <View style={styles.semana} importantForAccessibility="no-hide-descendants">
            {DIAS_SEMANA.map((d) => (
              <ThemedText key={d.nome} type="small" themeColor="textSecondary" style={styles.diaSemana}>
                {d.curto}
              </ThemedText>
            ))}
          </View>
          {montarGradeDoMes(mes).map((semana, i) => (
            <View key={i} style={styles.semana}>
              {semana.map((data, j) => {
                if (!data) return <View key={j} style={styles.celula} />;
                const fora = (min !== undefined && data < min) || (max !== undefined && data > max);
                const selecionado = data === valor;
                const ehHoje = data === dataHoje;
                const marcado = marcados?.has(data) ?? false;
                return (
                  <Pressable
                    key={data}
                    onPress={() => escolherDia(data)}
                    disabled={fora}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selecionado, disabled: fora }}
                    accessibilityLabel={`${formatarDataPorExtenso(data)}${ehHoje ? ', hoje' : ''}${marcado ? ', com lançamentos' : ''}`}
                    style={styles.celula}>
                    {({ pressed }) => (
                      <View
                        style={[
                          styles.dia,
                          selecionado && { backgroundColor: theme.accent },
                          !selecionado && ehHoje && { borderWidth: 1.5, borderColor: theme.accent },
                          !selecionado && pressed && { backgroundColor: theme.backgroundSelected },
                        ]}>
                        <ThemedText
                          type={selecionado || ehHoje ? 'smallBold' : 'small'}
                          style={[
                            selecionado && { color: theme.onAccent },
                            fora && { color: theme.textSecondary, opacity: 0.45 },
                          ]}>
                          {Number(data.slice(8))}
                        </ThemedText>
                        {marcado && (
                          <View
                            style={[styles.ponto, { backgroundColor: selecionado ? theme.onAccent : theme.accent }]}
                          />
                        )}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </>
      )}

      {visao === 'meses' && (
        <View style={styles.grade}>
          {MESES_CURTOS.map((nome, i) => {
            const valorMes = `${ano}-${String(i + 1).padStart(2, '0')}`;
            const fora = (mesMin !== undefined && valorMes < mesMin) || (mesMax !== undefined && valorMes > mesMax);
            const atual = valor?.slice(0, 7) === valorMes;
            return (
              <OpcaoGrade
                key={nome}
                texto={nome}
                rotulo={nomeDoMesTitulo(valorMes)}
                selecionada={atual}
                desativada={fora}
                aoTocar={() => escolherMes(i)}
              />
            );
          })}
        </View>
      )}

      {visao === 'anos' && (
        <View style={styles.grade}>
          {Array.from({ length: ANOS_POR_PAGINA }, (_, i) => inicioPaginaAnos + i).map((a) => (
            <OpcaoGrade
              key={a}
              texto={String(a)}
              rotulo={String(a)}
              selecionada={valor?.slice(0, 4) === String(a)}
              desativada={a < anoMin || a > anoMax}
              aoTocar={() => escolherAno(a)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function BotaoSeta({ texto, rotulo, desativado, aoTocar }: { texto: string; rotulo: string; desativado: boolean; aoTocar: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={aoTocar}
      disabled={desativado}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: desativado }}
      style={({ pressed }) => [
        styles.seta,
        { backgroundColor: pressed ? theme.backgroundSelected : 'transparent' },
        desativado && styles.desativado,
      ]}>
      <ThemedText style={styles.setaTexto}>{texto}</ThemedText>
    </Pressable>
  );
}

function OpcaoGrade({
  texto,
  rotulo,
  selecionada,
  desativada,
  aoTocar,
}: {
  texto: string;
  rotulo: string;
  selecionada: boolean;
  desativada: boolean;
  aoTocar: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={aoTocar}
      disabled={desativada}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ selected: selecionada, disabled: desativada }}
      style={({ pressed }) => [
        styles.opcaoGrade,
        {
          backgroundColor: selecionada ? theme.accent : pressed ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: selecionada ? theme.accent : theme.border,
        },
        desativada && styles.desativado,
      ]}>
      <ThemedText type="smallBold" style={selecionada ? { color: theme.onAccent } : undefined}>
        {texto}
      </ThemedText>
    </Pressable>
  );
}

type PropsFolha = Omit<PropsCalendario, 'aoEscolher'> & {
  visivel: boolean;
  titulo: string;
  aoEscolher: (data: string) => void;
  aoFechar: () => void;
  /** Botão extra no rodapé (ex.: "Limpar data", "Mostrar o mês todo") */
  acaoExtra?: { texto: string; aoTocar: () => void };
};

/** O calendário numa folha que sobe da parte de baixo da tela. Escolher um dia já fecha. */
export function FolhaCalendario({ visivel, titulo, aoEscolher, aoFechar, acaoExtra, ...calendario }: PropsFolha) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dataHoje = hoje();
  const hojePermitido =
    (!calendario.min || dataHoje >= calendario.min) && (!calendario.max || dataHoje <= calendario.max);

  function escolher(data: string) {
    aoEscolher(data);
    aoFechar();
  }

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={aoFechar} statusBarTranslucent>
      <View style={styles.fundoModal}>
        <Pressable
          style={styles.areaFechar}
          onPress={aoFechar}
          accessibilityRole="button"
          accessibilityLabel="Fechar calendário"
        />
        <View
          style={[
            styles.folha,
            { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.three },
          ]}
          accessibilityViewIsModal>
          <View style={[styles.alca, { backgroundColor: theme.backgroundSelected }]} />
          <View style={styles.topoFolha}>
            <ThemedText type="smallBold" accessibilityRole="header" style={styles.flex}>
              {titulo}
            </ThemedText>
            <Pressable onPress={aoFechar} accessibilityRole="button" hitSlop={12}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Cancelar
              </ThemedText>
            </Pressable>
          </View>
          {/* Só existe enquanto aberta: cada abertura começa no mês da data escolhida. */}
          {visivel && <Calendario {...calendario} aoEscolher={escolher} />}
          <View style={styles.rodapeFolha}>
            {hojePermitido && calendario.visaoInicial !== 'anos' && (
              <Botao texto="Hoje" variante="secundario" onPress={() => escolher(dataHoje)} style={styles.flex} />
            )}
            {acaoExtra && (
              <Botao
                texto={acaoExtra.texto}
                variante="secundario"
                onPress={() => {
                  acaoExtra.aoTocar();
                  aoFechar();
                }}
                style={styles.flex}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

type PropsCampo = Omit<PropsCalendario, 'aoEscolher'> & {
  aoMudar: (data: string | null) => void;
  /** Título da folha e rótulo para o leitor de tela (ex.: "Data do lançamento") */
  rotulo: string;
  placeholder?: string;
  /** Mostra "Limpar data" (para campos opcionais) */
  permitirLimpar?: boolean;
  /** Como mostrar a data escolhida (padrão: por extenso, com o dia da semana) */
  formatar?: (data: string) => string;
  /** Já abre o calendário ao aparecer (ex.: logo depois de tocar em "Outra data") */
  abrirAoAparecer?: boolean;
};

/** Campo que mostra a data e abre o calendário ao tocar. */
export function CampoData({
  valor,
  aoMudar,
  rotulo,
  placeholder = 'Escolher no calendário',
  permitirLimpar,
  formatar = formatarDataPorExtenso,
  abrirAoAparecer = false,
  ...calendario
}: PropsCampo) {
  const theme = useTheme();
  const [aberto, setAberto] = useState(abrirAoAparecer);
  const texto = valor ? formatar(valor) : placeholder;

  return (
    <>
      <Pressable
        onPress={() => setAberto(true)}
        accessibilityRole="button"
        accessibilityLabel={`${rotulo}: ${valor ? texto : 'nenhuma data escolhida'}`}
        accessibilityHint="Abre o calendário"
        style={({ pressed }) => [
          styles.campo,
          { backgroundColor: theme.backgroundElement, borderColor: valor ? theme.accent : theme.border },
          pressed && styles.pressionado,
        ]}>
        <ThemedText style={styles.icone}>📅</ThemedText>
        <ThemedText style={styles.flex} themeColor={valor ? 'text' : 'textSecondary'}>
          {texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1)}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.accentText }}>
          {valor ? 'Alterar' : 'Escolher'}
        </ThemedText>
      </Pressable>
      <FolhaCalendario
        {...calendario}
        visivel={aberto}
        titulo={rotulo}
        valor={valor}
        aoEscolher={aoMudar}
        aoFechar={() => setAberto(false)}
        acaoExtra={permitirLimpar && valor ? { texto: 'Limpar data', aoTocar: () => aoMudar(null) } : undefined}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  pressionado: {
    opacity: 0.7,
  },
  desativado: {
    opacity: 0.35,
  },
  calendario: {
    gap: Spacing.one,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  titulo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    minHeight: 44,
  },
  tituloTexto: {
    fontSize: 17,
  },
  seta: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setaTexto: {
    fontSize: 28,
    lineHeight: 32,
  },
  semana: {
    flexDirection: 'row',
  },
  diaSemana: {
    flex: 1,
    textAlign: 'center',
  },
  celula: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dia: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ponto: {
    position: 'absolute',
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  opcaoGrade: {
    width: '31%',
    flexGrow: 1,
    minHeight: 48,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fundoModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  areaFechar: {
    flex: 1,
  },
  folha: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  alca: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: Spacing.one,
  },
  topoFolha: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  rodapeFolha: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  icone: {
    fontSize: 18,
  },
});
