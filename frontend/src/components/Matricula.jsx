import { matricula } from '../lib/formatar';

// a matrícula desenhada como a chapa: branca, letras pretas e a faixa azul
// europeia à esquerda. É assim que numa oficina se reconhece um carro
export function Matricula({ valor, tamanho = 'normal' }) {
  return (
    <span className={`matricula matricula--${tamanho}`}>
      <span className="matricula__faixa" aria-hidden="true" />
      <span className="matricula__texto">{matricula(valor)}</span>
    </span>
  );
}
