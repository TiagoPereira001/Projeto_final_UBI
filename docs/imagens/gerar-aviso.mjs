// gera o aviso do topo do README (aviso-em-desenvolvimento.svg).
//
// O texto passa a contornos com a letra da Bancada (Barlow e Barlow
// Condensed, do node_modules do frontend), para o aviso ficar igual em
// qualquer computador: o GitHub mostra o SVG como imagem e não carrega letras.
//
// Para mudar o texto, edita as constantes em baixo e corre:
//   cd docs/imagens && npm install --no-save opentype.js && node gerar-aviso.mjs
// (precisa do `npm install` no frontend, por causa das letras)

import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';

const require = createRequire(`${process.cwd()}/`);
const opentype = require('opentype.js');

const TITULO = 'EM DESENVOLVIMENTO';
const SUBTITULO = 'Ainda não está pronto para uso real.';
const DIREITOS = 'TODOS OS DIREITOS RESERVADOS';
const AUTOR = '© 2026 Tiago Dias Pereira';

// cores do painel (frontend/src/styles/tokens.css)
const PAINEL = '#0f1012';
const PAINEL_LINHA = '#2a2d31';
const TINTA = '#e7e9e4';
const TINTA_2 = '#9aa0a6';
const LUZ_EM_CURSO = '#f0a43a';

const letra = (pacote, ficheiro) => {
    const url = new URL(`../../frontend/node_modules/@fontsource/${pacote}/files/${ficheiro}`, import.meta.url);
    const b = readFileSync(url);
    return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
};
const condensada700 = letra('barlow-condensed', 'barlow-condensed-latin-700-normal.woff');
const barlow500 = letra('barlow', 'barlow-latin-500-normal.woff');

const LARGURA = 1000;
const MARGEM = 56;
const X_TEXTO = 232;

// altura das maiúsculas, para alinhar o texto pelo topo das letras
const maiusculas = (fonte, tamanho) => (fonte.tables.os2.sCapHeight / fonte.unitsPerEm) * tamanho;

// o toPathData() do opentype.js 2.0.0 escreve "NaN" nalguns pontos e o
// browser deixa de desenhar o resto da linha; por isso o caminho é escrito aqui
const n = (v) => String(Math.round(v * 10) / 10);
const caminho = (comandos) => comandos.map((c) => {
    if (c.type === 'M' || c.type === 'L') return `${c.type}${n(c.x)} ${n(c.y)}`;
    if (c.type === 'Q') return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
    if (c.type === 'C') return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
    return 'Z';
}).join('');

function linha(fonte, texto, y, tamanho, cor, espacamento = 0) {
    const opcoes = { kerning: true, letterSpacing: espacamento };
    const largura = fonte.getAdvanceWidth(texto, tamanho, opcoes);
    if (X_TEXTO + largura > LARGURA - MARGEM) throw new Error(`"${texto}" não cabe (${Math.round(largura)})`);
    const d = caminho(fonte.getPath(texto, X_TEXTO, y, tamanho, opcoes).commands);
    return `<path fill="${cor}" d="${d}"/>`;
}

// pilha de linhas: cada uma começa no topo das maiúsculas
let y = MARGEM;
const partes = [];
const titulo = 84;
y += maiusculas(condensada700, titulo);
partes.push(linha(condensada700, TITULO, y, titulo, TINTA, 0.01));
const sub = 36;
y += 26 + maiusculas(barlow500, sub);
partes.push(linha(barlow500, SUBTITULO, y, sub, TINTA_2));
y += 34;
const yDivisoria = y;
const direitos = 46;
y += 34 + maiusculas(condensada700, direitos);
partes.push(linha(condensada700, DIREITOS, y, direitos, TINTA, 0.02));
const autor = 34;
y += 22 + maiusculas(barlow500, autor);
partes.push(linha(barlow500, AUTOR, y, autor, TINTA_2));
const ALTURA = Math.round(y + MARGEM);

// a luz "em curso" do tablier (a chave de bocas de Luzes.jsx), acesa
const LUZ = 136;
const escala = LUZ / 32;
const yLuz = (ALTURA - LUZ) / 2;
const chave = `<g fill="${LUZ_EM_CURSO}" transform="translate(${MARGEM + 4} ${yLuz.toFixed(1)}) scale(${escala})">`
    + '<path transform="rotate(-45 16 16)" d="M-0.08 13.7 A6.5 6.5 0 1 1 -0.08 18.3 L6 18.3 L6 13.7 Z '
    + 'M32.08 18.3 A6.5 6.5 0 1 1 32.08 13.7 L26 13.7 L26 18.3 Z M10 13.2 H22 V18.8 H10 Z"/></g>';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGURA * 0.8}" height="${Math.round(ALTURA * 0.8)}" viewBox="0 0 ${LARGURA} ${ALTURA}" role="img" aria-labelledby="titulo descricao">
<title id="titulo">Em desenvolvimento: ainda não está pronto para uso real.</title>
<desc id="descricao">© 2026 Tiago Dias Pereira. Todos os direitos reservados.</desc>
<rect x="1" y="1" width="${LARGURA - 2}" height="${ALTURA - 2}" rx="19" fill="${PAINEL}" stroke="${PAINEL_LINHA}" stroke-width="2"/>
${chave}
<path stroke="${PAINEL_LINHA}" stroke-width="2" d="M${X_TEXTO} ${yDivisoria.toFixed(1)} H${LARGURA - MARGEM}"/>
${partes.join('\n')}
</svg>
`;

writeFileSync(new URL('aviso-em-desenvolvimento.svg', import.meta.url), svg);
console.log(`aviso-em-desenvolvimento.svg: ${LARGURA} × ${ALTURA}, ${svg.length} bytes`);
