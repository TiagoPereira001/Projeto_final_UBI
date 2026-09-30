import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MagnifyingGlass } from '../components/icones';
import { useSessao } from '../context/SessaoContext';
import { useRecurso } from '../lib/useRecurso';
import { ESTADOS, descreverVeiculo, euros, inicioDoMes, quandoEntrou } from '../lib/formatar';
import { contem } from '../lib/texto';
import { Tablier } from '../components/Tablier';
import { Matricula } from '../components/Matricula';
import { EstadoFolha } from '../components/Estado';
import { Botao } from '../components/Botao';
import { ErroCarregar, Esqueleto, Vazio } from '../components/Situacoes';
import '../styles/quadro.css';

// o quadro da oficina: o tablier com uma luz por estado e, por baixo, os
// veículos que estão cá dentro (os que esperam há mais tempo primeiro).
// Atualiza sozinho a cada 20 segundos para o tablet ver o que os colegas mudam
export default function Quadro() {
  const { colaborador } = useSessao();
  const gestor = colaborador.cargo === 'gestor';
  // no tablet partilhado (modo bancada) o quadro lê-se de pé, a 1 ou 2 m
  const noTablet = colaborador.via === 'pin';
  const folhas = useRecurso('/folhas-obra?estado=ativas&ordem=antigas&porPagina=200', { intervalo: 20000, memoria: true });
  const resumo = useRecurso(
    gestor ? `/folhas-obra/resumo?desde=${encodeURIComponent(inicioDoMes())}` : null,
    { intervalo: 60000, memoria: true }
  );
  const [filtro, setFiltro] = useState(null);
  const [pesquisa, setPesquisa] = useState('');

  const itens = folhas.dados?.itens;
  const contagens = useMemo(() => {
    if (!itens) return null;
    const conta = {};
    for (const f of itens) conta[f.estado] = (conta[f.estado] ?? 0) + 1;
    return conta;
  }, [itens]);

  const visiveis = useMemo(() => (itens ?? []).filter((f) =>
    (!filtro || f.estado === filtro) &&
    (contem(f.veiculo.matricula, pesquisa) || contem(f.cliente.nome, pesquisa) ||
      contem(descreverVeiculo(f.veiculo), pesquisa) || String(f.numero) === pesquisa.trim())
  ), [itens, filtro, pesquisa]);

  const nomeFiltro = ESTADOS.find((e) => e.codigo === filtro)?.tablier;

  return (
    <div className="quadro">
      <h1 className="so-leitores">Quadro da oficina</h1>

      <Tablier
        contagens={contagens}
        aCarregar={folhas.aCarregar}
        filtro={filtro}
        aoEscolher={setFiltro}
        aDistancia={noTablet}
      />

      {gestor && resumo.dados && (
        <p className="quadro__contas num">
          <span>Trabalho em curso <strong>{euros(resumo.dados.emCurso.subtotal)}</strong> sem IVA</span>
          <span>
            Entregues este mês <strong>{resumo.dados.entregues.folhas}</strong>
            {resumo.dados.entregues.folhas === 1 ? ' folha' : ' folhas'},{' '}
            <strong>{euros(resumo.dados.entregues.total)}</strong> com IVA
          </span>
        </p>
      )}

      <div className="quadro__barra">
        <div className="pesquisa">
          <MagnifyingGlass size={22} aria-hidden="true" />
          <input
            className="controlo controlo--grande"
            type="search"
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            placeholder="Matrícula, cliente ou nº da folha"
            aria-label="Procurar no quadro"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <Botao variante="primario" tamanho="grande" para="/entrada" icone={Plus}>Nova entrada</Botao>
      </div>

      <section className="painel" aria-labelledby="titulo-lista">
        <header className="painel__cabecalho">
          <h2 className="painel__titulo" id="titulo-lista">{filtro ? nomeFiltro : 'Na oficina'}</h2>
          {itens && (
            <span className="quadro__contagem num">
              {visiveis.length} {visiveis.length === 1 ? 'veículo' : 'veículos'}
            </span>
          )}
          {filtro && (
            <button type="button" className="quadro__limpar" onClick={() => setFiltro(null)}>
              Mostrar todos
            </button>
          )}
        </header>

        {folhas.aCarregar && <div className="painel__corpo"><Esqueleto linhas={4} /></div>}
        {folhas.erro && !itens && (
          <div className="painel__corpo"><ErroCarregar erro={folhas.erro} aoTentar={folhas.recarregar} /></div>
        )}

        {itens && itens.length === 0 && (
          <Vazio
            titulo="A oficina está vazia."
            acao={<Botao variante="primario" para="/entrada" icone={Plus}>Dar entrada a um veículo</Botao>}
          >
            Quando um veículo entrar, aparece aqui com a luz do estado em que está.
          </Vazio>
        )}

        {itens && itens.length > 0 && visiveis.length === 0 && (
          <Vazio titulo="Nada com estes filtros.">
            Experimenta outra matrícula ou toca na luz acesa do tablier para ver todos.
          </Vazio>
        )}

        {visiveis.length > 0 && (
          <ul className="lista">
            {visiveis.map((folha) => (
              <li key={folha.id}>
                <Link to={`/folhas/${folha.id}`} className="lista__item fila">
                  <span className="fila__matricula">
                    <Matricula valor={folha.veiculo.matricula} />
                    <span className="fila__folha num">Folha {folha.numero}</span>
                  </span>
                  <span className="fila__veiculo">
                    <span className="fila__titulo">{descreverVeiculo(folha.veiculo)}</span>
                    <span className="fila__sub">{folha.cliente.nome}</span>
                  </span>
                  <span className="fila__queixa">{folha.observacoes || 'Sem observações de entrada.'}</span>
                  <span className="fila__estado">
                    <EstadoFolha estado={folha.estado} />
                    <span className="fila__tempo">{quandoEntrou(folha.dataEntrada)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
