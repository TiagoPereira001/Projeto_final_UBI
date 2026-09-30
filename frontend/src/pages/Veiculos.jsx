import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MagnifyingGlass, Plus } from '../components/icones';
import { useRecurso } from '../lib/useRecurso';
import { useTitulo } from '../lib/useTitulo';
import { useAtraso } from '../lib/useAtraso';
import { descreverVeiculo, nomeTipo } from '../lib/formatar';
import { useAvisos } from '../context/AvisosContext';
import { Matricula } from '../components/Matricula';
import { EstadoFolha } from '../components/Estado';
import { Botao } from '../components/Botao';
import { FormularioVeiculo } from '../components/FormularioVeiculo';
import { Paginacao } from '../components/Paginacao';
import { ErroCarregar, Esqueleto, Vazio } from '../components/Situacoes';
import '../styles/gestao.css';
import '../styles/entrada-veiculo.css';

const POR_PAGINA = 30;

export default function Veiculos() {
  useTitulo('Veículos');
  const navegar = useNavigate();
  const { mostrar } = useAvisos();
  const [pesquisa, setPesquisa] = useState('');
  const [pagina, setPagina] = useState(1);
  const [aCriar, setACriar] = useState(false);
  const q = useAtraso(pesquisa.trim());
  const veiculos = useRecurso(`/veiculos?${new URLSearchParams({ q, pagina, porPagina: POR_PAGINA })}`);
  const itens = veiculos.dados?.itens ?? [];

  return (
    <div className="gestao">
      <header className="cabecalho">
        <h1 className="cabecalho__titulo">Veículos</h1>
        {!aCriar && <Botao variante="primario" icone={Plus} onClick={() => setACriar(true)}>Novo veículo</Botao>}
      </header>

      {aCriar && (
        <section className="painel painel__corpo gestao__novo" aria-label="Novo veículo">
          <h2 className="painel__titulo">Novo veículo</h2>
          <FormularioVeiculo
            aoCancelar={() => setACriar(false)}
            aoGuardar={(novo) => { mostrar('Veículo criado.'); navegar(`/veiculos/${novo.id}`); }}
          />
        </section>
      )}

      <div className="filtros">
        <div className="pesquisa">
          <MagnifyingGlass size={20} aria-hidden="true" />
          <input className="controlo" type="search" value={pesquisa} aria-label="Procurar veículos"
            onChange={(e) => { setPesquisa(e.target.value); setPagina(1); }}
            placeholder="Matrícula, marca, modelo ou cliente" autoComplete="off" spellCheck={false} />
        </div>
      </div>

      <section className="painel">
        {veiculos.aCarregar && <div className="painel__corpo"><Esqueleto linhas={6} altura={60} /></div>}
        {veiculos.erro && !veiculos.dados && (
          <div className="painel__corpo"><ErroCarregar erro={veiculos.erro} aoTentar={veiculos.recarregar} /></div>
        )}
        {veiculos.dados && itens.length === 0 && (
          <Vazio titulo={q ? `Nenhum veículo com «${q}».` : 'Ainda não há veículos.'}>
            {q ? 'Confirma a matrícula (com ou sem traços, tanto faz).' : 'Os veículos também se criam ao dar entrada na oficina.'}
          </Vazio>
        )}
        {itens.length > 0 && (
          <ul className="lista">
            {itens.map((v) => (
              <li key={v.id}>
                <Link to={`/veiculos/${v.id}`} className="lista__item linha-veiculo">
                  <Matricula valor={v.matricula} />
                  <span className="linha-veiculo__texto">
                    <span className="linha-veiculo__titulo">{descreverVeiculo(v)}</span>
                    <span className="linha-veiculo__sub">{nomeTipo(v.tipo)} de {v.cliente.nome}</span>
                  </span>
                  {v.folhaAtiva ? <EstadoFolha estado={v.folhaAtiva.estado} /> : <span className="linha-veiculo__fora">Fora da oficina</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Paginacao pagina={pagina} porPagina={POR_PAGINA} total={veiculos.dados?.total} aoMudar={setPagina} />
      </section>
    </div>
  );
}
