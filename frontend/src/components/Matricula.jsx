import { matricula, matriculaPortuguesa } from '../lib/formatar';

// as doze estrelas da faixa europeia, num círculo (grelha de 20x20)
const ESTRELAS = Array.from({ length: 12 }, (_, i) => {
  const angulo = (i * Math.PI) / 6;
  return [(10 + 6.4 * Math.sin(angulo)).toFixed(2), (10 - 6.4 * Math.cos(angulo)).toFixed(2)];
});

// a matrícula desenhada como a chapa: branca, letras pretas e a faixa azul
// europeia à esquerda. É assim que numa oficina se reconhece um carro.
// Todas têm a mesma largura (as listas ficam alinhadas) e o texto ao centro.
// Na chapa grande, as portuguesas levam as estrelas e o P da faixa.
export function Matricula({ valor, tamanho = 'normal' }) {
  const comPais = tamanho === 'grande' && matriculaPortuguesa(valor);
  return (
    <span className={`matricula matricula--${tamanho}`}>
      <span className="matricula__faixa" aria-hidden="true">
        {comPais && (
          <>
            <svg className="matricula__estrelas" viewBox="0 0 20 20" focusable="false">
              {ESTRELAS.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.35" />)}
            </svg>
            <span className="matricula__pais">P</span>
          </>
        )}
      </span>
      <span className="matricula__texto">{matricula(valor)}</span>
    </span>
  );
}
