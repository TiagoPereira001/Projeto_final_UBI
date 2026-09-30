import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { DeviceTablet } from '../components/icones';
import { useSessao } from '../context/SessaoContext';
import { useTitulo } from '../lib/useTitulo';
import { Marca } from '../components/Marca';
import { Botao } from '../components/Botao';
import { Texto } from '../components/Campo';
import { ErroFormulario } from '../components/Situacoes';
import { ESTADOS_ATIVOS } from '../lib/formatar';
import { SimboloEstado } from '../components/Luzes';
import '../styles/entrada.css';

// a faixa de cima é o painel do carro antes de arrancar: a marca à esquerda
// e as quatro luzes do tablier à direita, que fazem o "autoteste" de quando
// se roda a chave (acendem todas e apagam). Fica a âmbar acesa.
export function PainelMarca() {
  return (
    <section className="entrada__painel" aria-label="Bancada">
      <div className="entrada__coluna entrada__coluna--painel">
        <div className="entrada__marca">
          <Marca tamanho={44} />
          <p className="entrada__descricao">Folhas de obra digitais para oficinas.</p>
        </div>
        <div className="entrada__luzes" aria-hidden="true">
          {ESTADOS_ATIVOS.map((estado, i) => (
            <SimboloEstado
              key={estado.codigo}
              estado={estado.codigo}
              tamanho={40}
              className={`entrada__luz tablier__luz--${estado.codigo}`}
              estilo={{ '--ordem': i }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Entrar() {
  useTitulo('Entrar');
  const { colaborador, bancada, oficina, entrar } = useSessao();
  const navegar = useNavigate();
  const local = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [luz, setLuz] = useState('parado'); // parado | a-verificar | sucesso | erro
  const [erro, setErro] = useState(null);
  const [erros, setErros] = useState({});

  if (colaborador && luz !== 'sucesso') return <Navigate to="/" replace />;

  async function submeter(ev) {
    ev.preventDefault();
    setErro(null);
    setErros({});
    setLuz('a-verificar');
    try {
      await entrar(email, password);
      setLuz('sucesso');
      // um instante para se ver a luz verde antes de mudar de ecrã
      setTimeout(() => navegar(local.state?.de || '/', { replace: true }), 300);
    } catch (err) {
      setLuz('erro');
      setErro(err.message);
      setErros(err.campos || {});
    }
  }

  return (
    <div className="entrada">
      <PainelMarca />

      <section className="entrada__lado">
        <form className="entrada__coluna entrada__formulario formulario" onSubmit={submeter} noValidate>
          <h1 className="entrada__titulo">Entrar</h1>

          {bancada && (
            <Link to="/bancada" className="entrada__bancada">
              <DeviceTablet size={24} aria-hidden="true" />
              <span>
                Este tablet é a bancada da <strong>{bancada.oficina.nome}</strong>.
                <span className="entrada__bancada-acao"> Entrar com PIN</span>
              </span>
            </Link>
          )}

          <Texto
            etiqueta="Email"
            type="email"
            autoComplete="username"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            erro={erros.email}
            required
          />
          <Texto
            etiqueta="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            erro={erros.password}
            required
          />

          <ErroFormulario erro={erro && !Object.keys(erros).length ? erro : null} />

          <Botao type="submit" variante="primario" tamanho="grande" luz={luz} aTrabalhar={luz === 'a-verificar'}>
            {luz === 'a-verificar' ? 'A verificar...' : 'Entrar'}
          </Botao>

          <p className="entrada__alternativa">
            A tua oficina ainda não usa a Bancada? <Link to="/registar">Registar a oficina</Link>
          </p>
          {oficina && <span className="so-leitores">{oficina.nome}</span>}
        </form>
      </section>
    </div>
  );
}
