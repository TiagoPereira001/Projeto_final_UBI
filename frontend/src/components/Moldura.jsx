import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Gauge, ClockCounterClockwise, Users, Car, UsersThree, Gear, SignOut, Moon, Sun } from './icones';
import { useSessao } from '../context/SessaoContext';
import { useBloqueioPorInatividade } from '../lib/useBloqueioPorInatividade';
import { alternarTema, temaAtual } from '../lib/tema';
import { nomeCargo } from '../lib/formatar';
import { Marca } from './Marca';

const MINUTOS_ATE_BLOQUEAR = 5;

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
  // termina sozinha: o próximo a chegar não trabalha em nome do anterior
  useBloqueioPorInatividade(noTablet, MINUTOS_ATE_BLOQUEAR, terminar);

  const separadores = [
    { para: '/', nome: 'Oficina', icone: Gauge, fim: true },
    { para: '/folhas', nome: 'Histórico', icone: ClockCounterClockwise, fim: true },
    { para: '/clientes', nome: 'Clientes', icone: Users },
    { para: '/veiculos', nome: 'Veículos', icone: Car },
    ...(gestor && !noTablet
      ? [
        { para: '/equipa', nome: 'Equipa', icone: UsersThree },
        { para: '/definicoes', nome: 'Definições', icone: Gear },
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
              <span className="topo__cargo">{nomeCargo(colaborador.cargo)}{noTablet ? ' · no tablet' : ''}</span>
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
            <button type="button" className={`topo__sair ${noTablet ? 'topo__sair--tablet' : ''}`} onClick={terminar}>
              <SignOut size={20} weight="bold" aria-hidden="true" />
              {noTablet ? 'Terminar' : 'Sair'}
            </button>
          </div>
        </div>

        <nav className="separadores" aria-label="Secções">
          {separadores.map(({ para, nome, icone: Icone, fim }) => (
            <NavLink key={para} to={para} end={fim} className="separadores__item">
              <Icone size={20} aria-hidden="true" />
              {nome}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="conteudo" id="conteudo" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
