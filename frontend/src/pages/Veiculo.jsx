import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Archive, PencilSimple, Plus } from '../components/icones';
import { api } from '../lib/api';
import { useRecurso } from '../lib/useRecurso';
import { useTitulo } from '../lib/useTitulo';
import { data, descreverVeiculo, euros, nomeTipo, quilometros } from '../lib/formatar';
import { useSessao } from '../context/SessaoContext';
import { useAvisos } from '../context/AvisosContext';
import { Matricula } from '../components/Matricula';
import { EstadoFolha } from '../components/Estado';
import { Botao, BotaoConfirmar } from '../components/Botao';
import { FormularioVeiculo } from '../components/FormularioVeiculo';
import { ErroCarregar, Esqueleto, Vazio } from '../components/Situacoes';
import '../styles/gestao.css';
import '../styles/entrada-veiculo.css';

// ficha do veículo: dados e, sobretudo, o histórico de todas as vezes que
// esteve na oficina (com os conselhos deixados em cada visita)
export default function Veiculo() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { colaborador } = useSessao();
  const { mostrar } = useAvisos();
  const veiculo = useRecurso(`/veiculos/${id}`);
  const [aEditar, setAEditar] = useState(false);
  useTitulo(veiculo.dados ? `Veículo ${veiculo.dados.matricula}` : 'Veículo');

  if (veiculo.aCarregar) return <Esqueleto linhas={3} altura={80} />;
  if (veiculo.erro && !veiculo.dados) {
    return veiculo.erro.status === 404
      ? <Vazio pagina titulo="Este veículo não existe." acao={<Botao para="/veiculos">Ver veículos</Botao>} />
      : <ErroCarregar erro={veiculo.erro} aoTentar={veiculo.recarregar} />;
  }
  const v = veiculo.dados;

  async function arquivar() {
    try {
      await api.apagar(`/veiculos/${v.id}`);
      mostrar('Veículo arquivado.');
      navegar('/veiculos', { replace: true });
    } catch (err) {
      mostrar(err.message, { tipo: 'erro' });
    }
  }

  return (
    <div className="gestao">
      <Link to="/veiculos" className="voltar"><ArrowLeft size={20} weight="bold" aria-hidden="true" /> Veículos</Link>
      <header className="ficha-veiculo">
        <Matricula valor={v.matricula} tamanho="grande" />
        <div>
          <h1 className="cabecalho__titulo">{descreverVeiculo(v)}</h1>
          <p className="ficha-veiculo__sub">{nomeTipo(v.tipo)}{v.ano ? ` de ${v.ano}` : ''}</p>
          <p className="ficha-veiculo__sub">
            Cliente: <Link to={`/clientes/${v.cliente.id}`}>{v.cliente.nome}</Link>
          </p>
        </div>
        <div className="ficha-veiculo__acoes">
          {v.folhaAtiva ? (
            <Botao variante="primario" para={`/folhas/${v.folhaAtiva.id}`}>Abrir folha nº {v.folhaAtiva.numero}</Botao>
          ) : (
            <Botao variante="primario" icone={Plus} para="/entrada" state={{ veiculo: v }}>Dar entrada</Botao>
          )}
          {!aEditar && <Botao icone={PencilSimple} onClick={() => setAEditar(true)}>Editar</Botao>}
        </div>
      </header>

      {aEditar && (
        <section className="painel painel__corpo" aria-label="Editar veículo">
          <FormularioVeiculo
            inicial={v}
            textoBotao="Guardar alterações"
            aoCancelar={() => setAEditar(false)}
            aoGuardar={() => { setAEditar(false); veiculo.recarregar(); mostrar('Veículo atualizado.'); }}
          />
          {colaborador.cargo === 'gestor' && (
            <div className="gestao__perigo">
              <BotaoConfirmar icone={Archive} pergunta="Arquivar mesmo?" aoConfirmar={arquivar}>Arquivar veículo</BotaoConfirmar>
              <p>Sai das listas; o histórico fica guardado. Só dá para arquivar veículos que não estão na oficina.</p>
            </div>
          )}
        </section>
      )}

      <section className="painel" aria-labelledby="titulo-historico">
        <header className="painel__cabecalho">
          <h2 className="painel__titulo" id="titulo-historico">Histórico na oficina</h2>
        </header>
        {v.historico.length === 0 ? (
          <Vazio titulo="Ainda não esteve na oficina." />
        ) : (
          <ol className="lista">
            {v.historico.map((f) => (
              <li key={f.id}>
                <Link to={`/folhas/${f.id}`} className="lista__item visita">
                  <span className="visita__data">
                    <span className="num">{data(f.dataEntrada)}</span>
                    <span className="visita__numero num">nº {f.numero}</span>
                  </span>
                  <span className="visita__texto">
                    <EstadoFolha estado={f.estado} />
                    {f.conselhos && <span className="visita__conselho">Conselho: {f.conselhos}</span>}
                  </span>
                  <span className="visita__valores num">
                    <span>{quilometros(f.kmsEntrada)}</span>
                    <span>{euros(f.subtotal)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
