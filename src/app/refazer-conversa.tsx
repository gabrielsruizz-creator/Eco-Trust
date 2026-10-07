import { ChatCadastro } from '@/components/chat-cadastro';
import { useConta } from '@/hooks/use-sessao';

/** Refaz a conversa do cadastro para atualizar o perfil (sem apagar nada e sem duplicar metas). */
export default function RefazerConversaScreen() {
  const conta = useConta();
  return <ChatCadastro nomeConta={conta?.nome} modo="atualizar" />;
}
