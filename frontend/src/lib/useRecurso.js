import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

// vai buscar um recurso à API e mantém-no atualizado.
// - `intervalo` (ms): volta a pedir de x em x tempo, mas só com o ecrã visível.
//   O tablet da oficina fica ligado o dia todo; assim vê o que os colegas
//   mudam noutros dispositivos sem ninguém ter de atualizar a página.
// - enquanto atualiza, mantém os dados antigos no ecrã (sem piscar).
export function useRecurso(caminho, { intervalo = 0 } = {}) {
  const [estado, setEstado] = useState({ dados: null, erro: null, aCarregar: Boolean(caminho) });
  const pedidoAtual = useRef(null);

  const carregar = useCallback(async () => {
    if (!caminho) return;
    pedidoAtual.current?.abort();
    const controlo = new AbortController();
    pedidoAtual.current = controlo;
    try {
      const dados = await api.get(caminho, { sinal: controlo.signal });
      setEstado({ dados, erro: null, aCarregar: false });
    } catch (erro) {
      if (erro.name === 'AbortError') return;
      setEstado((anterior) => ({ ...anterior, erro, aCarregar: false }));
    }
  }, [caminho]);

  useEffect(() => {
    setEstado((anterior) => ({ ...anterior, aCarregar: Boolean(caminho) && !anterior.dados }));
    carregar();
    return () => pedidoAtual.current?.abort();
  }, [carregar, caminho]);

  useEffect(() => {
    if (!intervalo) return undefined;
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'visible') carregar();
    };
    const relogio = setInterval(aoMudarVisibilidade, intervalo);
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    window.addEventListener('online', carregar);
    return () => {
      clearInterval(relogio);
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
      window.removeEventListener('online', carregar);
    };
  }, [intervalo, carregar]);

  // para atualizar o ecrã logo com a resposta de uma alteração (sem novo pedido)
  const definirDados = useCallback((atualizar) => {
    setEstado((anterior) => ({
      ...anterior,
      dados: typeof atualizar === 'function' ? atualizar(anterior.dados) : atualizar,
    }));
  }, []);

  return { ...estado, recarregar: carregar, definirDados };
}
