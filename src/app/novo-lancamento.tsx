import { FormularioLancamento } from '@/components/formulario-lancamento';
import { adicionarTransacao } from '@/services/transacoes-service';

export default function NovoLancamentoScreen() {
  return <FormularioLancamento titulo="Novo lançamento" aoSalvar={adicionarTransacao} />;
}
