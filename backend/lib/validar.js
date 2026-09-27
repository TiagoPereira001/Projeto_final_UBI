const { ErroHttp } = require('./erros');

// validação dos dados que chegam do browser. Nunca se confia no que vem no
// pedido: tipos, tamanhos, formatos e valores permitidos são todos
// verificados aqui antes de chegarem à base de dados.
//
// uso típico numa rota:
//   const v = new Validador(req.body);
//   const nome = v.texto('nome', { max: 120 });
//   const nif = v.nifCliente('nif', { obrigatorio: false });
//   v.verificar(); // se houver erros, responde 400 com os erros de cada campo
//
// os erros são juntados todos, para o formulário os mostrar de uma vez

// caracteres de controlo invisíveis (menos tab e mudança de linha)
const CARACTERES_CONTROLO = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const PASSWORDS_FRACAS = new Set([
    '1234567890', '0123456789', '12345678910', 'qwertyuiop', 'password123',
    'password1234', 'passw0rd123', 'abcdefghij', '1q2w3e4r5t', 'qwerty1234',
    'iloveyou12', 'portugal123', 'benfica123', 'oficina123', 'bancada123',
]);

// NIF português: 9 dígitos, o último é um dígito de controlo (módulo 11)
function nifPortuguesValido(nif) {
    if (!/^[1-9]\d{8}$/.test(nif)) return false;
    let soma = 0;
    for (let i = 0; i < 8; i++) {
        soma += Number(nif[i]) * (9 - i);
    }
    let controlo = 11 - (soma % 11);
    if (controlo >= 10) controlo = 0;
    return controlo === Number(nif[8]);
}

