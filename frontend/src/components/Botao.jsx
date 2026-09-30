import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// botões com as variantes do sistema: primario (âmbar, a ação principal do
// ecrã), secundario, fantasma e perigo. Com `luz`, mostra a luz indicadora
// (a ideia que já vinha do login original): apagada, a piscar enquanto
// espera pela API, verde se correu bem, vermelha se falhou
export function Botao({
  variante = 'secundario',
  tamanho = 'normal',
  para,
  luz,
  aTrabalhar = false,
  icone: Icone,
  children,
  className = '',
  ...resto
}) {
  const classes = `botao botao--${variante} botao--${tamanho} ${className}`;
  const conteudo = (
    <>
      {luz && <span className="botao__luz" data-estado={aTrabalhar ? 'a-verificar' : luz} aria-hidden="true" />}
      {Icone && <Icone size={tamanho === 'grande' ? 24 : 20} weight="bold" aria-hidden="true" />}
      {children && <span>{children}</span>}
    </>
  );

  if (para) {
    return <Link to={para} className={classes} {...resto}>{conteudo}</Link>;
  }
  return (
    <button
      {...resto}
      type={resto.type || 'button'}
      className={classes}
      disabled={aTrabalhar || resto.disabled}
      aria-busy={aTrabalhar || undefined}
    >
      {conteudo}
    </button>
  );
}

// quanto tempo uma pergunta de confirmação espera pelo segundo toque, antes de
// voltar ao que era (as confirmações de fora deste ficheiro usam o mesmo tempo)
export const TEMPO_CONFIRMACAO = 4000;

// arquivar, remover...: o primeiro toque pede confirmação no próprio botão,
// o segundo executa. Evita janelas modais para uma pergunta de sim/não
export function BotaoConfirmar({ aoConfirmar, pergunta = 'Confirmar?', children, ...resto }) {
  const [aPerguntar, setAPerguntar] = useState(false);

  useEffect(() => {
    if (!aPerguntar) return undefined;
    const relogio = setTimeout(() => setAPerguntar(false), TEMPO_CONFIRMACAO);
    return () => clearTimeout(relogio);
  }, [aPerguntar]);

  return (
    <Botao
      {...resto}
      variante={aPerguntar ? 'perigo-cheio' : resto.variante || 'perigo'}
      onClick={() => {
        if (aPerguntar) {
          setAPerguntar(false);
          aoConfirmar();
        } else {
          setAPerguntar(true);
        }
      }}
    >
      {aPerguntar ? pergunta : children}
    </Botao>
  );
}
