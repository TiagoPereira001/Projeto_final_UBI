// os símbolos dos estados (as luzes do tablier e do seletor de estado da
// folha), desenhados de propósito para a Bancada. São pictogramas cheios, como as luzes de aviso de um carro (e não ícones de
// aplicação): legíveis de longe, num tablet na parede da oficina.
// Geometria simples numa grelha de 32x32. As formas cheias vão no sentido dos
// ponteiros do relógio e os furos no sentido contrário (regra "nonzero").
// Os cinco têm um peso visual parecido (entre 22% e 30% da grelha coberta),
// para nenhuma luz parecer mais fraca do que as outras.

const SIMBOLOS = {
  // aberta: a frente de um carro (entrou e espera vez)
  aberta: (
    <path transform="translate(-1.9 -2.2) scale(1.12)" d="M9.2 15 L11.4 9.1 Q11.9 7.8 13.3 7.8 L18.7 7.8 Q20.1 7.8 20.6 9.1 L22.8 15 Z
      M7.5 14 H24.5 Q27 14 27 16.5 V21 Q27 23.5 24.5 23.5 H7.5 Q5 23.5 5 21 V16.5 Q5 14 7.5 14 Z
      M7 23 H11 V26.2 Q11 27 10.2 27 H7.8 Q7 27 7 26.2 Z
      M21 23 H25 V26.2 Q25 27 24.2 27 H21.8 Q21 27 21 26.2 Z
      M13.6 10 L12.3 13.4 L19.7 13.4 L18.4 10 Z
      M11.4 18.6 A2.1 2.1 0 1 0 7.2 18.6 A2.1 2.1 0 1 0 11.4 18.6 Z
      M24.8 18.6 A2.1 2.1 0 1 0 20.6 18.6 A2.1 2.1 0 1 0 24.8 18.6 Z
      M13.5 18 L13.5 20.2 L18.5 20.2 L18.5 18 Z" />
  ),
  // em curso: a chave de bocas (o símbolo de "assistência" dos carros)
  em_curso: (
    <g transform="rotate(-45 16 16)">
      <path d="M-0.08 13.7 A6.5 6.5 0 1 1 -0.08 18.3 L6 18.3 L6 13.7 Z
        M32.08 18.3 A6.5 6.5 0 1 1 32.08 13.7 L26 13.7 L26 18.3 Z
        M10 13.2 H22 V18.8 H10 Z" />
    </g>
  ),
  // aguarda peças: um pistão (a peça que falta). Não é uma roda dentada,
  // que toda a gente lê como "definições"
  aguarda_pecas: (
    <path d="M7 6.2 Q7 3.4 9.8 3.4 H22.2 Q25 3.4 25 6.2 V17.2 H7 Z
      M7 6.6 V7.9 H25 V6.6 Z
      M7 9.4 V10.7 H25 V9.4 Z
      M17.8 13.9 A1.8 1.8 0 1 0 14.2 13.9 A1.8 1.8 0 1 0 17.8 13.9 Z
      M13.2 16.6 H18.8 L17.9 22.4 H14.1 Z
      M20.6 25.4 A4.6 4.6 0 1 1 11.4 25.4 A4.6 4.6 0 1 1 20.6 25.4 Z
      M18 25.4 A2 2 0 1 0 14 25.4 A2 2 0 1 0 18 25.4 Z" />
  ),
  // pronta: a bandeira de xadrez, com moldura (chegou ao fim)
  concluida: (
    <path d="M5.2 4.2 Q5.2 2.6 6.85 2.6 Q8.5 2.6 8.5 4.2 V29.6 H5.2 Z
      M8.5 3.4 H29 V19.6 H8.5 Z
      M14.47 5.1 V9.37 H18.75 V5.1 Z
      M23.02 5.1 V9.37 H27.3 V5.1 Z
      M10.2 9.37 V13.63 H14.47 V9.37 Z
      M18.75 9.37 V13.63 H23.02 V9.37 Z
      M14.47 13.63 V17.9 H18.75 V13.63 Z
      M23.02 13.63 V17.9 H27.3 V13.63 Z" />
  ),
  // entregue: a chave (o carro voltou para o dono)
  entregue: (
    <path d="M17.3 16 A7.3 7.3 0 1 1 2.7 16 A7.3 7.3 0 1 1 17.3 16 Z
      M12.9 16 A2.9 2.9 0 1 0 7.1 16 A2.9 2.9 0 1 0 12.9 16 Z
      M15.5 13.6 H29.2 V18.4 H15.5 Z
      M20.4 18.4 H23.6 V23 H20.4 Z
      M25.6 18.4 H28.8 V21.8 H25.6 Z" />
  ),
};

export function SimboloEstado({ estado, tamanho = 32, className = '', estilo }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={tamanho}
      height={tamanho}
      fill="currentColor"
      className={className}
      style={estilo}
      aria-hidden="true"
      focusable="false"
    >
      {SIMBOLOS[estado]}
    </svg>
  );
}
