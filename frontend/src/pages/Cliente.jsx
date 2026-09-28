import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Archive } from '../components/icones';
import { api } from '../lib/api';
import { useRecurso } from '../lib/useRecurso';
import { descreverVeiculo, nomeTipo } from '../lib/formatar';
import { useSessao } from '../context/SessaoContext';
import { useAvisos } from '../context/AvisosContext';
import { Matricula } from '../components/Matricula';
import { Botao, BotaoConfirmar } from '../components/Botao';
import { FormularioCliente } from '../components/FormularioCliente';
import { FormularioVeiculo } from '../components/FormularioVeiculo';
import { ErroCarregar, Esqueleto, Vazio } from '../components/Situacoes';
import '../styles/gestao.css';

export default function Cliente() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { colaborador } = useSessao();
  const { mostrar } = useAvisos();
  const cliente = useRecurso(`/clientes/${id}`);
  const [aAdicionar, setAAdicionar] = useState(false);

  if (cliente.aCarregar) return <Esqueleto linhas={3} altura={80} />;
  if (cliente.erro && !cliente.dados) {
    return cliente.erro.status === 404
      ? <Vazio titulo="Este cliente não existe." acao={<Botao para="/clientes">Ver clientes</Botao>} />
      : <ErroCarregar erro={cliente.erro} aoTentar={cliente.recarregar} />;
  }
  const c = cliente.dados;

  async function arquivar() {
    try {
      await api.apagar(`/clientes/${c.id}`);
      mostrar('Cliente arquivado.');
      navegar('/clientes', { replace: true });
    } catch (err) {
      mostrar(err.message, { tipo: 'erro' });
    }
  }

  return (
    <div className="gestao">
      <Link to="/clientes" className="voltar"><ArrowLeft size={20} weight="bold" aria-hidden="true" /> Clientes</Link>
      <header className="cabecalho">
        <h1 className="cabecalho__titulo">{c.nome}</h1>
        {!c.ativo && <span className="etiqueta">Arquivado</span>}
      </header>

      <div className="gestao__duas">
        <section className="painel painel__corpo" aria-label="Dados do cliente">
          <h2 className="painel__titulo gestao__subtitulo">Dados</h2>
          <FormularioCliente
            key={c.id}
            inicial={c}
            textoBotao="Guardar alterações"
            aoGuardar={(novo) => { cliente.definirDados((x) => ({ ...x, ...novo })); mostrar('Cliente atualizado.'); }}
          />
          {colaborador.cargo === 'gestor' && c.ativo && (
            <div className="gestao__perigo">
              <BotaoConfirmar icone={Archive} pergunta="Arquivar mesmo?" aoConfirmar={arquivar}>Arquivar cliente</BotaoConfirmar>
              <p>O cliente deixa de aparecer nas listas, mas o histórico das folhas fica guardado.</p>
            </div>
          )}
        </section>

        <section className="painel" aria-labelledby="titulo-veiculos">
          <header className="painel__cabecalho">
            <h2 className="painel__titulo" id="titulo-veiculos">Veículos</h2>
            {!aAdicionar && <Botao tamanho="compacto" icone={Plus} onClick={() => setAAdicionar(true)}>Adicionar</Botao>}
          </header>
          {aAdicionar && (
            <div className="painel__corpo">
              <FormularioVeiculo
                inicial={{ cliente: c }}
                aoCancelar={() => setAAdicionar(false)}
                aoGuardar={(novo) => { mostrar('Veículo adicionado.'); navegar(`/veiculos/${novo.id}`); }}
              />
            </div>
          )}
          {c.veiculos.length === 0 && !aAdicionar ? (
            <Vazio titulo="Sem veículos." />
          ) : (
            <ul className="lista">
              {c.veiculos.map((v) => (
                <li key={v.id}>
                  <Link to={`/veiculos/${v.id}`} className="lista__item linha-veiculo">
                    <Matricula valor={v.matricula} />
                    <span className="linha-veiculo__texto">
                      <span className="linha-veiculo__titulo">{descreverVeiculo(v)}</span>
                      <span className="linha-veiculo__sub">{nomeTipo(v.tipo)}{v.ano ? ` de ${v.ano}` : ''}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
