import { WarningCircle } from './icones';
import { Botao } from './Botao';

// os estados que não são "tudo correu bem": a carregar, vazio e erro.
// Cada lista da app usa estes três, para nunca ficar um ecrã em branco

export function Esqueleto({ linhas = 4, altura = 72 }) {
  return (
    <div className="esqueleto" aria-busy="true" aria-label="A carregar">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="esqueleto__linha" style={{ height: altura, animationDelay: `${i * 90}ms` }} />
      ))}
    </div>
  );
}

// `pagina`: o vazio é a página toda (endereço que não existe, folha que não
// existe) e não há outro título: o título passa a ser o h1, para a página não
// ficar sem nenhum
export function Vazio({ titulo, children, acao, pagina = false }) {
  const Titulo = pagina ? 'h1' : 'p';
  return (
    <div className="vazio">
      <Titulo className="vazio__titulo">{titulo}</Titulo>
      {children && <p className="vazio__texto">{children}</p>}
      {acao}
    </div>
  );
}

// os números que se veem já não são de agora: o último pedido falhou (o Wi-Fi
// da oficina). Diz de quando são, em vez de os continuar a afirmar. Quem o usa
// esbate também o que mostra (ver `antigo` no Tablier)
export function SemLigacao({ desde, className }) {
  const minutos = Math.floor((Date.now() - desde) / 60000);
  let quanto = `${minutos} min`;
  if (minutos < 1) quanto = 'menos de 1 min';
  else if (minutos >= 60) quanto = `${Math.floor(minutos / 60)} h`;
  return (
    <p className={className} role="status">
      Sem ligação ao servidor. Estes números são de há {quanto}.
    </p>
  );
}

export function ErroCarregar({ erro, aoTentar }) {
  return (
    <div className="erro-carregar" role="alert">
      <WarningCircle size={28} weight="fill" aria-hidden="true" />
      <div>
        <p className="erro-carregar__titulo">Não foi possível carregar.</p>
        <p className="erro-carregar__texto">{erro?.message}</p>
      </div>
      {aoTentar && <Botao onClick={aoTentar}>Tentar outra vez</Botao>}
    </div>
  );
}

// mensagem de erro geral de um formulário (os erros por campo aparecem no campo)
export function ErroFormulario({ erro }) {
  if (!erro) return null;
  return (
    <p className="erro-formulario" role="alert">
      <WarningCircle size={20} weight="fill" aria-hidden="true" />
      {erro}
    </p>
  );
}
