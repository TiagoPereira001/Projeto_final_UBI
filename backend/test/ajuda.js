// utilitários partilhados pelos testes.
//
// os testes correm contra um SQL Server a sério (o do docker compose, ou o do
// CI), numa base de dados própria (Bancada_Teste) que é apagada e criada de
// novo no início de cada ficheiro de testes. Nunca tocam na base de dados
// de desenvolvimento.

const path = require('node:path');
const { execFileSync } = require('node:child_process');

process.env.DB_NAME = process.env.DB_NAME_TESTES || 'Bancada_Teste';
process.env.NODE_ENV = 'test';
if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = require('node:crypto').randomBytes(48).toString('base64url');
}

let preparada = false;
function prepararBaseDados() {
    if (preparada) return;
    execFileSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'db-setup.js'), '--reset'], {
        env: process.env,
        stdio: 'ignore',
    });
    preparada = true;
}

// arranca a app numa porta livre. `limites` permite baixar o rate limiting
// para o testar sem ter de fazer centenas de pedidos
async function arrancar({ limites } = {}) {
    prepararBaseDados();
    const { criarApp } = require('../app');
    const app = criarApp({
        limites: { geral: 100000, loginPorConta: 1000, loginPorIp: 1000, registo: 1000, pin: 1000, ...limites },
    });
    const servidor = await new Promise((resolve) => {
        const s = app.listen(0, () => resolve(s));
    });
    const base = `http://127.0.0.1:${servidor.address().port}/api`;
    return {
        base,
        cliente: () => new ClienteHttp(base),
        async parar() {
            await new Promise((resolve) => servidor.close(resolve));
        },
    };
}

async function fecharBaseDados() {
    await require('../db').fecharPool();
}

// um "browser" mínimo: guarda os cookies entre pedidos e envia o cabeçalho
// Origin como a aplicação verdadeira
class ClienteHttp {
    constructor(base) {
        this.base = base;
        this.cookies = new Map();
    }

    async pedido(metodo, caminho, corpo, { origem = 'http://localhost:5173', cabecalhos = {} } = {}) {
        const headers = { ...cabecalhos };
        if (origem) headers.origin = origem;
        if (corpo !== undefined) headers['content-type'] = 'application/json';
        if (this.cookies.size > 0) {
            headers.cookie = [...this.cookies].map(([nome, valor]) => `${nome}=${valor}`).join('; ');
        }

        const res = await fetch(this.base + caminho, {
            method: metodo,
            headers,
            body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
        });

        for (const cookie of res.headers.getSetCookie()) {
            const [par] = cookie.split(';');
            const i = par.indexOf('=');
            const nome = par.slice(0, i);
            const valor = par.slice(i + 1);
            if (valor === '' || /expires=Thu, 01 Jan 1970/i.test(cookie)) this.cookies.delete(nome);
            else this.cookies.set(nome, valor);
        }

        const texto = await res.text();
        let dados = null;
        try {
            dados = texto ? JSON.parse(texto) : null;
        } catch {
            dados = texto;
        }
        return { status: res.status, dados, headers: res.headers };
    }

    get(caminho, opcoes) { return this.pedido('GET', caminho, undefined, opcoes); }
    post(caminho, corpo, opcoes) { return this.pedido('POST', caminho, corpo ?? {}, opcoes); }
    put(caminho, corpo, opcoes) { return this.pedido('PUT', caminho, corpo ?? {}, opcoes); }
    patch(caminho, corpo, opcoes) { return this.pedido('PATCH', caminho, corpo ?? {}, opcoes); }
    delete(caminho, opcoes) { return this.pedido('DELETE', caminho, undefined, opcoes); }
}

// NIF português aleatório mas válido (com o dígito de controlo certo)
function gerarNif(primeiro = 5) {
    const d = [primeiro];
    while (d.length < 8) d.push(Math.floor(Math.random() * 10));
    let soma = 0;
    for (let i = 0; i < 8; i++) soma += d[i] * (9 - i);
    let controlo = 11 - (soma % 11);
    if (controlo >= 10) controlo = 0;
    return d.join('') + controlo;
}

let contador = 0;
function unico() {
    contador += 1;
    return `${Date.now().toString(36)}${contador}`;
}

// regista uma oficina nova e devolve o "browser" do gestor já com sessão
async function novaOficina(servidor, nome = 'Oficina') {
    const gestor = servidor.cliente();
    const email = `gestor-${unico()}@teste.test`;
    const password = 'Password-Segura-2026';
    const res = await gestor.post('/oficinas', {
        oficina: { nome: `${nome} ${unico()}`, nif: gerarNif(), telefone: '275 000 000' },
        gestor: { nome: `Gestor ${nome}`, email, password },
    });
    if (res.status !== 201) throw new Error(`registo falhou: ${res.status} ${JSON.stringify(res.dados)}`);
    return { gestor, email, password, oficina: res.dados.oficina, colaborador: res.dados.colaborador };
}

// cliente + veículo + folha de obra, prontos a usar num teste
async function novaFolha(gestor, { linhas } = {}) {
    const cliente = await gestor.post('/clientes', { nome: `Cliente ${unico()}`, telefone: '912 000 000' });
    const veiculo = await gestor.post('/veiculos', {
        matricula: `T${unico()}`.slice(0, 10), tipo: 'ligeiro', marca: 'Renault', clienteId: cliente.dados.id,
    });
    const folha = await gestor.post('/folhas-obra', { veiculoId: veiculo.dados.id, kmsEntrada: 120000, linhas });
    if (folha.status !== 201) throw new Error(`folha falhou: ${folha.status} ${JSON.stringify(folha.dados)}`);
    return { cliente: cliente.dados, veiculo: veiculo.dados, folha: folha.dados };
}

module.exports = { arrancar, fecharBaseDados, gerarNif, unico, novaOficina, novaFolha };
