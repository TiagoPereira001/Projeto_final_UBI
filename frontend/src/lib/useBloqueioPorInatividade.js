import { useEffect, useRef } from 'react';

// chama `aoBloquear` depois de `minutos` sem ninguém tocar no ecrã ou no teclado
export function useBloqueioPorInatividade(ativo, minutos, aoBloquear) {
  const callback = useRef(aoBloquear);
  callback.current = aoBloquear;

  useEffect(() => {
    if (!ativo) return undefined;
    const limite = minutos * 60 * 1000;
    let ultimaAtividade = Date.now();
    const registar = () => { ultimaAtividade = Date.now(); };
    const verificar = () => {
      if (Date.now() - ultimaAtividade >= limite) callback.current();
    };

    const eventos = ['pointerdown', 'keydown', 'wheel'];
    eventos.forEach((e) => window.addEventListener(e, registar, { passive: true }));
    document.addEventListener('visibilitychange', verificar);
    const relogio = setInterval(verificar, 15000);

    return () => {
      eventos.forEach((e) => window.removeEventListener(e, registar));
      document.removeEventListener('visibilitychange', verificar);
      clearInterval(relogio);
    };
  }, [ativo, minutos]);
}
