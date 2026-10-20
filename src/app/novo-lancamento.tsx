import { useLocalSearchParams } from 'expo-router';

import { FormularioLancamento, type SugestaoLancamento } from '@/components/formulario-lancamento';
import { adicionarTransacao } from '@/services/transacoes-service';
import { dataValida } from '@/utils/datas';

type Parametros = {
  tipo?: string;
  /** Vindos da leitura do QR Code da nota fiscal (tela ler-nota) */
  chave?: string;
  resumo?: string;
  url?: string;
  valor?: string;
  tributos?: string;
  data?: string;
  descricao?: string;
  categoria?: string;
};

function inteiro(texto?: string) {
  const n = Number(texto);
  return texto && Number.isInteger(n) && n >= 0 ? n : undefined;
}

export default function NovoLancamentoScreen() {
  const p = useLocalSearchParams<Parametros>();
  const sugestao: SugestaoLancamento | undefined =
    p.chave && /^\d{44}$/.test(p.chave)
      ? {
          chaveNota: p.chave,
          resumoNota: p.resumo,
          urlNota: p.url,
          valorCentavos: inteiro(p.valor),
          tributosCentavos: inteiro(p.tributos) ?? null,
          data: p.data && dataValida(p.data) ? p.data : undefined,
          descricao: p.descricao,
          categoriaId: inteiro(p.categoria),
        }
      : undefined;

  return (
    <FormularioLancamento
      titulo={sugestao ? 'Despesa da nota fiscal' : 'Novo lançamento'}
      aoSalvar={adicionarTransacao}
      tipoInicial={p.tipo === 'receita' ? 'receita' : 'despesa'}
      sugestao={sugestao}
    />
  );
}
