import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, CaretRight } from '../components/icones';
import { api } from '../lib/api';
import { useRecurso } from '../lib/useRecurso';
import { useTitulo } from '../lib/useTitulo';
import { useAtraso } from '../lib/useAtraso';
import { descreverVeiculo, matricula as formatarMatricula } from '../lib/formatar';
import { useAvisos } from '../context/AvisosContext';
import { Matricula } from '../components/Matricula';
import { EstadoFolha } from '../components/Estado';
import { Botao } from '../components/Botao';
import { AreaTexto, Texto } from '../components/Campo';
import { ErroFormulario } from '../components/Situacoes';
import { FormularioVeiculo } from '../components/FormularioVeiculo';
import '../styles/entrada-veiculo.css';

// dar entrada a um veículo em três passos curtos:
// 1. a matrícula (se o carro já cá veio, aparece logo)
// 2. só se for novo: o veículo e o dono
// 3. os quilómetros e o que o cliente pediu
export default function NovaEntrada() {
  useTitulo('Nova entrada');
  const navegar = useNavigate();
  const { mostrar } = useAvisos();
  // vindo da ficha de um veículo ("Dar entrada"), salta logo para o último passo
  const preEscolhido = useLocation().state?.veiculo ?? null;
  const [passo, setPasso] = useState(preEscolhido ? 'entrada' : 'matricula');
  const [texto, setTexto] = useState('');
  const [veiculo, setVeiculo] = useState(preEscolhido);
  const q = useAtraso(texto.trim(), 200);
  const resultados = useRecurso(q.replace(/[^A-Za-z0-9]/g, '').length >= 2
    ? `/veiculos?q=${encodeURIComponent(q)}&porPagina=6`
    : null);

  const [kms, setKms] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState(null);
  const [erros, setErros] = useState({});

  async function darEntrada(ev) {
    ev.preventDefault();
    setAGuardar(true);
    setErro(null);
    setErros({});
    try {
      const folha = await api.post('/folhas-obra', {
        veiculoId: veiculo.id,
        kmsEntrada: kms === '' ? null : kms.replace(/\s|\./g, ''),
        observacoes,
      });
      mostrar(`Folha nº ${folha.numero} aberta.`);
      navegar(`/folhas/${folha.id}`, { replace: true });
    } catch (err) {
      setErro(err.message);
      setErros(err.campos || {});
      setAGuardar(false);
    }
  }

  const encontrados = resultados.dados?.itens ?? [];
  const normalizado = q.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const exato = encontrados.some((v) => v.matricula === normalizado);

  return (
    <div className="nova-entrada">
      <Link to="/" className="voltar"><ArrowLeft size={20} weight="bold" aria-hidden="true" /> Quadro</Link>
      <h1 className="cabecalho__titulo">Nova entrada</h1>

      {passo === 'matricula' && (
        <section className="nova-entrada__passo" aria-label="Matrícula">
          <label className="chapa-input">
            <span className="so-leitores">Matrícula</span>
            <span className="chapa-input__faixa" aria-hidden="true" />
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value.toUpperCase())}
              placeholder="AA-00-AA"
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={20}
            />
          </label>
          <p className="nova-entrada__dica">Escreve a matrícula. Se o veículo já cá esteve, aparece logo aqui.</p>

          {encontrados.length > 0 && (
            <ul className="lista painel nova-entrada__resultados">
              {encontrados.map((v) => (
                <li key={v.id}>
                  {v.folhaAtiva ? (
                    <Link to={`/folhas/${v.folhaAtiva.id}`} className="lista__item resultado">
                      <Matricula valor={v.matricula} />
                      <span className="resultado__texto">
                        <span className="resultado__titulo">{descreverVeiculo(v)}</span>
                        <span className="resultado__sub">{v.cliente.nome}</span>
                      </span>
                      <span className="resultado__acao">
                        <EstadoFolha estado={v.folhaAtiva.estado} />
                        <span className="resultado__sub">Já está na oficina: folha nº {v.folhaAtiva.numero}</span>
                      </span>
                    </Link>
                  ) : (
                    <button type="button" className="lista__item resultado" onClick={() => { setVeiculo(v); setPasso('entrada'); }}>
                      <Matricula valor={v.matricula} />
                      <span className="resultado__texto">
                        <span className="resultado__titulo">{descreverVeiculo(v)}</span>
                        <span className="resultado__sub">{v.cliente.nome}</span>
                      </span>
                      <span className="resultado__acao resultado__acao--entrar">
                        Dar entrada <CaretRight size={20} weight="bold" aria-hidden="true" />
                      </span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {normalizado.length >= 4 && !exato && !resultados.aCarregar && (
            <Botao variante="secundario" tamanho="grande" icone={Plus} onClick={() => setPasso('veiculo')}>
              Veículo novo: {formatarMatricula(normalizado)}
            </Botao>
          )}
        </section>
      )}

      {passo === 'veiculo' && (
        <section className="painel painel__corpo nova-entrada__passo" aria-label="Veículo novo">
          <h2 className="painel__titulo">Veículo novo</h2>
          <FormularioVeiculo
            inicial={{ matricula: formatarMatricula(normalizado) }}
            textoBotao="Continuar"
            aoCancelar={() => setPasso('matricula')}
            aoGuardar={(novo) => { setVeiculo(novo); setPasso('entrada'); }}
          />
        </section>
      )}

      {passo === 'entrada' && veiculo && (
        <form className="painel painel__corpo nova-entrada__passo formulario" onSubmit={darEntrada} noValidate>
          <div className="nova-entrada__veiculo">
            <Matricula valor={veiculo.matricula} tamanho="grande" />
            <div>
              <p className="resultado__titulo">{descreverVeiculo(veiculo)}</p>
              <p className="resultado__sub">{veiculo.cliente?.nome}</p>
            </div>
            <Botao variante="fantasma" onClick={() => { setVeiculo(null); setPasso('matricula'); }}>Trocar</Botao>
          </div>

          <Texto
            etiqueta="Quilómetros"
            opcional
            value={kms}
            onChange={(e) => setKms(e.target.value)}
            erro={erros.kmsEntrada}
            inputMode="numeric"
            className="nova-entrada__kms"
          />
          <AreaTexto
            etiqueta="O que o cliente pediu ou notou"
            opcional
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            erro={erros.observacoes}
            maxLength={2000}
            rows={4}
          />
          <ErroFormulario erro={erro && !Object.keys(erros).length ? erro : null} />
          <div className="formulario__acoes">
            <Botao type="submit" variante="primario" tamanho="grande" aTrabalhar={aGuardar}>Dar entrada</Botao>
          </div>
        </form>
      )}
    </div>
  );
}
