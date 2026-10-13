import { router } from 'expo-router';

import { PainelMetas } from '@/components/painel-metas';
import { Tela } from '@/components/tela';

/** Aba Metas: progresso de cada objetivo e atalho para as conquistas. */
export default function MetasScreen() {
  return (
    <Tela
      titulo="Metas"
      subtitulo="Cada valor guardado te deixa mais perto."
      acoes={[{ icone: 'mais', rotulo: 'Nova meta', aoTocar: () => router.push('/nova-meta') }]}>
      <PainelMetas />
    </Tela>
  );
}
