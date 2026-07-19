import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RotaProtegida({ children, cargosPermitidos }) {
    const { colaborador, aCarregar } = useAuth();

    if (aCarregar) {
        return null;
    }

    if (!colaborador) {
        return <Navigate to="/login" replace />;
    }

    if (cargosPermitidos && !cargosPermitidos.includes(colaborador.cargo)) {
        return <Navigate to="/login" replace />;
    }

    return children;
}