// o aviso antes de o tablet partilhado terminar a sessão sozinho. Aparece nos
// últimos segundos e não tira o foco de onde a pessoa estava: tocar em
// qualquer sítio, carregar numa tecla ou tocar em Continuar chega para
// continuar. O leitor de ecrã lê uma frase só; os segundos que descem são
// só para os olhos (senão liam-se todos)
export function AvisoBloqueio({ segundos, total, aoContinuar }) {
  return (
    <div className="aviso-bloqueio" role="alert">
      <p className="aviso-bloqueio__texto">
        <strong>Ainda estás aí?</strong>
        <span aria-hidden="true">
          A sessão termina em <span className="aviso-bloqueio__visor num">{segundos}</span> s
        </span>
        <span className="so-leitores">
          A sessão termina dentro de {total} segundos. Toca em Continuar, ou carrega numa tecla.
        </span>
      </p>
      <button type="button" className="aviso-bloqueio__continuar" onClick={aoContinuar}>
        Continuar
      </button>
    </div>
  );
}
