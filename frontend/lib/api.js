const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function request(path, { method = 'GET', body, token } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        const mensagem = (data && data.error) || `Erro ${res.status} ao contactar o servidor.`;
        throw new Error(mensagem);
    }

    return data;
}

export function login(email, password) {
    return request('/auth/login', { method: 'POST', body: { email, password } });
}

export function getMe(token) {
    return request('/auth/me', { token });
}

export default request;