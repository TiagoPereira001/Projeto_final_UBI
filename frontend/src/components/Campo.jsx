import { useId } from 'react';

// um campo de formulário: etiqueta em cima, controlo, ajuda e erro em baixo.
// Nunca se usa o placeholder como etiqueta (desaparece quando se escreve)
export function Campo({ etiqueta, erro, ajuda, children, className = '', opcional = false }) {
  const id = useId();
  const idAjuda = ajuda ? `${id}-ajuda` : undefined;
  const idErro = erro ? `${id}-erro` : undefined;
  const descricao = [idAjuda, idErro].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`campo ${erro ? 'campo--erro' : ''} ${className}`}>
      <label className="campo__etiqueta" htmlFor={id}>
        {etiqueta}
        {opcional && <span className="campo__opcional"> (opcional)</span>}
      </label>
      {children({ id, 'aria-describedby': descricao, 'aria-invalid': erro ? true : undefined })}
      {ajuda && <p className="campo__ajuda" id={idAjuda}>{ajuda}</p>}
      {erro && <p className="campo__mensagem" id={idErro}>{erro}</p>}
    </div>
  );
}

export function Texto({ etiqueta, erro, ajuda, opcional, className, ...props }) {
  return (
    <Campo etiqueta={etiqueta} erro={erro} ajuda={ajuda} opcional={opcional} className={className}>
      {(a11y) => <input className="controlo" {...a11y} {...props} />}
    </Campo>
  );
}

export function AreaTexto({ etiqueta, erro, ajuda, opcional, className, ...props }) {
  return (
    <Campo etiqueta={etiqueta} erro={erro} ajuda={ajuda} opcional={opcional} className={className}>
      {(a11y) => <textarea className="controlo controlo--area" rows={3} {...a11y} {...props} />}
    </Campo>
  );
}

export function Seletor({ etiqueta, erro, ajuda, opcional, className, opcoes, ...props }) {
  return (
    <Campo etiqueta={etiqueta} erro={erro} ajuda={ajuda} opcional={opcional} className={className}>
      {(a11y) => (
        <select className="controlo controlo--seletor" {...a11y} {...props}>
          {opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.nome}</option>)}
        </select>
      )}
    </Campo>
  );
}

// escolha entre poucas opções, todas visíveis (tipo de veículo, categoria da
// linha, estado): um toque em vez de abrir uma lista
export function Segmentos({ etiqueta, opcoes, valor, aoMudar, erro, nome, className = '' }) {
  const id = useId();
  return (
    <fieldset className={`segmentos ${erro ? 'campo--erro' : ''} ${className}`} aria-describedby={erro ? `${id}-erro` : undefined}>
      <legend className="campo__etiqueta">{etiqueta}</legend>
      <div className="segmentos__opcoes">
        {opcoes.map((opcao) => (
          <label key={opcao.valor} className="segmentos__opcao" data-escolhida={valor === opcao.valor}>
            <input
              type="radio"
              name={nome || id}
              value={opcao.valor}
              checked={valor === opcao.valor}
              onChange={() => aoMudar(opcao.valor)}
            />
            {opcao.icone && <opcao.icone size={20} weight={valor === opcao.valor ? 'fill' : 'regular'} aria-hidden="true" />}
            <span>{opcao.nome}</span>
          </label>
        ))}
      </div>
      {erro && <p className="campo__mensagem" id={`${id}-erro`}>{erro}</p>}
    </fieldset>
  );
}
