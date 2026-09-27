import { useEffect, useState } from 'react';
import { Backspace, ArrowRight } from './icones';

const DIGITOS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

// teclado numérico grande para o PIN: teclas de 72 px para dedos com luvas.
// Também funciona com o teclado físico (números, apagar e Enter)
export function TecladoPin({ aoSubmeter, aTrabalhar = false, erro, maximo = 6 }) {
  const [pin, setPin] = useState('');

  const juntar = (d) => setPin((p) => (p.length < maximo ? p + d : p));
  const apagar = () => setPin((p) => p.slice(0, -1));
  const submeter = () => {
    if (pin.length >= 4 && !aTrabalhar) aoSubmeter(pin, () => setPin(''));
  };

  useEffect(() => {
    const aoPremir = (ev) => {
      if (/^\d$/.test(ev.key)) juntar(ev.key);
      else if (ev.key === 'Backspace') apagar();
      else if (ev.key === 'Enter') submeter();
    };
    window.addEventListener('keydown', aoPremir);
    return () => window.removeEventListener('keydown', aoPremir);
  });

  return (
    <div className="teclado-pin">
      <div className={`teclado-pin__visor ${erro ? 'teclado-pin__visor--erro' : ''}`} aria-live="polite">
        <span className="so-leitores">{pin.length} algarismos escritos</span>
        {Array.from({ length: Math.max(4, pin.length) }, (_, i) => (
          <span key={i} className="teclado-pin__ponto" data-cheio={i < pin.length} aria-hidden="true" />
        ))}
      </div>
      {erro && <p className="teclado-pin__erro" role="alert">{erro}</p>}

      <div className="teclado-pin__teclas">
        {DIGITOS.map((d) => (
          <button key={d} type="button" className="teclado-pin__tecla num" onClick={() => juntar(d)}>{d}</button>
        ))}
        <button type="button" className="teclado-pin__tecla teclado-pin__tecla--acao" onClick={apagar} aria-label="Apagar">
          <Backspace size={28} aria-hidden="true" />
        </button>
        <button type="button" className="teclado-pin__tecla num" onClick={() => juntar('0')}>0</button>
        <button
          type="button"
          className="teclado-pin__tecla teclado-pin__tecla--entrar"
          onClick={submeter}
          disabled={pin.length < 4 || aTrabalhar}
          aria-label="Entrar"
        >
          <ArrowRight size={30} weight="bold" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
