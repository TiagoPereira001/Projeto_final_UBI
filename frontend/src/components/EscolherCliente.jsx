import { useState } from 'react';
import { MagnifyingGlass, Plus } from './icones';
import { api } from '../lib/api';
import { useRecurso } from '../lib/useRecurso';
import { useAtraso } from '../lib/useAtraso';
import { Botao } from './Botao';
import { Texto } from './Campo';
import { ErroFormulario } from './Situacoes';

// escolher o dono de um veículo: procurar um cliente que já existe, ou criar
// um novo ali mesmo (nome e telefone chegam; o resto pode vir depois)
export function EscolherCliente({ valor, aoMudar, erro }) {
  const [pesquisa, setPesquisa] = useState('');
  const [novo, setNovo] = useState(null);
  const [aGuardar, setAGuardar] = useState(false);
  const [erroNovo, setErroNovo] = useState(null);
  const [erros, setErros] = useState({});
  const q = useAtraso(pesquisa.trim());
  const resultados = useRecurso(q.length >= 2 ? `/clientes?q=${encodeURIComponent(q)}&porPagina=6` : null);

  if (valor) {
    return (
      <div className="escolher-cliente escolher-cliente--escolhido">
        <div>
          <span className="campo__etiqueta">Cliente</span>
          <p className="escolher-cliente__nome">{valor.nome}</p>
          <p className="escolher-cliente__detalhe num">{valor.telefone}{valor.nif ? ` · NIF ${valor.nif}` : ''}</p>
        </div>
        <Botao variante="fantasma" onClick={() => aoMudar(null)}>Trocar</Botao>
      </div>
    );
  }

  async function criar() {
    setAGuardar(true);
    setErroNovo(null);
    setErros({});
    try {
      aoMudar(await api.post('/clientes', novo));
      setNovo(null);
    } catch (err) {
      setErroNovo(err.message);
      setErros(err.campos || {});
    } finally {
      setAGuardar(false);
    }
  }

  if (novo) {
    return (
      <div className="escolher-cliente">
        <p className="campo__etiqueta">Cliente novo</p>
        <div className="formulario__linha">
          <Texto etiqueta="Nome" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
            erro={erros.nome} autoComplete="off" />
          <Texto etiqueta="Telefone" type="tel" value={novo.telefone}
            onChange={(e) => setNovo({ ...novo, telefone: e.target.value })} erro={erros.telefone} />
          <Texto etiqueta="NIF" opcional value={novo.nif} onChange={(e) => setNovo({ ...novo, nif: e.target.value })}
            erro={erros.nif} ajuda="Estrangeiros: com o código do país (DE123...)." />
        </div>
        <ErroFormulario erro={erroNovo && !Object.keys(erros).length ? erroNovo : null} />
        <div className="formulario__acoes">
          <Botao variante="primario" onClick={criar} aTrabalhar={aGuardar}>Guardar cliente</Botao>
          <Botao variante="fantasma" onClick={() => setNovo(null)}>Cancelar</Botao>
        </div>
      </div>
    );
  }

  const lista = resultados.dados?.itens ?? [];
  return (
    <div className={`escolher-cliente ${erro ? 'campo--erro' : ''}`}>
      <label className="campo__etiqueta" htmlFor="procurar-cliente">Cliente</label>
      <div className="pesquisa">
        <MagnifyingGlass size={20} aria-hidden="true" />
        <input
          id="procurar-cliente"
          className="controlo"
          type="search"
          value={pesquisa}
          onChange={(e) => setPesquisa(e.target.value)}
          placeholder="Nome, telefone ou NIF"
          autoComplete="off"
        />
      </div>
      {erro && <p className="campo__mensagem">{erro}</p>}
      {q.length >= 2 && (
        <ul className="lista escolher-cliente__resultados">
          {lista.map((c) => (
            <li key={c.id}>
              <button type="button" className="lista__item escolher-cliente__opcao" onClick={() => aoMudar(c)}>
                <span className="escolher-cliente__nome">{c.nome}</span>
                <span className="escolher-cliente__detalhe num">{c.telefone}</span>
              </button>
            </li>
          ))}
          {!resultados.aCarregar && lista.length === 0 && (
            <li className="escolher-cliente__sem">Nenhum cliente com &laquo;{q}&raquo;.</li>
          )}
        </ul>
      )}
      <Botao
        variante="secundario"
        icone={Plus}
        onClick={() => setNovo({ nome: /\d/.test(pesquisa) ? '' : pesquisa, telefone: /\d/.test(pesquisa) ? pesquisa : '', nif: '' })}
      >
        Cliente novo
      </Botao>
    </div>
  );
}
