// dados de demonstração: cria a Duarte & Raposo, o primeiro cliente da
// Bancada, com colaboradores, clientes, veículos e folhas de obra.
//
// ATENÇÃO: os clientes, veículos, matrículas e folhas são FICTÍCIOS. Servem
// para experimentar a aplicação e tirar capturas de ecrã, não são dados reais.
//
// uso: npm run db:seed  (depois do npm run db:setup)
// a password do gestor vem de SEED_GESTOR_PASSWORD; se não existir, é gerada
// uma aleatória e mostrada no fim, tal como os PINs dos mecânicos.

const crypto = require('node:crypto');
const { sql, getPool, emTransacao, fecharPool } = require('../db');
const { gerarHash } = require('../lib/credenciais');
const { nifPortuguesValido } = require('../lib/validar');

const emailGestor = (process.env.SEED_GESTOR_EMAIL || 'gestor@duarte-raposo.test').toLowerCase();
const passwordGestor = process.env.SEED_GESTOR_PASSWORD || `${crypto.randomBytes(9).toString('base64url')}-Dr1`;

function nifAleatorio(primeiro) {
    for (;;) {
        const base = `${primeiro}${String(crypto.randomInt(0, 10 ** 7)).padStart(7, '0')}`;
        for (let d = 0; d <= 9; d++) {
            if (nifPortuguesValido(base + d)) return base + d;
        }
    }
}

function pinAleatorio() {
    for (;;) {
        const pin = String(crypto.randomInt(0, 10000)).padStart(4, '0');
        if (!/^(\d)\1+$/.test(pin) && !'0123456789'.includes(pin) && !'9876543210'.includes(pin)) return pin;
    }
}

const diasAtras = (dias, horas = 9) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - dias);
    d.setUTCHours(horas, 15, 0, 0);
    return d;
};

const MECANICOS = ['Nuno Batista', 'Carlos Mendes', 'Rui Fonseca'];

// [cliente, veículo, folha?]
const DEMONSTRACAO = [
    {
        cliente: { nome: 'Klaus Weber', telefone: '+49 171 5550199', morada: 'München, Deutschland' },
        veiculo: { matricula: 'MKW4471', tipo: 'autocaravana', marca: 'Fiat', modelo: 'Ducato 2.3 Multijet', ano: 2019, celula: 'Hymer' },
        folha: {
            estado: 'em_curso', dias: 2, kms: 84210, mecanico: 0,
            observacoes: 'A bateria da célula não carrega com o motor ligado. Cliente de passagem, segue viagem na sexta.',
            linhas: [
                ['Bateria AGM 100 Ah (célula)', 'peca', 1, 189.9],
                ['Relé separador de baterias 12 V', 'peca', 1, 64.5],
                ['Diagnóstico e substituição', 'mao_de_obra', 2, 38],
            ],
        },
    },
    {
        cliente: { nome: 'Jean-Pierre Laurent', telefone: '+33 6 12 45 78 90', morada: 'Lyon, France' },
        veiculo: { matricula: 'GH512KT', tipo: 'autocaravana', marca: 'Fiat', modelo: 'Ducato', ano: 2021, celula: 'Rapido' },
        folha: {
            estado: 'aguarda_pecas', dias: 4, kms: 41890, mecanico: 1,
            observacoes: 'Fuga de água junto ao WC e a bomba de água faz barulho. Bomba encomendada ao fornecedor.',
            linhas: [['Diagnóstico do circuito de água', 'mao_de_obra', 0.5, 38]],
        },
    },
    {
        cliente: { nome: 'Maria do Céu Antunes', telefone: '962 418 730', nif: nifAleatorio(2) },
        veiculo: { matricula: '45TR89', tipo: 'ligeiro', marca: 'Renault', modelo: 'Clio 1.5 dCi', ano: 2014 },
        folha: { estado: 'aberta', dias: 0, kms: 89950, mecanico: 2, observacoes: 'Revisão dos 90 000 km. Pede para ver o ruído na roda da frente.', linhas: [] },
    },
    {
        cliente: { nome: 'Transportes Serra da Estrela, Lda', telefone: '275 331 208', nif: nifAleatorio(5), morada: 'Zona Industrial do Tortosendo' },
        veiculo: { matricula: 'AV19QS', tipo: 'comercial', marca: 'Ford', modelo: 'Transit Custom', ano: 2021 },
        folha: {
            estado: 'concluida', dias: 3, kms: 132400, mecanico: 0,
            observacoes: 'Travões da frente a chiar.',
            conselhos: 'Pastilhas de trás a 30%. Trocar nos próximos 10 000 km.',
            linhas: [
                ['Discos de travão (frente)', 'peca', 2, 58.4],
                ['Pastilhas de travão (frente)', 'peca', 1, 41.9],
                ['Substituição de discos e pastilhas', 'mao_de_obra', 1.5, 38],
            ],
        },
    },
    {
        cliente: { nome: 'João Pedro Gaspar', telefone: '917 604 115', nif: nifAleatorio(1) },
        veiculo: { matricula: '31XZ07', tipo: 'autocaravana', marca: 'Citroën', modelo: 'Jumper', ano: 2008, celula: 'Adria' },
        folha: {
            estado: 'entregue', dias: 9, kms: 176020, mecanico: 1,
            observacoes: 'Instalar painel solar no tejadilho.',
            conselhos: 'Vedante da claraboia ressequido. Rever antes do inverno.',
            linhas: [
                ['Painel solar 150 W', 'peca', 1, 219],
                ['Regulador de carga MPPT 20 A', 'peca', 1, 89.9],
                ['Cabos, bucins e selante', 'outro', 1, 24.5],
                ['Instalação do painel e regulador', 'mao_de_obra', 3, 38],
            ],
        },
    },
    {
        cliente: { nome: 'Luísa Martins', telefone: '936 250 481' },
        veiculo: { matricula: 'BE42TT', tipo: 'ligeiro', marca: 'Peugeot', modelo: '208 1.2 PureTech', ano: 2022 },
        folha: {
            estado: 'entregue', dias: 6, kms: 30110, mecanico: 2,
            observacoes: 'Revisão anual.',
            linhas: [
                ['Óleo 5W30 (litro)', 'peca', 4.5, 9.8],
                ['Filtro de óleo', 'peca', 1, 11.2],
                ['Filtro de ar', 'peca', 1, 16.9],
                ['Revisão', 'mao_de_obra', 1, 38],
            ],
        },
    },
    {
        cliente: { nome: 'Hendrik de Vries', telefone: '+31 6 4821 7730', morada: 'Utrecht, Nederland' },
        veiculo: { matricula: 'V432KL', tipo: 'autocaravana', marca: 'Fiat', modelo: 'Ducato', ano: 2017, celula: 'Knaus' },
        folha: { estado: 'aberta', dias: 1, kms: 98760, mecanico: 0, observacoes: 'Cheiro a gás no exterior, junto à caixa das garrafas.', linhas: [] },
    },
    {
        cliente: { nome: 'Armando Coelho', telefone: '968 773 042' },
        veiculo: { matricula: '92QZ14', tipo: 'motociclo', marca: 'Honda', modelo: 'NC750X', ano: 2016 },
    },
];

