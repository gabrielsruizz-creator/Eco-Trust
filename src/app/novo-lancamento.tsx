import { useLocalSearchParams } from 'expo-router';

import { FormularioLancamento } from '@/components/formulario-lancamento';
import { adicionarTransacao } from '@/services/transacoes-service';

export default function NovoLancamentoScreen() {
  const { tipo } = useLocalSearchParams<{ tipo?: string }>();
  return (
    <FormularioLancamento
      titulo="Novo lançamento"
      aoSalvar={adicionarTransacao}
      tipoInicial={tipo === 'receita' ? 'receita' : 'despesa'}
    />
  );
}
