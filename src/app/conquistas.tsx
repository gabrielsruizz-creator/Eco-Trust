import { CartaoJornada, GradeConquistas } from '@/components/jornada';
import { TelaSecundaria } from '@/components/tela-secundaria';
import { ThemedText } from '@/components/themed-text';
import { useJornada } from '@/hooks/use-dados';
import { useConta } from '@/hooks/use-sessao';

export default function ConquistasScreen() {
  const conta = useConta();
  const jornada = useJornada(conta?.criadoEm ?? null);
  const alcancadas = jornada.conquistas.filter((c) => c.alcancada).length;

  return (
    <TelaSecundaria titulo="Sua jornada">
      <CartaoJornada jornada={jornada} />
      <ThemedText type="smallBold" accessibilityRole="header">
        Conquistas · {alcancadas} de {jornada.conquistas.length}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Toque numa medalha para ver o que falta. Cada conquista vale 50 XP.
      </ThemedText>
      <GradeConquistas conquistas={jornada.conquistas} />
    </TelaSecundaria>
  );
}
