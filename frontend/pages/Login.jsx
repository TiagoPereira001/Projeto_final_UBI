import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [estado, setEstado] = useState('parado'); // parado | a-verificar | sucesso | erro
    const [erro, setErro] = useState('');
    const { entrar } = useAuth();
    const navigate = useNavigate();

    async function submeter(ev) {
        ev.preventDefault();
        setErro('');
        setEstado('a-verificar');

        try {
            const colaborador = await entrar(email, password);
            setEstado('sucesso');
            const destino = colaborador.cargo === 'Mecanico' ? '/oficina' : '/dashboard';
            setTimeout(() => navigate(destino), 350);
        } catch (err) {
            setEstado('erro');
            setErro(err.message);
        }
    }

    const aVerificar = estado === 'a-verificar';

    return (
        <div className="login-page">
            <div className="login-brand">
                <div className="brand-mark" aria-hidden="true" />
                <h1>DUARTE &amp; RAPOSO</h1>
                <p className="tagline">MECÂNICA · ELETRICIDADE · AUTOCARAVANAS</p>
                <div className="brand-stripe" aria-hidden="true" />
            </div>

            <div className="login-form-panel">
                <form className="login-form" onSubmit={submeter}>
                    <h2>Entrar</h2>

                    <div className="campo">
                        <label htmlFor="email">Email</label>
                        <input id="email" type="email" autoComplete="username"
                            value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>

                    <div className="campo">
                        <label htmlFor="password">Password</label>
                        <input id="password" type="password" autoComplete="current-password"
                            value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>

                    <button type="submit" className="botao-entrar" disabled={aVerificar}>
                        <span className="luz-indicadora" data-estado={estado} aria-hidden="true" />
                        {aVerificar ? 'A verificar...' : 'Entrar'}
                    </button>

                    {erro && <p className="mensagem-erro" role="alert">{erro}</p>}
                </form>
            </div>
        </div>
    );
}