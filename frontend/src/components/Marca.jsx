// a marca da Bancada: uma luz de aviso acesa, pousada numa bancada.
// Desenhada com geometria simples (círculo e retângulos), sem imagens
export function Marca({ tamanho = 30, comNome = true, className = '' }) {
  return (
    <span className={`marca ${className}`}>
      <svg viewBox="0 0 32 32" width={tamanho} height={tamanho} aria-hidden="true" focusable="false">
        <rect width="32" height="32" rx="8" fill="#15171a" />
        <circle cx="16" cy="13.5" r="7.5" fill="#2a2d31" />
        <circle cx="16" cy="13.5" r="5.5" fill="#f0a43a" />
        <path d="M12.6 11.4a4 4 0 0 1 3.4-1.9" stroke="#ffe2b0" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        <rect x="6" y="24" width="20" height="3" rx="1.5" fill="#9aa0a6" />
      </svg>
      {comNome && <span className="marca__nome">Bancada</span>}
    </span>
  );
}
