import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MagnifyingGlass, Plus } from '../components/icones';
import { useRecurso } from '../lib/useRecurso';
import { useAtraso } from '../lib/useAtraso';
import { useAvisos } from '../context/AvisosContext';
import { Botao } from '../components/Botao';
import { FormularioCliente } from '../components/FormularioCliente';
import { Paginacao } from '../components/Paginacao';
import { ErroCarregar, Esqueleto, Vazio } from '../components/Situacoes';
import '../styles/gestao.css';

const POR_PAGINA = 30;

export default function Clientes() {
  const navegar = useNavigate();
  const { mostrar } = useAvisos();
  const [pesquisa, setPesquisa] = useState('');
  const [pagina, setPagina] = useState(1);
  const [aCriar, setACriar] = useState(false);
  const q = useAtraso(pesquisa.trim());
  const clientes = useRecurso(`/clientes?${new URLSearchParams({ q, pagina, porPagina: POR_PAGINA })}`);
  const itens = clientes.dados?.itens ?? [];

  return (
    <div className="gestao">
      <header className="cabecalho">
        <h1 className="cabecalho__titulo">Clientes</h1>
        {!aCriar && <Botao variante="primario" icone={Plus} onClick={() => setACriar(true)}>Novo cliente</Botao>}
      </header>

      {aCriar && (
        <section className="painel painel__corpo gestao__novo" aria-label="Novo cliente">
          <h2 className="painel__titulo">Novo cliente</h2>
          <FormularioCliente
            aoCancelar={() => setACriar(false)}
            aoGuardar={(novo) => { mostrar('Cliente criado.'); navegar(`/clientes/${novo.id}`); }}
          />
        </section>
      )}

      <div className="filtros">
        <div className="pesquisa">
          <MagnifyingGlass size={20} aria-hidden="true" />
          <input className="controlo" type="search" value={pesquisa} aria-label="Procurar clientes"
            onChange={(e) => { setPesquisa(e.target.value); setPagina(1); }}
            placeholder="Nome, telefone ou NIF" autoComplete="off" />
        </div>
      </div>

      <section className="painel">
        {clientes.aCarregar && <div className="painel__corpo"><Esqueleto linhas={6} altura={60} /></div>}
        {clientes.erro && !clientes.dados && (
          <div className="painel__corpo"><ErroCarregar erro={clientes.erro} aoTentar={clientes.recarregar} /></div>
        )}
        {clientes.dados && itens.length === 0 && (
          <Vazio titulo={q ? `Nenhum cliente com «${q}».` : 'Ainda não há clientes.'}>
            {q ? 'Confirma o nome ou procura pelo telefone.' : 'Os clientes também se criam ao dar entrada a um veículo novo.'}
          </Vazio>
        )}
        {itens.length > 0 && (
          <ul className="lista">
            {itens.map((c) => (
              <li key={c.id}>
                <Link to={`/clientes/${c.id}`} className="lista__item linha-simples">
                  <span className="linha-simples__principal">{c.nome}</span>
                  <span className="linha-simples__dado num">{c.telefone}</span>
                  <span className="linha-simples__dado num">{c.nif ? `NIF ${c.nif}` : 'Sem NIF'}</span>
                  <span className="linha-simples__dado">
                    {c.veiculos} {c.veiculos === 1 ? 'veículo' : 'veículos'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Paginacao pagina={pagina} porPagina={POR_PAGINA} total={clientes.dados?.total} aoMudar={setPagina} />
      </section>
    </div>
  );
}
