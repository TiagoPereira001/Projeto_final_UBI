import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DeviceTablet } from '../components/icones';
import { api } from '../lib/api';
import { useRecurso } from '../lib/useRecurso';
import { useTitulo } from '../lib/useTitulo';
import { useSessao } from '../context/SessaoContext';
import { useAvisos } from '../context/AvisosContext';
import { Botao, BotaoConfirmar } from '../components/Botao';
import { Texto } from '../components/Campo';
import { ErroCarregar, ErroFormulario, Esqueleto } from '../components/Situacoes';
import '../styles/gestao.css';

export default function Definicoes() {
  const oficina = useRecurso('/oficinas/atual');
  useTitulo('Definições');
  if (oficina.aCarregar) return <Esqueleto linhas={3} altura={80} />;
  if (oficina.erro && !oficina.dados) return <ErroCarregar erro={oficina.erro} aoTentar={oficina.recarregar} />;

  return (
    <div className="gestao">
      <header className="cabecalho">
        <h1 className="cabecalho__titulo">Definições</h1>
      </header>
      <div className="gestao__duas">
        <DadosOficina inicial={oficina.dados} />
        <TabletOficina />
      </div>
    </div>
  );
}

function DadosOficina({ inicial }) {
  const { atualizar } = useSessao();
  const { mostrar } = useAvisos();
  const [dados, setDados] = useState({
    nome: inicial.nome,
    nif: inicial.nif,
    telefone: inicial.telefone ?? '',
    email: inicial.email ?? '',
    morada: inicial.morada ?? '',
    taxaIva: String(inicial.taxaIva).replace('.', ','),
  });
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState(null);
  const [erros, setErros] = useState({});
  const mudar = (campo) => (ev) => setDados((d) => ({ ...d, [campo]: ev.target.value }));

  async function submeter(ev) {
    ev.preventDefault();
    setAGuardar(true);
    setErro(null);
    setErros({});
    try {
      await api.put('/oficinas/atual', dados);
      await atualizar();
      mostrar('Dados da oficina guardados.');
    } catch (err) {
      setErro(err.message);
      setErros(err.campos || {});
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <form className="painel painel__corpo formulario" onSubmit={submeter} noValidate>
      <h2 className="painel__titulo">A oficina</h2>
      <Texto etiqueta="Nome" value={dados.nome} onChange={mudar('nome')} erro={erros.nome} />
      <div className="formulario__linha">
        <Texto etiqueta="NIF" value={dados.nif} onChange={mudar('nif')} erro={erros.nif} inputMode="numeric" />
        <Texto etiqueta="Telefone" opcional type="tel" value={dados.telefone} onChange={mudar('telefone')} erro={erros.telefone} />
      </div>
      <Texto etiqueta="Email" opcional type="email" value={dados.email} onChange={mudar('email')} erro={erros.email} />
      <Texto etiqueta="Morada" opcional value={dados.morada} onChange={mudar('morada')} erro={erros.morada} />
      <Texto
        etiqueta="Taxa de IVA (%)"
        value={dados.taxaIva}
        onChange={mudar('taxaIva')}
        erro={erros.taxaIva}
        inputMode="decimal"
        className="definicoes__iva"
        ajuda="Continente 23, Madeira 22, Açores 16. Só se aplica às folhas abertas daqui para a frente."
      />
      <ErroFormulario erro={erro && !Object.keys(erros).length ? erro : null} />
      <Botao type="submit" variante="primario" aTrabalhar={aGuardar} className="formulario__inicio">Guardar</Botao>
    </form>
  );
}

// o tablet partilhado: ligar este dispositivo como bancada, ou desligar todos
function TabletOficina() {
  const { bancada, ativarBancada, desligarBancada } = useSessao();
  const { mostrar } = useAvisos();
  const navegar = useNavigate();
  const [aTrabalhar, setATrabalhar] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => setErro(null), [bancada]);

  async function ligar() {
    setATrabalhar(true);
    setErro(null);
    try {
      await ativarBancada();
      navegar('/bancada', { replace: true });
    } catch (err) {
      setErro(err.message);
      setATrabalhar(false);
    }
  }

  async function desligarEste() {
    try {
      await desligarBancada();
      mostrar('Este dispositivo deixou de ser a bancada.');
    } catch (err) {
      setErro(err.message);
    }
  }

  async function desligarTodos() {
    try {
      await api.post('/oficinas/atual/desligar-tablets');
      mostrar('Todos os tablets foram desligados.');
    } catch (err) {
      setErro(err.message);
    }
  }

  return (
    <section className="painel painel__corpo tablet-oficina" aria-labelledby="titulo-tablet">
      <h2 className="painel__titulo" id="titulo-tablet">Tablet da oficina</h2>
      <p>
        No modo bancada, o tablet fica na oficina e cada mecânico entra com o seu nome e PIN.
        Tudo o que regista fica em nome dele. Se ninguém mexer durante 5 minutos, a sessão termina sozinha.
      </p>
      <ErroFormulario erro={erro} />
      {bancada ? (
        <>
          <p className="tablet-oficina__estado">Este dispositivo é a bancada da oficina.</p>
          <BotaoConfirmar variante="secundario" pergunta="Desligar mesmo?" aoConfirmar={desligarEste}>
            Desligar neste dispositivo
          </BotaoConfirmar>
        </>
      ) : (
        <Botao variante="secundario" icone={DeviceTablet} onClick={ligar} aTrabalhar={aTrabalhar}>
          Usar este dispositivo como bancada
        </Botao>
      )}
      <div className="gestao__perigo">
        <BotaoConfirmar pergunta="Desligar todos?" aoConfirmar={desligarTodos}>Desligar todos os tablets</BotaoConfirmar>
        <p>Para um tablet perdido ou roubado: deixa de funcionar até um gestor o voltar a ligar.</p>
      </div>
    </section>
  );
}
