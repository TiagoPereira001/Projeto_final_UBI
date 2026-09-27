// utilitários da auditoria: um "browser" mínimo com cookies, acesso ao SQL
// Server (só para preparar casos de teste) e registo dos resultados
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

export const BASE = process.env.BASE || 'http://localhost:3000';
// pasta com o seed-output.txt (saída do npm run db:seed) e onde ficam os resultados
export const DIR = process.env.AUDITORIA_DIR || '.';

// credenciais fictícias do db:seed (nunca são impressas)
const seed = readFileSync(`${DIR}/seed-output.txt`, 'utf8');
export const EMAIL_GESTOR = seed.match(/Gestor:\s+(\S+)/)[1];
export const PASS_GESTOR = seed.match(/Password:\s+(\S+)/)[1];
export const PINS = Object.fromEntries(
    [...seed.matchAll(/^ {4}(\S.*?) {2,}(\d{4,6})\s*$/gm)].map((m) => [m[1].trim(), m[2]])
);

export class Cliente {
    constructor(nome = 'cliente') {
        this.nome = nome;
        this.cookies = new Map();
    }

    async pedido(metodo, caminho, corpo, opcoes = {}) {
        const {
            origem = BASE,
            fetchSite = 'same-origin',
            cabecalhos = {},
            corpoBruto,
            tipo = 'application/json',
        } = opcoes;
        const headers = { ...cabecalhos };
        if (!['GET', 'HEAD'].includes(metodo)) {
            if (origem) headers.origin = origem;
            if (fetchSite) headers['sec-fetch-site'] = fetchSite;
        }
        if (corpo !== undefined || corpoBruto !== undefined) headers['content-type'] = tipo;
        if (this.cookies.size > 0) {
            headers.cookie = [...this.cookies].map(([n, v]) => `${n}=${v}`).join('; ');
        }
        const inicio = performance.now();
        const res = await fetch(BASE + caminho, {
            method: metodo,
            headers,
            body: corpoBruto !== undefined ? corpoBruto : corpo !== undefined ? JSON.stringify(corpo) : undefined,
        });
        const ms = performance.now() - inicio;
        const setCookies = res.headers.getSetCookie();
        for (const c of setCookies) {
            const [par] = c.split(';');
            const i = par.indexOf('=');
            const n = par.slice(0, i);
            const v = par.slice(i + 1);
            if (v === '' || /expires=Thu, 01 Jan 1970/i.test(c)) this.cookies.delete(n);
            else this.cookies.set(n, v);
        }
        const texto = await res.text();
        let dados = null;
        try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }
        return { status: res.status, dados, headers: res.headers, setCookies, ms, texto };
    }

    get(c, o) { return this.pedido('GET', c, undefined, o); }
    post(c, b, o) { return this.pedido('POST', c, b, o); }
    put(c, b, o) { return this.pedido('PUT', c, b, o); }
    patch(c, b, o) { return this.pedido('PATCH', c, b, o); }
    del(c, o) { return this.pedido('DELETE', c, undefined, o); }

    async entrar(email = EMAIL_GESTOR, password = PASS_GESTOR) {
        const r = await this.post('/api/auth/entrar', { email, password });
        if (r.status !== 200) throw new Error(`login falhou (${r.status}): ${JSON.stringify(r.dados)}`);
        return r;
    }
}

// consulta ao SQL Server como administrador, dentro do container (só na
// preparação de casos que a API não deixa criar, como datas no passado)
export function sql(consulta, bd = 'Bancada') {
    const saida = execFileSync('docker', [
        'exec', process.env.SQL_CONTAINER || 'bancada_sql', '/opt/mssql-tools18/bin/sqlcmd', '-S', 'localhost', '-U', 'sa',
        '-P', process.env.DB_ADMIN_PASSWORD, '-C', '-b', '-I', '-d', bd, '-h', '-1', '-W', '-s', '|', '-Q',
        `SET NOCOUNT ON; SET QUOTED_IDENTIFIER ON; ${consulta}`,
    ], { encoding: 'utf8' });
    return saida.trim();
}

// registo dos resultados: uma linha por teste, e tudo num JSON no fim
const resultados = [];
export function registar(id, categoria, titulo, esperado, obtido, ok, nota = '') {
    resultados.push({ id, categoria, titulo, esperado: String(esperado), obtido: String(obtido), ok, nota });
    const estado = ok === true ? 'PASSA' : ok === false ? 'FALHA' : 'INFO ';
    console.log(`${estado}  ${id.padEnd(5)} ${titulo} | esperado: ${esperado} | obtido: ${obtido}${nota ? ` | ${nota}` : ''}`);
}

export function guardar(ficheiro) {
    let anteriores = [];
    if (existsSync(ficheiro)) anteriores = JSON.parse(readFileSync(ficheiro, 'utf8'));
    const ids = new Set(resultados.map((r) => r.id));
    writeFileSync(ficheiro, JSON.stringify([...anteriores.filter((r) => !ids.has(r.id)), ...resultados], null, 2));
}

export const unico = () => Math.random().toString(36).slice(2, 8);
// credencial aleatória para as contas descartáveis que os testes criam (nunca é uma credencial real)
export const credencialDeTeste = () => randomBytes(12).toString('base64url') + 'Aa1';
export const mediana = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

// NIF português válido gerado a partir de 8 algarismos
export function nifValido(base8) {
    const d = String(base8).padStart(8, '1').slice(0, 8);
    let soma = 0;
    for (let i = 0; i < 8; i++) soma += Number(d[i]) * (9 - i);
    let c = 11 - (soma % 11);
    if (c >= 10) c = 0;
    return `${d}${c}`;
}

// matrícula portuguesa fictícia e única (formato AA-00-AA)
export function matriculaNova() {
    const L = 'ABCDEFGHIJLMNOPRSTUVXZ';
    const l = () => L[Math.floor(Math.random() * L.length)];
    const n = () => String(Math.floor(Math.random() * 100)).padStart(2, '0');
    return `${l()}${l()}-${n()}-${l()}${l()}`;
}
