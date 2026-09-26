import { nomeEstado } from '../lib/formatar';

// a luz de estado nas listas: sempre acompanhada do nome (a cor nunca é
// a única pista, por causa de quem não distingue cores)
export function EstadoFolha({ estado, className = '' }) {
  return (
    <span className={`estado estado--${estado} ${className}`}>
      <span className="estado__luz" aria-hidden="true" />
      {nomeEstado(estado)}
    </span>
  );
}
