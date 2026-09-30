import { useEffect } from 'react';

const NOME = 'Bancada';

// o título do separador diz onde se está ("Histórico | Bancada"). Com o mesmo
// título em todas as páginas, o histórico do browser, os separadores abertos do
// gestor e os leitores de ecrã (que o leem quando a página muda) não
// distinguiam um ecrã de outro. Sem título, volta a "Bancada"
export function useTitulo(titulo) {
  useEffect(() => {
    document.title = titulo ? `${titulo} | ${NOME}` : NOME;
    return () => {
      document.title = NOME;
    };
  }, [titulo]);
}
