import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useSessao } from '../context/SessaoContext';
import { useAvisos } from '../context/AvisosContext';
import { Botao } from '../components/Botao';
import { Texto } from '../components/Campo';
import { ErroFormulario } from '../components/Situacoes';
import { PainelMarca } from './Entrar';
import '../styles/entrada.css';

// registo público: qualquer oficina cria a sua conta sozinha
export default function Registar() {
  const { colaborador, registar } = useSessao();
  const { mostrar } = useAvisos();
  const navegar = useNavigate();
  const [dados, setDados] = useState({
    oficina: { nome: '', nif: '', telefone: '', morada: '' },
    gestor: { nome: '', email: '', password: '' },
  });
  const [aTrabalhar, setATrabalhar] = useState(false);
  const [erro, setErro] = useState(null);
  const [erros, setErros] = useState({});

  if (colaborador && !aTrabalhar) return <Navigate to="/" replace />;

  const mudar = (grupo, campo) => (ev) =>
    setDados((d) => ({ ...d, [grupo]: { ...d[grupo], [campo]: ev.target.value } }));

  async function submeter(ev) {
    ev.preventDefault();
    setATrabalhar(true);
    setErro(null);
    setErros({});
    try {
      const resposta = await registar(dados);
      mostrar(`Bem-vindo à Bancada, ${resposta.oficina.nome}.`);
      navegar('/equipa', { replace: true });
    } catch (err) {
      setErro(err.message);
      setErros(err.campos || {});
      setATrabalhar(false);
    }
  }

  return (
    <div className="entrada entrada--registo">
      <PainelMarca>
        <p className="entrada__lema">Registar a oficina.</p>
        <ol className="entrada__passos">
          <li><strong>Cria a conta</strong> da oficina e a tua, de gestor.</li>
          <li><strong>Junta a equipa:</strong> cada mecânico recebe um PIN.</li>
          <li><strong>Liga o tablet</strong> da oficina em modo bancada.</li>
        </ol>
      </PainelMarca>

      <section className="entrada__lado">
        <form className="entrada__formulario entrada__formulario--largo formulario" onSubmit={submeter} noValidate>
          <h1 className="entrada__titulo">Registar a oficina</h1>

          <fieldset className="entrada__grupo">
            <legend>A oficina</legend>
            <Texto etiqueta="Nome da oficina" value={dados.oficina.nome} onChange={mudar('oficina', 'nome')}
              erro={erros['oficina.nome']} autoComplete="organization" required />
            <div className="formulario__linha">
              <Texto etiqueta="NIF" value={dados.oficina.nif} onChange={mudar('oficina', 'nif')}
                erro={erros['oficina.nif']} inputMode="numeric" maxLength={11} required />
              <Texto etiqueta="Telefone" opcional value={dados.oficina.telefone} onChange={mudar('oficina', 'telefone')}
                erro={erros['oficina.telefone']} type="tel" autoComplete="tel" />
            </div>
            <Texto etiqueta="Morada" opcional value={dados.oficina.morada} onChange={mudar('oficina', 'morada')}
              erro={erros['oficina.morada']} autoComplete="street-address" />
          </fieldset>

          <fieldset className="entrada__grupo">
            <legend>A tua conta de gestor</legend>
            <Texto etiqueta="O teu nome" value={dados.gestor.nome} onChange={mudar('gestor', 'nome')}
              erro={erros['gestor.nome']} autoComplete="name" required />
            <Texto etiqueta="Email" type="email" value={dados.gestor.email} onChange={mudar('gestor', 'email')}
              erro={erros['gestor.email']} autoComplete="email" inputMode="email" required />
            <Texto etiqueta="Password" type="password" value={dados.gestor.password} onChange={mudar('gestor', 'password')}
              erro={erros['gestor.password']} autoComplete="new-password"
              ajuda="Pelo menos 10 caracteres. Uma frase curta é fácil de lembrar e difícil de adivinhar." required />
          </fieldset>

          <ErroFormulario erro={erro} />

          <Botao type="submit" variante="primario" tamanho="grande" aTrabalhar={aTrabalhar}>
            {aTrabalhar ? 'A criar...' : 'Criar a oficina'}
          </Botao>
          <p className="entrada__alternativa">
            Já tens conta? <Link to="/entrar">Entrar</Link>
          </p>
        </form>
      </section>
    </div>
  );
}
