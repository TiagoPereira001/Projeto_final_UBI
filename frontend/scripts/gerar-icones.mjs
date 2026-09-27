// gera src/components/icones.js com os ícones Phosphor que a Bancada usa,
// e só nos pesos (regular, bold, fill) em que são usados.
//
// porquê: o pacote @phosphor-icons/react traz os 6 pesos de cada ícone. Com
// 33 ícones isso eram ~30 KB (gzip) no pacote principal, mais do dobro do
// código da própria aplicação. Assim ficam só os caminhos SVG necessários.
//
// uso: npm run icones   (depois de acrescentar um ícone à lista abaixo)
// os SVG vêm de @phosphor-icons/core (licença MIT)

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const ICONES = {
  Archive: ['bold'],
  ArrowLeft: ['bold'],
  ArrowRight: ['bold'],
  Backspace: ['regular'],
  Car: ['regular'],
  CarProfile: ['regular', 'fill'],
  CaretRight: ['bold'],
  CheckCircle: ['fill'],
  ClockCounterClockwise: ['regular'],
  DeviceTablet: ['regular', 'bold'],
  Gauge: ['regular'],
  Gear: ['regular'],
  LockKey: ['fill'],
  MagnifyingGlass: ['regular'],
  Moon: ['regular'],
  Motorcycle: ['regular', 'fill'],
  PencilSimple: ['bold'],
  Phone: ['fill'],
  Plus: ['bold'],
  SignOut: ['bold'],
  Sun: ['regular'],
  Tire: ['regular', 'fill'],
  Trash: ['bold'],
  Truck: ['regular', 'fill'],
  TruckTrailer: ['regular', 'fill'],
  Users: ['regular'],
  UsersThree: ['regular'],
  Van: ['regular', 'fill'],
  WarningCircle: ['fill'],
};

const kebab = (nome) => nome.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

function caminhos(nome, peso) {
  const ficheiro = peso === 'regular' ? `${kebab(nome)}.svg` : `${kebab(nome)}-${peso}.svg`;
  const svg = readFileSync(join(raiz, 'node_modules/@phosphor-icons/core/assets', peso, ficheiro), 'utf8');
  const elementos = [...svg.matchAll(/<(path|circle|rect|line|polyline|polygon)\b([^>]*)\/>/g)];
  if (elementos.length === 0 || elementos.some(([, tag]) => tag !== 'path')) {
    throw new Error(`${nome} (${peso}): só sei converter ícones feitos de <path>`);
  }
  return elementos.map(([, , atributos]) => atributos.match(/\sd="([^"]+)"/)[1]);
}

let saida = `// GERADO por scripts/gerar-icones.mjs a partir de @phosphor-icons/core (licença MIT).
// Não editar à mão: acrescenta o ícone à lista do gerador e corre \`npm run icones\`.
// A API é a mesma do @phosphor-icons/react: <Wrench size={24} weight="fill" />
import { createElement } from 'react';

function icone(nome, pesos) {
  function Icone({ size = 24, weight = 'regular', color = 'currentColor', ...resto }) {
    const desenho = pesos[weight] ?? pesos[Object.keys(pesos)[0]];
    return createElement(
      'svg',
      { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 256 256', width: size, height: size, fill: color, ...resto },
      desenho.map((d, i) => createElement('path', { key: i, d }))
    );
  }
  Icone.displayName = nome;
  return Icone;
}
`;

for (const [nome, pesos] of Object.entries(ICONES)) {
  const mapa = Object.fromEntries(pesos.map((peso) => [peso, caminhos(nome, peso)]));
  saida += `\nexport const ${nome} = icone('${nome}', ${JSON.stringify(mapa)});`;
}
writeFileSync(join(raiz, 'src/components/icones.js'), `${saida}\n`);
console.log(`${Object.keys(ICONES).length} ícones gerados em src/components/icones.js`);