async function main() {
    const pool = await getPool();
    const existe = await pool.request()
        .input('email', sql.NVarChar(254), emailGestor)
        .query('SELECT 1 AS x FROM Colaborador WHERE Email = @email');
    if (existe.recordset.length > 0) {
        console.log(`Já existe uma conta ${emailGestor}. Para recomeçar do zero: npm run db:reset && npm run db:seed`);
        return;
    }

    const pins = MECANICOS.map(() => pinAleatorio());
    const [hashGestor, ...hashesPins] = await Promise.all([gerarHash(passwordGestor), ...pins.map(gerarHash)]);

    await emTransacao(async (t) => {
        const q = () => new sql.Request(t);

        const oficinaId = (await q()
            .input('nome', sql.NVarChar(120), 'Duarte & Raposo')
            .input('nif', sql.Char(9), process.env.SEED_OFICINA_NIF || nifAleatorio(5))
            .input('morada', sql.NVarChar(255), 'Canhoso, Covilhã')
            .query(`INSERT INTO Oficina (Nome, NIF, Morada) OUTPUT INSERTED.ID_Oficina AS id
                    VALUES (@nome, @nif, @morada)`)).recordset[0].id;

        await q()
            .input('oficina', sql.Int, oficinaId)
            .input('email', sql.NVarChar(254), emailGestor)
            .input('hash', sql.Char(60), hashGestor)
            .query(`INSERT INTO Colaborador (ID_Oficina, Nome, Cargo, Email, Password_Hash)
                    VALUES (@oficina, N'Gestor da oficina', 'gestor', @email, @hash)`);

        const mecanicos = [];
        for (let i = 0; i < MECANICOS.length; i++) {
            mecanicos.push((await q()
                .input('oficina', sql.Int, oficinaId)
                .input('nome', sql.NVarChar(100), MECANICOS[i])
                .input('pin', sql.Char(60), hashesPins[i])
                .query(`INSERT INTO Colaborador (ID_Oficina, Nome, Cargo, PIN_Hash) OUTPUT INSERTED.ID_Colaborador AS id
                        VALUES (@oficina, @nome, 'mecanico', @pin)`)).recordset[0].id);
        }

        let numero = 0;
        for (const { cliente, veiculo, folha } of DEMONSTRACAO) {
            const clienteId = (await q()
                .input('oficina', sql.Int, oficinaId)
                .input('nome', sql.NVarChar(120), cliente.nome)
                .input('telefone', sql.VarChar(20), cliente.telefone)
                .input('nif', sql.VarChar(20), cliente.nif || null)
                .input('morada', sql.NVarChar(255), cliente.morada || null)
                .query(`INSERT INTO Cliente (ID_Oficina, Nome, Telefone, NIF, Morada) OUTPUT INSERTED.ID_Cliente AS id
                        VALUES (@oficina, @nome, @telefone, @nif, @morada)`)).recordset[0].id;

            const veiculoId = (await q()
                .input('oficina', sql.Int, oficinaId)
                .input('cliente', sql.Int, clienteId)
                .input('matricula', sql.VarChar(12), veiculo.matricula)
                .input('tipo', sql.VarChar(20), veiculo.tipo)
                .input('marca', sql.NVarChar(50), veiculo.marca)
                .input('modelo', sql.NVarChar(60), veiculo.modelo)
                .input('ano', sql.SmallInt, veiculo.ano)
                .input('celula', sql.NVarChar(50), veiculo.celula || null)
                .query(`INSERT INTO Veiculo (ID_Oficina, ID_Cliente, Matricula, Tipo, Marca, Modelo, Ano, Marca_Celula)
                        OUTPUT INSERTED.ID_Veiculo AS id
                        VALUES (@oficina, @cliente, @matricula, @tipo, @marca, @modelo, @ano, @celula)`)).recordset[0].id;

            if (!folha) continue;
            numero += 1;
            const entrada = diasAtras(folha.dias);
            const colaboradorId = mecanicos[folha.mecanico];
            const concluida = ['concluida', 'entregue'].includes(folha.estado) ? diasAtras(Math.max(folha.dias - 1, 0), 17) : null;
            const entregue = folha.estado === 'entregue' ? diasAtras(Math.max(folha.dias - 2, 0), 18) : null;

            const folhaId = (await q()
                .input('oficina', sql.Int, oficinaId)
                .input('numero', sql.Int, numero)
                .input('veiculo', sql.Int, veiculoId)
                .input('cliente', sql.Int, clienteId)
                .input('colaborador', sql.Int, colaboradorId)
                .input('entrada', sql.DateTime2(0), entrada)
                .input('kms', sql.Int, folha.kms)
                .input('estado', sql.VarChar(20), folha.estado)
                .input('observacoes', sql.NVarChar(2000), folha.observacoes)
                .input('conselhos', sql.NVarChar(2000), folha.conselhos || null)
                .input('conclusao', sql.DateTime2(0), concluida)
                .input('entrega', sql.DateTime2(0), entregue)
                .query(`INSERT INTO Folha_Obra (ID_Oficina, Numero, ID_Veiculo, ID_Cliente, ID_Colaborador, Data_Entrada,
                            KMS_Entrada, Estado, Observacoes, Conselhos, Taxa_IVA, Data_Conclusao, Data_Entrega)
                        OUTPUT INSERTED.ID_Folha AS id
                        VALUES (@oficina, @numero, @veiculo, @cliente, @colaborador, @entrada,
                            @kms, @estado, @observacoes, @conselhos, 23.00, @conclusao, @entrega)`)).recordset[0].id;

            for (const [designacao, categoria, quantidade, valor] of folha.linhas) {
                await q()
                    .input('folha', sql.Int, folhaId)
                    .input('colaborador', sql.Int, colaboradorId)
                    .input('designacao', sql.NVarChar(150), designacao)
                    .input('categoria', sql.VarChar(20), categoria)
                    .input('quantidade', sql.Decimal(10, 2), quantidade)
                    .input('valor', sql.Decimal(10, 2), valor)
                    .input('criado', sql.DateTime2(0), entrada)
                    .query(`INSERT INTO Linha_Reparacao (ID_Folha, ID_Colaborador, Designacao, Categoria, Quantidade, Valor_Unitario, Criado_Em)
                            VALUES (@folha, @colaborador, @designacao, @categoria, @quantidade, @valor, @criado)`);
            }
        }

        await q()
            .input('oficina', sql.Int, oficinaId)
            .input('numero', sql.Int, numero)
            .query('UPDATE Oficina SET Ultimo_Numero_Folha = @numero WHERE ID_Oficina = @oficina');
    });

    console.log('\nDuarte & Raposo criada com dados de demonstração (fictícios).\n');
    console.log(`  Gestor:    ${emailGestor}`);
    console.log(`  Password:  ${process.env.SEED_GESTOR_PASSWORD ? '(a do SEED_GESTOR_PASSWORD)' : passwordGestor}`);
    console.log('\n  PINs dos mecânicos (modo bancada):');
    MECANICOS.forEach((nome, i) => console.log(`    ${nome.padEnd(16)} ${pins[i]}`));
    console.log('\nGuarda estes dados: não voltam a ser mostrados.\n');
}

main()
    .catch((err) => {
        console.error('O seed falhou:', err.message);
        process.exitCode = 1;
    })
    .finally(fecharPool);
