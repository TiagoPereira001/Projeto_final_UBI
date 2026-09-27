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

export function Vazio({ titulo, children, acao }) {
  return (
    <div className="vazio">
      <p className="vazio__titulo">{titulo}</p>
      {children && <p className="vazio__texto">{children}</p>}
      {acao}
    </div>
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
