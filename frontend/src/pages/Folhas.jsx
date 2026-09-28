import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlass } from '../components/icones';
import { useRecurso } from '../lib/useRecurso';
import { useAtraso } from '../lib/useAtraso';
import { ESTADOS, data, descreverVeiculo, euros } from '../lib/formatar';
import { Matricula } from '../components/Matricula';
import { EstadoFolha } from '../components/Estado';
import { Seletor } from '../components/Campo';
import { Paginacao } from '../components/Paginacao';
import { ErroCarregar, Esqueleto, Vazio } from '../components/Situacoes';
import '../styles/gestao.css';

const POR_PAGINA = 30;

// o histórico: todas as folhas da oficina, incluindo as entregues
export default function Folhas() {
  const [estado, setEstado] = useState('');
  const [pesquisa, setPesquisa] = useState('');
  const [pagina, setPagina] = useState(1);
  const q = useAtraso(pesquisa.trim());

  const parametros = new URLSearchParams({ pagina, porPagina: POR_PAGINA, ordem: 'recentes' });
  if (estado) parametros.set('estado', estado);
  if (q) parametros.set('q', q);
  const folhas = useRecurso(`/folhas-obra?${parametros}`);

  const itens = folhas.dados?.itens ?? [];

  return (
    <div className="gestao">
      <header className="cabecalho">
        <h1 className="cabecalho__titulo">Histórico</h1>
        <p className="cabecalho__sub">Todas as folhas de obra, das mais recentes para as mais antigas.</p>
      </header>

      <div className="filtros">
        <div className="pesquisa">
          <MagnifyingGlass size={20} aria-hidden="true" />
          <input className="controlo" type="search" value={pesquisa} aria-label="Procurar folhas"
            onChange={(e) => { setPesquisa(e.target.value); setPagina(1); }}
            placeholder="Matrícula, cliente ou nº da folha" autoComplete="off" />
        </div>
        <Seletor
          etiqueta="Estado"
          className="filtros__estado"
          value={estado}
          onChange={(e) => { setEstado(e.target.value); setPagina(1); }}
          opcoes={[{ valor: '', nome: 'Todos' }, ...ESTADOS.map((e) => ({ valor: e.codigo, nome: e.nome }))]}
        />
      </div>

      <section className="painel">
        {folhas.aCarregar && <div className="painel__corpo"><Esqueleto linhas={6} altura={60} /></div>}
        {folhas.erro && !folhas.dados && (
          <div className="painel__corpo"><ErroCarregar erro={folhas.erro} aoTentar={folhas.recarregar} /></div>
        )}
        {folhas.dados && itens.length === 0 && (
          <Vazio titulo={q || estado ? 'Nenhuma folha encontrada.' : 'Ainda não há folhas de obra.'}>
            {q || estado ? 'Experimenta outra pesquisa ou outro estado.' : 'As folhas aparecem aqui a partir da primeira entrada.'}
          </Vazio>
        )}
        {itens.length > 0 && (
          <ul className="lista">
            {itens.map((f) => (
              <li key={f.id}>
                <Link to={`/folhas/${f.id}`} className="lista__item linha-historico">
                  <span className="linha-historico__numero num">nº {f.numero}</span>
                  <Matricula valor={f.veiculo.matricula} />
                  <span className="linha-historico__texto">
                    <span className="linha-historico__titulo">{descreverVeiculo(f.veiculo)}</span>
                    <span className="linha-historico__sub">{f.cliente.nome}</span>
                  </span>
                  <span className="linha-historico__estado">
                    <EstadoFolha estado={f.estado} />
                    <span className="linha-historico__data num">entrou a {data(f.dataEntrada)}</span>
                  </span>
                  <span className="linha-historico__valor num">{euros(f.subtotal)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Paginacao pagina={pagina} porPagina={POR_PAGINA} total={folhas.dados?.total} aoMudar={setPagina} />
      </section>
      <p className="gestao__nota">Valores sem IVA.</p>
    </div>
  );
}
