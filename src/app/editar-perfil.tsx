import { FluxoPerfil } from '@/components/fluxo-perfil';
import { usePerfilFinanceiro } from '@/hooks/use-dados';

export default function EditarPerfilScreen() {
  const perfil = usePerfilFinanceiro();
  return <FluxoPerfil modo="edicao" inicial={perfil} />;
}
