import { FormularioMeta } from '@/components/formulario-meta';
import { adicionarMeta } from '@/services/metas-service';

export default function NovaMetaScreen() {
  return <FormularioMeta titulo="Nova meta" aoSalvar={adicionarMeta} />;
}
