import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { Icone } from '@/components/icone';
import { Cartao, IconeCirculo } from '@/components/tela';
import { TelaSecundaria } from '@/components/tela-secundaria';
import { ThemedText } from '@/components/themed-text';
import { SeriesColors, Spacing } from '@/constants/theme';
import { cargaTotal, perfilTributario, PERFIS_TRIBUTARIOS, type PerfilTributarioId } from '@/data/carga-tributaria';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCategorias } from '@/hooks/use-dados';
import { useTheme } from '@/hooks/use-theme';
import { alterarPerfilTributario, perfilTributarioDaCategoria } from '@/services/categorias-service';
import { ErroValidacao } from '@/services/erros';
import type { Categoria } from '@/types/financas';
import { visualCategoria } from '@/utils/visual';

/** Escolhe o tipo de consumo de cada categoria de despesa, que define a estimativa de impostos. */
export default function AjustarImpostosScreen() {
  const categorias = useCategorias('despesa');
  const [abertaId, setAbertaId] = useState<number | null>(null);

  return (
    <TelaSecundaria titulo="Tipos de consumo">
      <ThemedText type="small" themeColor="textSecondary">
        Cada tipo de consumo tem uma carga de impostos diferente: combustível e telefone pagam muito
        mais que aluguel ou escola. Escolha o que mais combina com o que você registra em cada
        categoria.
      </ThemedText>
      <Cartao style={styles.lista}>
        {categorias.map((c, i) => (
          <LinhaCategoria
            key={c.id}
            categoria={c}
            aberta={abertaId === c.id}
            aoTocar={() => setAbertaId(abertaId === c.id ? null : c.id)}
            separador={i > 0}
          />
        ))}
      </Cartao>
      <ThemedText type="small" themeColor="textSecondary">
        Os percentuais são médias sobre o preço final. Para um valor exato, informe os tributos da
        nota fiscal ao registrar a despesa.
      </ThemedText>
    </TelaSecundaria>
  );
}

function LinhaCategoria({
  categoria,
  aberta,
  aoTocar,
  separador,
}: {
  categoria: Categoria;
  aberta: boolean;
  aoTocar: () => void;
  separador: boolean;
}) {
  const theme = useTheme();
  const esquema = useColorScheme() === 'light' ? 'light' : 'dark';
  const visual = visualCategoria(categoria.nome, categoria.id);
  const perfil = perfilTributario(perfilTributarioDaCategoria(categoria));

  function escolher(id: PerfilTributarioId) {
    try {
      alterarPerfilTributario(categoria.id, id);
    } catch (e) {
      Alert.alert('Não foi possível salvar', e instanceof ErroValidacao ? e.message : 'Tente novamente.');
    }
  }

  return (
    <View style={separador && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }}>
      <Pressable
        onPress={aoTocar}
        accessibilityRole="button"
        accessibilityState={{ expanded: aberta }}
        accessibilityLabel={`${categoria.nome}: ${perfil.nome}, cerca de ${cargaTotal(perfil)}% de impostos. Toque para mudar.`}
        style={({ pressed }) => [styles.linha, pressed && styles.pressionado]}>
        <IconeCirculo icone={visual.icone} cor={SeriesColors[esquema][visual.cor]} tamanho={36} />
        <View style={styles.flex}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {categoria.nome}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {perfil.nome}
            {categoria.perfilTributario === null ? ' (automático)' : ''}
          </ThemedText>
        </View>
        <ThemedText type="smallBold">~{cargaTotal(perfil)}%</ThemedText>
        <Icone nome={aberta ? 'fechar' : 'editar'} cor={theme.textSecondary} tamanho={16} />
      </Pressable>

      {aberta && (
        <View style={styles.opcoes}>
          <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={`Tipo de consumo de ${categoria.nome}`}>
            {PERFIS_TRIBUTARIOS.map((p) => (
              <Chip
                key={p.id}
                texto={`${p.nome} · ${cargaTotal(p)}%`}
                ativo={p.id === perfil.id}
                aoTocar={() => escolher(p.id)}
              />
            ))}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Exemplos de {perfil.nome.toLocaleLowerCase('pt-BR')}: {perfil.exemplos}.
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  pressionado: {
    opacity: 0.6,
  },
  lista: {
    paddingVertical: Spacing.one,
    gap: 0,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 56,
    paddingVertical: Spacing.two,
  },
  opcoes: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
