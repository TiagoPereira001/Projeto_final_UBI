import { Garage, Wrench, Package, CheckCircle, Key } from './icones';
import { nomeEstado } from '../lib/formatar';

// o símbolo de cada estado, como as luzes do tablier de um carro
export const ICONE_ESTADO = {
  aberta: Garage,
  em_curso: Wrench,
  aguarda_pecas: Package,
  concluida: CheckCircle,
  entregue: Key,
};

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
