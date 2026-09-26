import { useEffect, useState } from 'react';

// devolve o valor só depois de o utilizador parar de escrever durante `ms`:
// assim a pesquisa não faz um pedido à API por cada letra
export function useAtraso(valor, ms = 250) {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const relogio = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(relogio);
  }, [valor, ms]);
  return atrasado;
}
