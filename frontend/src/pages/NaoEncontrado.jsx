import { useTitulo } from '../lib/useTitulo';
import { Botao } from '../components/Botao';
import { Vazio } from '../components/Situacoes';

export default function NaoEncontrado() {
  useTitulo('Página não encontrada');
  return (
    <Vazio pagina titulo="Esta página não existe." acao={<Botao variante="primario" para="/">Ir para o quadro</Botao>}>
      Pode ser um endereço antigo ou escrito à mão com um engano.
    </Vazio>
  );
}
