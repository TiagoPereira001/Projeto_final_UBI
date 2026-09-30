import { useCallback, useEffect, useRef, useState } from 'react';

// chama `aoBloquear` depois de `minutos` sem ninguém tocar no ecrã ou no
// teclado. Nos últimos `avisoSegundos` devolve os segundos que faltam
// (`restante`, ou null se ainda falta muito), para a interface avisar; e
// `continuar` volta a contar do zero. Tocar ou carregar numa tecla em
// qualquer sítio também continua
export function useBloqueioPorInatividade(ativo, minutos, aoBloquear, avisoSegundos = 30) {
  const callback = useRef(aoBloquear);
  callback.current = aoBloquear;
  const ultimaAtividade = useRef(Date.now());
  const bloqueado = useRef(false);
  const [restante, setRestante] = useState(null);

  const continuar = useCallback(() => {
    ultimaAtividade.current = Date.now();
    setRestante(null);
  }, []);

  useEffect(() => {
    if (!ativo) return undefined;
    bloqueado.current = false;
    ultimaAtividade.current = Date.now();
    const limite = minutos * 60 * 1000;

    const verificar = () => {
      const falta = limite - (Date.now() - ultimaAtividade.current);
      if (falta <= 0) {
        setRestante(null);
        // só uma vez: terminar a sessão demora um instante e o relógio continua a bater
        if (!bloqueado.current) {
          bloqueado.current = true;
          callback.current();
        }
        return;
      }
      setRestante(falta <= avisoSegundos * 1000 ? Math.ceil(falta / 1000) : null);
    };

    const eventos = ['pointerdown', 'keydown', 'wheel'];
    eventos.forEach((e) => window.addEventListener(e, continuar, { passive: true }));
    document.addEventListener('visibilitychange', verificar);
    const relogio = setInterval(verificar, 1000);

    return () => {
      eventos.forEach((e) => window.removeEventListener(e, continuar));
      document.removeEventListener('visibilitychange', verificar);
      clearInterval(relogio);
    };
  }, [ativo, minutos, avisoSegundos, continuar]);

  return { restante, continuar };
}
