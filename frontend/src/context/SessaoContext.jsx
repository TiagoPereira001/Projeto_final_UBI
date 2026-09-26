import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { limparMemoriaRecursos } from '../lib/useRecurso';

// quem está a trabalhar e se este dispositivo é a bancada (tablet partilhado).
// A sessão em si está num cookie httpOnly; aqui guarda-se só o que a
// interface precisa de mostrar (nome, cargo, oficina), vindo da API.
const SessaoContext = createContext(null);

const VAZIA = { colaborador: null, oficina: null, bancada: null };

export function SessaoProvider({ children }) {
  const [sessao, setSessao] = useState(VAZIA);
  const [aCarregar, setACarregar] = useState(true);
  // quando se "rodou a chave": a app abriu ou alguém acabou de entrar.
  // O tablier só faz o autoteste das luzes logo a seguir a este momento
  const [ligadoEm, setLigadoEm] = useState(() => Date.now());

  const atualizar = useCallback(async () => {
    try {
      setSessao(await api.get('/auth/sessao'));
    } catch {
      setSessao(VAZIA);
    } finally {
      setACarregar(false);
    }
  }, []);

  useEffect(() => {
    atualizar();
  }, [atualizar]);

  // se qualquer pedido der 401 (sessão expirada ou conta desativada),
  // esquece o colaborador; as rotas protegidas mandam para a entrada
  useEffect(() => {
    const terminou = () => {
      limparMemoriaRecursos();
      setSessao((s) => ({ ...s, colaborador: null, oficina: null }));
    };
    window.addEventListener('bancada:sessao-terminada', terminou);
    return () => window.removeEventListener('bancada:sessao-terminada', terminou);
  }, []);

  const valor = useMemo(() => ({
    ...sessao,
    aCarregar,
    atualizar,
    ligadoEm,

    async entrar(email, password) {
      const resposta = await api.post('/auth/entrar', { email, password });
      limparMemoriaRecursos();
      setSessao((s) => ({ ...s, ...resposta }));
      setLigadoEm(Date.now());
      return resposta;
    },

    async entrarComPin(colaboradorId, pin) {
      const resposta = await api.post('/auth/bancada/entrar', { colaboradorId, pin });
      limparMemoriaRecursos();
      setSessao((s) => ({ ...s, ...resposta }));
      setLigadoEm(Date.now());
      return resposta;
    },

    async registar(dados) {
      const resposta = await api.post('/oficinas', dados);
      limparMemoriaRecursos();
      setSessao((s) => ({ ...s, ...resposta }));
      setLigadoEm(Date.now());
      return resposta;
    },

    async sair() {
      await api.post('/auth/sair').catch(() => {});
      limparMemoriaRecursos();
      setSessao((s) => ({ ...s, colaborador: null, oficina: null }));
    },

    // o gestor transforma este dispositivo no tablet da oficina
    async ativarBancada() {
      await api.post('/auth/bancada');
      await atualizar();
    },

    async desligarBancada() {
      await api.apagar('/auth/bancada');
      await atualizar();
    },
  }), [sessao, aCarregar, atualizar, ligadoEm]);

  return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>;
}

export function useSessao() {
  const contexto = useContext(SessaoContext);
  if (!contexto) throw new Error('useSessao tem de ser usado dentro do SessaoProvider');
  return contexto;
}
