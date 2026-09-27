// testes unitários da validação (não precisam de base de dados)
const test = require('node:test');
const assert = require('node:assert/strict');
const { Validador, nifPortuguesValido, normalizarMatricula, escaparLike } = require('../lib/validar');

function erroDe(dados, fn) {
    const v = new Validador(dados);
    fn(v);
    try {
        v.verificar();
        return null;
    } catch (err) {
        return err.campos;
    }
}

test('NIF português: dígito de controlo', () => {
    assert.equal(nifPortuguesValido('999999990'), true); // consumidor final
    assert.equal(nifPortuguesValido('999999991'), false);
    assert.equal(nifPortuguesValido('12345678'), false);
    assert.equal(nifPortuguesValido('012345678'), false);
});

test('NIF de cliente: aceita estrangeiro com código do país, recusa lixo', () => {
    let v = new Validador({ nif: 'de 811 907 980' });
    assert.equal(v.nifCliente('nif'), 'DE811907980');
    assert.equal(erroDe({ nif: '999999991' }, (x) => x.nifCliente('nif')).nif, 'NIF inválido. Confirma os 9 dígitos.');
    assert.ok(erroDe({ nif: '12-ab' }, (x) => x.nifCliente('nif')).nif);
    v = new Validador({});
    assert.equal(v.nifCliente('nif'), null); // opcional
});

test('matrícula: formatos diferentes dão o mesmo valor', () => {
    assert.equal(normalizarMatricula('aa-00-aa'), 'AA00AA');
    assert.equal(normalizarMatricula(' AA 00 AA '), 'AA00AA');
    assert.equal(normalizarMatricula('M-KW 4471'), 'MKW4471');
});

test('decimal: aceita vírgula portuguesa, recusa mais de 2 casas e negativos', () => {
    assert.equal(new Validador({ x: '12,50' }).decimal('x'), 12.5);
    assert.equal(new Validador({ x: 7 }).decimal('x'), 7);
    assert.ok(erroDe({ x: '12,345' }, (v) => v.decimal('x')).x.includes('casas'));
    assert.ok(erroDe({ x: '-3' }, (v) => v.decimal('x')));
    assert.ok(erroDe({ x: 0 }, (v) => v.decimal('x', { minExclusivo: true })));
    assert.ok(erroDe({ x: 'abc' }, (v) => v.decimal('x')));
});

test('texto: limpa espaços e caracteres de controlo, respeita o máximo', () => {
    assert.equal(new Validador({ t: '  João \u0000 Silva  ' }).texto('t'), 'João Silva');
    assert.equal(new Validador({ t: 'linha 1\r\nlinha 2' }).texto('t', { multilinha: true }), 'linha 1\nlinha 2');
    assert.ok(erroDe({ t: 'x'.repeat(11) }, (v) => v.texto('t', { max: 10 })));
    assert.ok(erroDe({ t: 123 }, (v) => v.texto('t')));
});

test('password: mínimo 10, máximo 72 bytes, sem passwords óbvias', () => {
    assert.ok(erroDe({ p: 'curta' }, (v) => v.password('p')));
    assert.ok(erroDe({ p: '1234567890' }, (v) => v.password('p')));
    assert.ok(erroDe({ p: 'aaaaaaaaaaaa' }, (v) => v.password('p')));
    assert.ok(erroDe({ p: 'ç'.repeat(40) }, (v) => v.password('p'))); // 80 bytes
    assert.equal(erroDe({ p: 'Oficina-do-Canhoso-26' }, (v) => v.password('p')), null);
});

test('PIN: 4 a 6 algarismos e sem sequências óbvias', () => {
    for (const mau of ['123', '1234', '0000', '4321', '123456', 'abcd', '1234567']) {
        assert.ok(erroDe({ pin: mau }, (v) => v.pin('pin')), `devia recusar ${mau}`);
    }
    assert.equal(new Validador({ pin: '2580' }).pin('pin'), '2580');
});

test('pesquisa LIKE: caracteres especiais ficam literais', () => {
    assert.equal(escaparLike('50%_[x]'), '50\\%\\_\\[x]');
});

test('sub-objetos: os erros vêm com o caminho do campo', () => {
    const campos = erroDe({ oficina: { nome: '' } }, (v) => v.sub('oficina').texto('nome'));
    assert.deepEqual(Object.keys(campos), ['oficina.nome']);
});
