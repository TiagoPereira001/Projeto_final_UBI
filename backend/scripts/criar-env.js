// cria o ficheiro .env na raiz do projeto, a partir do .env.example, com as
// passwords da base de dados e o JWT_SECRET gerados ao acaso. É o primeiro
// passo para pôr a Bancada a funcionar num computador novo.
//
// uso (na pasta do projeto, em macOS, Windows ou Linux):
//   node backend/scripts/criar-env.js
//
// nunca substitui um .env que já exista: a password do sa fica gravada no
// SQL Server no primeiro arranque, e trocá-la depois partia a ligação

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..', '..');
const destino = path.join(raiz, '.env');

if (fs.existsSync(destino)) {
    console.log('Já existe um .env na pasta do projeto: não mexi nele.');
    process.exit(0);
}

// o SQL Server exige pelo menos 8 caracteres, com maiúsculas, minúsculas,
// algarismos e símbolos. O fim fixo garante as quatro categorias e o resto é
// aleatório. Sem $, ! nem aspas, que o docker compose e os terminais tratam à parte
const password = () => `${crypto.randomBytes(18).toString('base64url')}Aa1_`;

const valores = {
    DB_ADMIN_PASSWORD: password(),
    DB_PASSWORD: password(),
    JWT_SECRET: crypto.randomBytes(48).toString('base64url'),
};

let texto = fs.readFileSync(path.join(raiz, '.env.example'), 'utf8');
for (const [nome, valor] of Object.entries(valores)) {
    // a linha vazia do modelo ("NOME="), também com fins de linha do Windows
    const linha = new RegExp(`^${nome}=(\\r?)$`, 'm');
    if (!linha.test(texto)) {
        console.error(`O .env.example não tem a linha "${nome}=" vazia. Preenche o .env à mão.`);
        process.exit(1);
    }
    texto = texto.replace(linha, `${nome}=${valor}$1`);
}

fs.writeFileSync(destino, texto);
console.log('Criei o .env com passwords e um JWT_SECRET novos, só para este computador.');
