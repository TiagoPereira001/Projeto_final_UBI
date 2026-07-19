import { createContext, useContext, useState, useEffect } from 'react';
import { login as loginRequest } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [colaborador, setColaborador] = useState(null);
    const [token, setToken] = useState(null);
    const [aCarregar, setACarregar] = useState(true);

    useEffect(() => {
        const tokenGuardado = localStorage.getItem('dr_token');
        const colaboradorGuardado = localStorage.getItem('dr_colaborador');

        if (tokenGuardado && colaboradorGuardado) {
            setToken(tokenGuardado);
            setColaborador(JSON.parse(colaboradorGuardado));
        }
        setACarregar(false);
    }, []);

    async function entrar(email, password) {
        const resposta = await loginRequest(email, password);
        setToken(resposta.token);
        setColaborador(resposta.colaborador);
        localStorage.setItem('dr_token', resposta.token);
        localStorage.setItem('dr_colaborador', JSON.stringify(resposta.colaborador));
        return resposta.colaborador;
    }

    function sair() {
        setToken(null);
        setColaborador(null);
        localStorage.removeItem('dr_token');
        localStorage.removeItem('dr_colaborador');
    }

    return (
        <AuthContext.Provider value={{ colaborador, token, aCarregar, entrar, sair }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const contexto = useContext(AuthContext);
    if (!contexto) {
        throw new Error('useAuth tem de ser usado dentro de um AuthProvider');
    }
    return contexto;
}