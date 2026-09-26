import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle, WarningCircle } from '../components/icones';

// avisos curtos que aparecem e desaparecem ("Linha adicionada").
// Só para confirmações passageiras: erros de formulário aparecem junto ao campo
const AvisosContext = createContext(null);

export function AvisosProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const proximoId = useRef(1);

  const mostrar = useCallback((texto, { tipo = 'sucesso', duracao = 3200 } = {}) => {
    const id = proximoId.current++;
    setAvisos((lista) => [...lista.slice(-2), { id, texto, tipo }]);
    setTimeout(() => setAvisos((lista) => lista.filter((a) => a.id !== id)), duracao);
  }, []);

  const valor = useMemo(() => ({ mostrar }), [mostrar]);

  return (
    <AvisosContext.Provider value={valor}>
      {children}
      <div className="avisos" role="status" aria-live="polite">
        {avisos.map((aviso) => (
          <div key={aviso.id} className={`aviso aviso--${aviso.tipo}`}>
            {aviso.tipo === 'erro'
              ? <WarningCircle size={22} weight="fill" aria-hidden="true" />
              : <CheckCircle size={22} weight="fill" aria-hidden="true" />}
            <span>{aviso.texto}</span>
          </div>
        ))}
      </div>
    </AvisosContext.Provider>
  );
}

export function useAvisos() {
  const contexto = useContext(AvisosContext);
  if (!contexto) throw new Error('useAvisos tem de ser usado dentro do AvisosProvider');
  return contexto;
}
