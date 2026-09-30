import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { SignOut, Moon, Sun } from './icones';
import { useSessao } from '../context/SessaoContext';
import { useBloqueioPorInatividade } from '../lib/useBloqueioPorInatividade';
import { alternarTema, temaAtual } from '../lib/tema';
import { Marca } from './Marca';
import { AvisoBloqueio } from './AvisoBloqueio';

const MINUTOS_ATE_BLOQUEAR = 5;
// nos últimos segundos, o tablet avisa antes de terminar a sessão
const SEGUNDOS_DE_AVISO = 30;

// o esqueleto de todas as páginas depois de entrar: barra de topo com a
// oficina e quem está a trabalhar, separadores e o conteúdo
export function Moldura() {
  const { colaborador, oficina, sair } = useSessao();
  const navegar = useNavigate();
  const [tema, setTema] = useState(temaAtual);
  const noTablet = colaborador.via === 'pin';
  const gestor = colaborador.cargo === 'gestor';

  async function terminar() {
    await sair();
    navegar(noTablet ? '/bancada' : '/entrar', { replace: true });
  }

  // no tablet partilhado, se ninguém mexer durante uns minutos, a sessão
  // termina sozinha: o próximo a chegar não trabalha em nome do anterior.
  // Nos últimos segundos avisa, para quem só parou um instante poder continuar
  const { restante, continuar } = useBloqueioPorInatividade(
    noTablet, MINUTOS_ATE_BLOQUEAR, terminar, SEGUNDOS_DE_AVISO
  );

  const separadores = [
    { para: '/', nome: 'Oficina', fim: true },
    { para: '/folhas', nome: 'Histórico', fim: true },
    { para: '/clientes', nome: 'Clientes' },
    { para: '/veiculos', nome: 'Veículos' },
    ...(gestor && !noTablet
      ? [
        { para: '/equipa', nome: 'Equipa' },
        { para: '/definicoes', nome: 'Definições' },
      ]
      : []),
  ];

  return (
    <div className="moldura">
      <a className="saltar" href="#conteudo">Saltar para o conteúdo</a>
      <header className="topo">
        <div className="topo__barra">
          <Link to="/" className="topo__marca" aria-label="Bancada: voltar ao quadro da oficina">
            <Marca tamanho={30} />
          </Link>
          <span className="topo__oficina" title={oficina?.nome}>{oficina?.nome}</span>

          <div className="topo__quem">
            <span className="topo__pessoa">
              <span className="topo__nome">{colaborador.nome}</span>
              {noTablet && <span className="topo__cargo">no tablet da oficina</span>}
            </span>
            <button
              type="button"
              className="topo__icone"
              onClick={() => setTema(alternarTema())}
              aria-label={tema === 'escuro' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              title={tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}
            >
              {tema === 'escuro' ? <Sun size={22} aria-hidden="true" /> : <Moon size={22} aria-hidden="true" />}
            </button>
            <button
              type="button"
              className="topo__sair"
              onClick={terminar}
              aria-label={noTablet ? 'Sair do tablet' : 'Sair'}
            >
              <SignOut size={20} weight="bold" aria-hidden="true" />
              <span className="topo__sair-texto">{noTablet ? 'Sair do tablet' : 'Sair'}</span>
            </button>
          </div>
        </div>

        <nav className="separadores" aria-label="Secções">
          {separadores.map(({ para, nome, fim }) => (
            <NavLink key={para} to={para} end={fim} className="separadores__item">
              {nome}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="conteudo" id="conteudo" tabIndex={-1}>
        <Outlet />
      </main>

      {restante !== null && (
        <AvisoBloqueio segundos={restante} total={SEGUNDOS_DE_AVISO} aoContinuar={continuar} />
      )}
    </div>
  );
}
