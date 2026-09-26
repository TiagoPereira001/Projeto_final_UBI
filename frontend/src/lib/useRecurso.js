import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

// a última resposta dos recursos pedidos com `memoria`, para o ecrã aparecer
// completo logo ao voltar a ele (e atualizar por trás). Limpa-se sempre que a
// sessão muda: num tablet partilhado, quem entra a seguir nunca vê o que ficou
// da sessão anterior
const memoria = new Map();

export function limparMemoriaRecursos() {
  memoria.clear();
}

// vai buscar um recurso à API e mantém-no atualizado.
// - `intervalo` (ms): volta a pedir de x em x tempo, mas só com o ecrã visível.
//   O tablet da oficina fica ligado o dia todo; assim vê o que os colegas
//   mudam noutros dispositivos sem ninguém ter de atualizar a página.
// - `memoria`: mostra logo a última resposta que se teve (ver acima).
// - enquanto atualiza, mantém os dados antigos no ecrã (sem piscar).
export function useRecurso(caminho, { intervalo = 0, memoria: comMemoria = false } = {}) {
  const [estado, setEstado] = useState(() => {
    const guardado = comMemoria && caminho ? memoria.get(caminho) : undefined;
    return { dados: guardado ?? null, erro: null, aCarregar: Boolean(caminho) && !guardado };
  });
  const pedidoAtual = useRef(null);

  const carregar = useCallback(async () => {
    if (!caminho) return;
    pedidoAtual.current?.abort();
    const controlo = new AbortController();
    pedidoAtual.current = controlo;
    try {
      const dados = await api.get(caminho, { sinal: controlo.signal });
      if (comMemoria) memoria.set(caminho, dados);
      setEstado({ dados, erro: null, aCarregar: false });
    } catch (erro) {
      if (erro.name === 'AbortError') return;
      setEstado((anterior) => ({ ...anterior, erro, aCarregar: false }));
    }
  }, [caminho, comMemoria]);

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
