import { router } from 'expo-router';

import { PainelOrcamento } from '@/components/painel-orcamento';
import { Botao } from '@/components/tela';
import { TelaSecundaria } from '@/components/tela-secundaria';

/** Categorias e orçamento do mês (aberto pela aba Transações e pelo Início). */
export default function OrcamentoScreen() {
  return (
    <TelaSecundaria titulo="Categorias e orçamento">
      <PainelOrcamento />
      <Botao
        texto="Gerenciar categorias"
        variante="secundario"
        icone="ajustes"
        onPress={() => router.push('/categorias')}
      />
    </TelaSecundaria>
  );
}