// matrícula guardada só com letras e números em maiúsculas:
// "aa-00-aa", "AA 00 AA" e "AA00AA" são o mesmo veículo
function normalizarMatricula(valor) {
    return String(valor).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

class Validador {
    constructor(dados, prefixo = '', erros = {}) {
        this.dados = dados && typeof dados === 'object' && !Array.isArray(dados) ? dados : {};
        this.prefixo = prefixo;
        this.erros = erros;
    }

    // valida um objeto dentro do pedido (ex.: { oficina: {...}, gestor: {...} })
    sub(campo) {
        return new Validador(this.dados[campo], `${this.prefixo}${campo}.`, this.erros);
    }

    // true se o campo veio no pedido (mesmo que a null). Útil no PATCH, onde
    // "não veio" (não mexer) é diferente de "veio vazio" (apagar)
    presente(campo) {
        return Object.prototype.hasOwnProperty.call(this.dados, campo) && this.dados[campo] !== undefined;
    }

    erro(campo, mensagem) {
        this.erros[this.prefixo + campo] = mensagem;
        return undefined;
    }

    _vazio(valor) {
        return valor === undefined || valor === null || (typeof valor === 'string' && valor.trim() === '');
    }

    texto(campo, { obrigatorio = true, max = 255, min = 1, multilinha = false } = {}) {
        const valor = this.dados[campo];
        if (this._vazio(valor)) {
            return obrigatorio ? this.erro(campo, 'Campo obrigatório.') : null;
        }
        if (typeof valor !== 'string') return this.erro(campo, 'Tem de ser texto.');

        let limpo = valor.replace(CARACTERES_CONTROLO, '');
        limpo = multilinha
            ? limpo.replace(/\r\n?/g, '\n').trim()
            : limpo.replace(/\s+/g, ' ').trim();

        if (limpo.length < min) return this.erro(campo, `Precisa de pelo menos ${min} caracteres.`);
        if (limpo.length > max) return this.erro(campo, `Não pode passar de ${max} caracteres.`);
        return limpo;
    }

    email(campo, { obrigatorio = true } = {}) {
        const valor = this.texto(campo, { obrigatorio, max: 254 });
        if (!valor) return valor;
        const email = valor.toLowerCase();
        // validação propositadamente simples: a única prova real de um email
        // é enviar-lhe uma mensagem
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
            return this.erro(campo, 'Email inválido.');
        }
        return email;
    }

    telefone(campo, { obrigatorio = true } = {}) {
        const valor = this.texto(campo, { obrigatorio, max: 20 });
        if (!valor) return valor;
        const digitos = valor.replace(/\D/g, '');
        if (!/^[+()\d\s.-]+$/.test(valor) || digitos.length < 6 || digitos.length > 15) {
            return this.erro(campo, 'Telefone inválido.');
        }
        return valor;
    }

    // NIF da oficina: tem de ser português e válido
    nifPortugues(campo) {
        const valor = this.texto(campo, { max: 20 });
        if (!valor) return valor;
        const nif = valor.replace(/\s/g, '');
        if (!nifPortuguesValido(nif)) return this.erro(campo, 'NIF inválido. Confirma os 9 dígitos.');
        return nif;
    }

    // NIF de um cliente: opcional. Se tiver 9 dígitos é tratado como português
    // (e o dígito de controlo tem de bater certo). Senão aceita-se um número de
    // contribuinte estrangeiro com o prefixo do país (ex.: DE123456789)
    nifCliente(campo, { obrigatorio = false } = {}) {
        const valor = this.texto(campo, { obrigatorio, max: 20 });
        if (!valor) return valor;
        const nif = valor.replace(/[\s.-]/g, '').toUpperCase();
        if (/^\d+$/.test(nif)) {
            if (!nifPortuguesValido(nif)) return this.erro(campo, 'NIF inválido. Confirma os 9 dígitos.');
            return nif;
        }
        if (!/^[A-Z]{2}[A-Z0-9]{2,18}$/.test(nif)) {
            return this.erro(campo, 'NIF estrangeiro deve começar pelo código do país (ex.: DE123456789).');
        }
        return nif;
    }

    matricula(campo) {
        const valor = this.texto(campo, { max: 20 });
        if (!valor) return valor;
        const matricula = normalizarMatricula(valor);
        if (matricula.length < 2 || matricula.length > 12) {
            return this.erro(campo, 'Matrícula inválida.');
        }
        return matricula;
    }

    inteiro(campo, { obrigatorio = true, min = 0, max = 2147483647 } = {}) {
        const valor = this.dados[campo];
        if (this._vazio(valor)) {
            return obrigatorio ? this.erro(campo, 'Campo obrigatório.') : null;
        }
        const numero = typeof valor === 'string' ? Number(valor.trim()) : valor;
        if (typeof numero !== 'number' || !Number.isInteger(numero)) {
            return this.erro(campo, 'Tem de ser um número inteiro.');
        }
        if (numero < min || numero > max) return this.erro(campo, `Tem de estar entre ${min} e ${max}.`);
        return numero;
    }

    // aceita "12.5", "12,50" (vírgula, como se escreve em Portugal) ou 12.5
    decimal(campo, { obrigatorio = true, min = 0, max = 99999999, casas = 2, minExclusivo = false } = {}) {
        const valor = this.dados[campo];
        if (this._vazio(valor)) {
            return obrigatorio ? this.erro(campo, 'Campo obrigatório.') : null;
        }
        let texto;
        if (typeof valor === 'number') texto = String(valor);
        else if (typeof valor === 'string') texto = valor.trim().replace(/\s/g, '').replace(',', '.');
        else return this.erro(campo, 'Tem de ser um número.');

        if (!/^\d+(\.\d+)?$/.test(texto)) return this.erro(campo, 'Tem de ser um número.');
        const decimais = (texto.split('.')[1] || '').length;
        if (decimais > casas) return this.erro(campo, `No máximo ${casas} casas decimais.`);

        const numero = Number(texto);
        if (minExclusivo ? numero <= min : numero < min) {
            return this.erro(campo, minExclusivo ? `Tem de ser maior que ${min}.` : `Não pode ser menor que ${min}.`);
        }
        if (numero > max) return this.erro(campo, `Não pode ser maior que ${max}.`);
        return numero;
    }

    opcao(campo, opcoes, { obrigatorio = true } = {}) {
        const valor = this.dados[campo];
        if (this._vazio(valor)) {
            return obrigatorio ? this.erro(campo, 'Campo obrigatório.') : null;
        }
        if (!opcoes.includes(valor)) return this.erro(campo, 'Opção inválida.');
        return valor;
    }

    id(campo, { obrigatorio = true } = {}) {
        const valor = this.dados[campo];
        if (this._vazio(valor)) {
            return obrigatorio ? this.erro(campo, 'Campo obrigatório.') : null;
        }
        const numero = Number(valor);
        if (!Number.isInteger(numero) || numero <= 0 || numero > 2147483647) {
            return this.erro(campo, 'Identificador inválido.');
        }
        return numero;
    }

    dataHora(campo, { obrigatorio = false } = {}) {
        const valor = this.dados[campo];
        if (this._vazio(valor)) {
            return obrigatorio ? this.erro(campo, 'Campo obrigatório.') : null;
        }
        const data = new Date(valor);
        if (typeof valor !== 'string' || Number.isNaN(data.getTime())) {
            return this.erro(campo, 'Data inválida.');
        }
        // 10 minutos de margem para relógios de tablets ligeiramente adiantados
        if (data.getTime() > Date.now() + 10 * 60 * 1000) return this.erro(campo, 'A data não pode ser no futuro.');
        if (data.getUTCFullYear() < 2000) return this.erro(campo, 'Data inválida.');
        return data;
    }

    password(campo, { obrigatorio = true, email } = {}) {
        const valor = this.dados[campo];
        if (this._vazio(valor)) {
            return obrigatorio ? this.erro(campo, 'Campo obrigatório.') : null;
        }
        if (typeof valor !== 'string') return this.erro(campo, 'Password inválida.');
        if (valor.length < 10) return this.erro(campo, 'A password precisa de pelo menos 10 caracteres.');
        // o bcrypt só usa os primeiros 72 bytes; o resto seria ignorado em silêncio
        if (Buffer.byteLength(valor, 'utf8') > 72) return this.erro(campo, 'A password é demasiado longa.');
        const minuscula = valor.toLowerCase();
        if (PASSWORDS_FRACAS.has(minuscula) || /^(.)\1+$/.test(valor) ||
            (email && minuscula === String(email).toLowerCase())) {
            return this.erro(campo, 'Essa password é demasiado fácil de adivinhar.');
        }
        return valor;
    }

    // PIN do modo bancada: 4 a 6 dígitos, sem sequências óbvias
    pin(campo, { obrigatorio = true } = {}) {
        const valor = this.dados[campo];
        if (this._vazio(valor)) {
            return obrigatorio ? this.erro(campo, 'Campo obrigatório.') : null;
        }
        const pin = String(valor);
        if (!/^\d{4,6}$/.test(pin)) return this.erro(campo, 'O PIN tem de ter 4 a 6 algarismos.');
        const crescente = '0123456789';
        const decrescente = '9876543210';
        if (/^(\d)\1+$/.test(pin) || crescente.includes(pin) || decrescente.includes(pin)) {
            return this.erro(campo, 'Esse PIN é demasiado fácil de adivinhar.');
        }
        return pin;
    }

    verificar() {
        if (Object.keys(this.erros).length > 0) {
            throw new ErroHttp(400, 'Há campos por corrigir.', this.erros);
        }
    }
}

// para pesquisas com LIKE: os caracteres % _ [ passam a ser literais
function escaparLike(texto) {
    return texto.replace(/[\\%_[]/g, (c) => `\\${c}`);
}

// paginação comum a todas as listas: ?pagina=1&porPagina=50
function paginacao(query, { omissao = 50, maximo = 200 } = {}) {
    const pagina = Math.max(1, Math.min(10000, Number.parseInt(query.pagina, 10) || 1));
    const porPagina = Math.max(1, Math.min(maximo, Number.parseInt(query.porPagina, 10) || omissao));
    return { pagina, porPagina, salto: (pagina - 1) * porPagina };
}

module.exports = { Validador, nifPortuguesValido, normalizarMatricula, escaparLike, paginacao };
