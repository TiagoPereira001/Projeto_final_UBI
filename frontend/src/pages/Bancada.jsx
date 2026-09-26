import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft } from '../components/icones';
import { useSessao } from '../context/SessaoContext';
import { useRecurso } from '../lib/useRecurso';
import { nomeCargo } from '../lib/formatar';
import { Marca } from '../components/Marca';
import { TecladoPin } from '../components/TecladoPin';
import { Arranque } from '../components/Protegida';
import '../styles/entrada.css';

// o ecrã de descanso do tablet partilhado: "Quem vai trabalhar?".
// Cada mecânico toca no seu nome e escreve o PIN. Tudo o que fizer a seguir
// fica registado em nome dele, até tocar em Terminar (ou ficar parado)
export default function Bancada() {
  const { colaborador, bancada, aCarregar, entrarComPin } = useSessao();
  const navegar = useNavigate();
  const lista = useRecurso(bancada ? '/auth/bancada' : null);
  const [escolhido, setEscolhido] = useState(null);
  const [erro, setErro] = useState(null);
  const [aTrabalhar, setATrabalhar] = useState(false);

  if (aCarregar) return <Arranque />;
  if (colaborador) return <Navigate to="/" replace />;
  if (!bancada) return <Navigate to="/entrar" replace />;

  async function entrar(pin, limpar) {
    setATrabalhar(true);
    setErro(null);
    try {
      await entrarComPin(escolhido.id, pin);
      navegar('/', { replace: true });
    } catch (err) {
      setErro(err.message);
      limpar();
      setATrabalhar(false);
    }
  }

  const colaboradores = lista.dados?.colaboradores ?? [];

  return (
    <div className="bancada">
      <header className="bancada__topo">
        <Marca tamanho={34} />
        <span className="bancada__oficina">{bancada.oficina.nome}</span>
        <Link to="/entrar" className="bancada__ligacao">Entrar com email</Link>
      </header>

      <main className="bancada__centro">
        {!escolhido ? (
          <>
            <h1 className="bancada__titulo">Quem vai trabalhar?</h1>
            {lista.erro && <p className="bancada__aviso" role="alert">{lista.erro.message}</p>}
            {!lista.aCarregar && colaboradores.length === 0 && !lista.erro && (
              <p className="bancada__aviso">
                Ainda ninguém tem PIN. Um gestor define os PINs em Equipa, no computador.
              </p>
            )}
            <ul className="bancada__pessoas">
              {colaboradores.map((c) => (
                <li key={c.id}>
                  <button type="button" className="bancada__pessoa" onClick={() => { setEscolhido(c); setErro(null); }}>
                    <span className="bancada__nome">{c.nome}</span>
                    <span className="bancada__cargo">{nomeCargo(c.cargo)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="bancada__pin">
            <button type="button" className="bancada__voltar" onClick={() => { setEscolhido(null); setErro(null); }}>
              <ArrowLeft size={22} weight="bold" aria-hidden="true" /> Não sou eu
            </button>
            <h1 className="bancada__titulo">{escolhido.nome}</h1>
            <p className="bancada__instrucao">Escreve o teu PIN</p>
            <TecladoPin aoSubmeter={entrar} aTrabalhar={aTrabalhar} erro={erro} />
          </div>
        )}
      </main>
    </div>
  );
}
