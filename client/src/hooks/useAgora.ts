import { useEffect, useState } from 'react';

/** Atualiza a hora enquanto o ecrã está aberto, para o Workspace fechar no prazo sem ser necessário mudar de página. */
export function useAgora() {
  const [agora, setAgora] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), 1000);

    return () => clearInterval(timer);
  }, []);

  return agora;
}
