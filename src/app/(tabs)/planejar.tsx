import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { PainelMetas } from '@/components/painel-metas';
import { PainelOrcamento } from '@/components/painel-orcamento';
import { Tela } from '@/components/tela';
import { Spacing } from '@/constants/theme';

type Secao = 'orcamento' | 'metas';

/** Planejar: Orçamento (quanto gastar) e Metas (quanto guardar), lado a lado. */
export default function PlanejarScreen() {
  const [secao, setSecao] = useState<Secao>('orcamento');

  return (
    <Tela titulo="Planejar">
      <View style={styles.seletor} accessibilityRole="radiogroup">
        <Chip texto="Orçamento" ativo={secao === 'orcamento'} aoTocar={() => setSecao('orcamento')} />
        <Chip texto="Metas" ativo={secao === 'metas'} aoTocar={() => setSecao('metas')} />
      </View>
      {secao === 'orcamento' ? <PainelOrcamento /> : <PainelMetas />}
    </Tela>
  );
}

const styles = StyleSheet.create({
  seletor: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: -Spacing.two,
  },
});
