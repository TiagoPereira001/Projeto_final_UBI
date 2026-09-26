import { useEffect, useRef, useState } from 'react';
import { ESTADOS_ATIVOS } from '../lib/formatar';
import { useSessao } from '../context/SessaoContext';
import { SimboloEstado } from './Luzes';

// o autoteste só acontece se o quadro abrir pouco depois de se "rodar a
// chave" (a app abrir ou alguém entrar). Voltar ao quadro depois de ver uma
// folha mostra logo as luzes como estão, sem as apagar e voltar a acender
const JANELA_DA_CHAVE = 4000;
// 3 luzes × 110 ms de atraso + 1,4 s da animação da última
const DURACAO_AUTOTESTE = 1800;
// a chave cujo autoteste já se viu até ao fim. É partilhada por todas as
// vezes que o quadro abre: o autoteste acontece uma vez por entrada
let chaveTestada = null;

// o tablier da oficina: uma luz de aviso por estado, acesa quando há
// veículos nesse estado. A luz é o que se vê primeiro; o número é uma
// leitura por baixo do nome. Tocar numa luz filtra a lista; tocar outra vez
// tira o filtro.
//
// dois momentos de luz, como num carro:
// - ao rodar a chave (alguém entrou), todas as luzes acendem por um instante
//   e ficam só as que têm veículos: o "autoteste";
// - quando um estado passa de 0 para 1 ou mais, a luz acende com um cintilar.
export function Tablier({ contagens, filtro, aoEscolher, aCarregar = false }) {
  const { ligadoEm } = useSessao();
  const pronto = Boolean(contagens);
  const anteriores = useRef(null);
  const [aAcender, setAAcender] = useState([]);
  const [autoteste, setAutoteste] = useState(false);

  useEffect(() => {
    if (!pronto || chaveTestada === ligadoEm || Date.now() - ligadoEm > JANELA_DA_CHAVE) return undefined;
    setAutoteste(true);
    const relogio = setTimeout(() => {
      chaveTestada = ligadoEm;
      setAutoteste(false);
    }, DURACAO_AUTOTESTE);
    return () => {
      clearTimeout(relogio);
      setAutoteste(false);
    };
  }, [pronto, ligadoEm]);

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
    <div
      className="tablier"
      data-autoteste={autoteste}
      role="group"
      aria-label="Estado da oficina: toca numa luz para filtrar"
    >
      {ESTADOS_ATIVOS.map((estado, ordem) => {
        const numero = contagens?.[estado.codigo] ?? 0;
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
            style={{ '--ordem': ordem }}
          >
            <SimboloEstado estado={estado.codigo} tamanho={60} className="tablier__simbolo" />
            <span className="tablier__leitura">
              <span className="tablier__nome">{estado.tablier}</span>
              <span className="tablier__numero num">
                {aCarregar ? '·' : numero}
                <span className="so-leitores">{numero === 1 ? ' veículo' : ' veículos'}</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
