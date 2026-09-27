import { Botao } from './Botao';

export function Paginacao({ pagina, porPagina, total, aoMudar }) {
  if (!total || total <= porPagina) return null;
  const inicio = (pagina - 1) * porPagina + 1;
  const fim = Math.min(total, pagina * porPagina);
  return (
    <nav className="paginacao" aria-label="Páginas">
      <span className="paginacao__texto num">{inicio}-{fim} de {total}</span>
      <Botao tamanho="compacto" disabled={pagina <= 1} onClick={() => aoMudar(pagina - 1)}>Anteriores</Botao>
      <Botao tamanho="compacto" disabled={fim >= total} onClick={() => aoMudar(pagina + 1)}>Seguintes</Botao>
    </nav>
  );
}
