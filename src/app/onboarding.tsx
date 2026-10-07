import { ChatCadastro } from '@/components/chat-cadastro';
import { useConta } from '@/hooks/use-sessao';

/** Primeiro acesso depois do cadastro: o EcoTrust conversa para montar o perfil e as metas. */
export default function OnboardingScreen() {
  const conta = useConta();
  return <ChatCadastro nomeConta={conta?.nome} />;
}
