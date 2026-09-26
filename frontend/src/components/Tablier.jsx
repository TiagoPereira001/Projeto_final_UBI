import { useEffect, useRef, useState } from 'react';
import { ESTADOS_ATIVOS } from '../lib/formatar';
import { ICONE_ESTADO } from './Estado';

// o tablier da oficina: uma luz por estado, acesa quando há veículos nesse
// estado, com o número ao lado. Tocar numa luz filtra a lista; tocar outra
// vez tira o filtro. Quando um estado passa de 0 para 1 ou mais veículos, a
// luz acende com um breve cintilar (como uma lâmpada a aquecer)
export function Tablier({ contagens, filtro, aoEscolher, aCarregar = false }) {
  const anteriores = useRef(null);
  const [aAcender, setAAcender] = useState([]);

  useEffect(() => {
    if (!contagens) return undefined;
    const antes = anteriores.current;
    anteriores.current = contagens;
    if (!antes) return undefined;
    const novas = ESTADOS_ATIVOS
      .filter((e) => !(antes[e.codigo] > 0) && contagens[e.codigo] > 0)
      .map((e) => e.codigo);
    if (novas.length === 0) return undefined;
    setAAcender(novas);
    const relogio = setTimeout(() => setAAcender([]), 900);
    return () => clearTimeout(relogio);
  }, [contagens]);

  return (
    <div className="tablier" role="group" aria-label="Estado da oficina: toca numa luz para filtrar">
      {ESTADOS_ATIVOS.map((estado) => {
        const numero = contagens?.[estado.codigo] ?? 0;
        const Icone = ICONE_ESTADO[estado.codigo];
        const ativa = filtro === estado.codigo;
        return (
          <button
            key={estado.codigo}
            type="button"
            className={`tablier__luz tablier__luz--${estado.codigo}`}
            data-acesa={numero > 0 && !aCarregar}
            data-a-acender={aAcender.includes(estado.codigo)}
            aria-pressed={ativa}
            onClick={() => aoEscolher(ativa ? null : estado.codigo)}
          >
            <span className="tablier__lente" aria-hidden="true">
              <Icone size={30} weight="fill" />
            </span>
            <span className="tablier__leitura">
              <span className="tablier__numero num">{aCarregar ? '·' : numero}</span>
              <span className="tablier__nome">{estado.tablier}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
