import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

// a última resposta dos recursos pedidos com `memoria` (e quando chegou), para
// o ecrã aparecer completo logo ao voltar a ele (e atualizar por trás). Limpa-se
// sempre que a sessão muda: num tablet partilhado, quem entra a seguir nunca vê
// o que ficou da sessão anterior
const memoria = new Map();

export function limparMemoriaRecursos() {
  memoria.clear();
}

// vai buscar um recurso à API e mantém-no atualizado.
// - `intervalo` (ms): volta a pedir de x em x tempo, mas só com o ecrã visível.
//   O tablet da oficina fica ligado o dia todo; assim vê o que os colegas
//   mudam noutros dispositivos sem ninguém ter de atualizar a página.
// - `memoria`: mostra logo a última resposta que se teve (ver acima).
// - enquanto atualiza, mantém os dados antigos no ecrã (sem piscar). Se o
//   pedido seguinte falhar, ficam os dados e o `erro`: `atualizadoEm` (ms) diz
//   de quando são, para o ecrã não os afirmar como se fossem de agora.
export function useRecurso(caminho, { intervalo = 0, memoria: comMemoria = false } = {}) {
  const [estado, setEstado] = useState(() => {
    const guardado = comMemoria && caminho ? memoria.get(caminho) : undefined;
    return {
      dados: guardado?.dados ?? null,
      atualizadoEm: guardado?.em ?? null,
      erro: null,
      aCarregar: Boolean(caminho) && !guardado,
    };
  });
  const pedidoAtual = useRef(null);

  const carregar = useCallback(async () => {
    if (!caminho) return;
    pedidoAtual.current?.abort();
    const controlo = new AbortController();
    pedidoAtual.current = controlo;
    try {
      const dados = await api.get(caminho, { sinal: controlo.signal });
      const atualizadoEm = Date.now();
      if (comMemoria) memoria.set(caminho, { dados, em: atualizadoEm });
      setEstado({ dados, atualizadoEm, erro: null, aCarregar: false });
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

  // para atualizar o ecrã logo com a resposta de uma alteração (sem novo pedido).
  // Um pedido que já vá a caminho (a atualização de 30 em 30 s) foi feito antes
  // desta alteração e traria os dados de antes: deita-se fora, senão a folha
  // que acabou de ser entregue voltava a aparecer aberta até à volta seguinte
  const definirDados = useCallback((atualizar) => {
    pedidoAtual.current?.abort();
    setEstado((anterior) => ({
      ...anterior,
      dados: typeof atualizar === 'function' ? atualizar(anterior.dados) : atualizar,
      atualizadoEm: Date.now(),
    }));
  }, []);

  return { ...estado, recarregar: carregar, definirDados };
}
