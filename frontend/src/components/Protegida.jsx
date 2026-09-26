import { Navigate, useLocation } from 'react-router-dom';
import { useSessao } from '../context/SessaoContext';
import { Marca } from './Marca';

// ecrã enquanto se confirma a sessão ao abrir a app (é muito rápido)
export function Arranque() {
  return (
    <div className="arranque" aria-busy="true" aria-label="A abrir a Bancada">
      <Marca tamanho={44} comNome={false} />
    </div>
  );
}

// só deixa passar quem tem sessão (e o cargo certo, quando se pede).
// Sem sessão: vai para o ecrã da bancada (se o dispositivo for o tablet da
// oficina) ou para a entrada normal. A verificação a sério é sempre na API;
// isto só evita mostrar ecrãs que iam dar erro
export function Protegida({ cargos, exigePassword = false, children }) {
  const { colaborador, bancada, aCarregar } = useSessao();
  const local = useLocation();

  if (aCarregar) return <Arranque />;
  if (!colaborador) {
    return <Navigate to={bancada ? '/bancada' : '/entrar'} replace state={{ de: local.pathname }} />;
  }
  if (cargos && !cargos.includes(colaborador.cargo)) return <Navigate to="/" replace />;
  if (exigePassword && colaborador.via !== 'password') return <Navigate to="/" replace />;
  return children;
}
