const express = require('express');
const { sql, getPool } = require('../db');
const { ErroHttp } = require('../lib/erros');
const { Validador } = require('../lib/validar');
const { confere } = require('../lib/credenciais');
const sessao = require('../lib/sessao');
const { ESTADOS_ATIVOS } = require('../lib/estados');
const {
    exigirSessao, exigirCargo, exigirEntradaComPassword, carregarColaborador,
} = require('../middleware/auth');

const TENTATIVAS_PIN = 5;
const MINUTOS_BLOQUEIO_PIN = 5;

function respostaSessao(colaborador) {
    return {
        colaborador: { id: colaborador.id, nome: colaborador.nome, cargo: colaborador.cargo, via: colaborador.via },
        oficina: { id: colaborador.oficinaId, nome: colaborador.oficinaNome },
    };
}

// confirma o cookie de dispositivo (modo bancada) contra a BD: a oficina tem
// de estar ativa e o gestor não pode ter "desligado os tablets" entretanto
async function dispositivoValido(req, res) {
    const dispositivo = sessao.lerDispositivo(req);
    if (!dispositivo) return null;

    const pool = await getPool();
    const resultado = await pool.request()
        .input('oficina', sql.Int, dispositivo.oficinaId)
        .query(`
            SELECT ID_Oficina AS oficinaId, Nome AS oficinaNome, Versao_Bancada AS versao
            FROM Oficina WHERE ID_Oficina = @oficina AND Ativo = 1
        `);

    const oficina = resultado.recordset[0];
    if (!oficina || oficina.versao !== dispositivo.versao) {
        sessao.desligarDispositivo(res);
        return null;
    }
    return oficina;
}

function criarRouterAuth(limitadores) {
    const router = express.Router();

    // POST /api/auth/entrar { email, password }
    router.post('/entrar', limitadores.loginPorIp, limitadores.loginPorConta, async (req, res) => {
        const v = new Validador(req.body);
        const email = v.email('email');
        if (typeof req.body?.password !== 'string' || req.body.password === '') {
            v.erro('password', 'Campo obrigatório.');
        }
        v.verificar();

        const pool = await getPool();
        const resultado = await pool.request()
            .input('email', sql.NVarChar(254), email)
            .query(`
                SELECT c.ID_Colaborador AS id, c.Nome AS nome, c.Cargo AS cargo,
                       c.Password_Hash AS hash, c.Versao_Sessao AS versaoSessao,
                       c.ID_Oficina AS oficinaId, o.Nome AS oficinaNome
                FROM Colaborador c
                JOIN Oficina o ON o.ID_Oficina = c.ID_Oficina
                WHERE c.Email = @email AND c.Ativo = 1 AND o.Ativo = 1
            `);

        const colaborador = resultado.recordset[0];
        const certa = await confere(req.body.password, colaborador?.hash);

        // mensagem igual para "email não existe" e "password errada", de
        // propósito: não se diz a quem tenta adivinhar qual das duas falhou
        if (!colaborador || !certa) {
            throw new ErroHttp(401, 'Email ou password incorretos.');
        }

        sessao.iniciarSessao(res, colaborador, 'password');
        res.json(respostaSessao({ ...colaborador, via: 'password' }));
    });

    // POST /api/auth/sair: termina a sessão (no modo bancada, o tablet volta
    // ao ecrã "quem está a trabalhar?")
    router.post('/sair', (req, res) => {
        sessao.terminarSessao(res);
        res.status(204).end();
    });

    // GET /api/auth/sessao: o frontend chama isto ao abrir. Nunca dá 401:
    // responde com quem está a trabalhar (ou null) e se o dispositivo é uma bancada
    router.get('/sessao', async (req, res) => {
        let colaborador = null;
        const dadosSessao = sessao.lerSessao(req);
        if (dadosSessao) {
            colaborador = await carregarColaborador(dadosSessao);
            if (!colaborador) sessao.terminarSessao(res);
        }
        const bancada = await dispositivoValido(req, res);

        res.json({
            ...(colaborador ? respostaSessao(colaborador) : { colaborador: null, oficina: null }),
            bancada: bancada ? { oficina: { id: bancada.oficinaId, nome: bancada.oficinaNome } } : null,
        });
    });

    // POST /api/auth/bancada: o gestor transforma este dispositivo no tablet
    // partilhado da oficina. A partir daqui, cada mecânico entra com o seu
    // nome e PIN, e o trabalho fica registado em nome de quem o fez
    router.post('/bancada', exigirSessao, exigirCargo('gestor'), exigirEntradaComPassword, async (req, res) => {
        const pool = await getPool();
        const resultado = await pool.request()
            .input('oficina', sql.Int, req.colaborador.oficinaId)
            .query('SELECT Versao_Bancada AS versao FROM Oficina WHERE ID_Oficina = @oficina');

        sessao.ativarDispositivo(res, req.colaborador.oficinaId, resultado.recordset[0].versao);
        // o tablet passa a ser partilhado: a sessão do gestor termina aqui,
        // para ninguém ficar a trabalhar em nome dele
        sessao.terminarSessao(res);
        res.status(204).end();
    });

    // DELETE /api/auth/bancada: este dispositivo deixa de ser uma bancada
    router.delete('/bancada', exigirSessao, exigirCargo('gestor'), exigirEntradaComPassword, (req, res) => {
        sessao.desligarDispositivo(res);
        res.status(204).end();
    });

    // GET /api/auth/bancada: o que o tablet mostra em repouso, antes de alguém
    // entrar. Quem pode entrar (só nome e cargo) e o tablier da oficina: quantas
    // folhas há em cada estado. Só números, nunca dados de clientes nem de
    // veículos, e só da oficina a que este dispositivo pertence
    router.get('/bancada', async (req, res) => {
        const bancada = await dispositivoValido(req, res);
        if (!bancada) {
            throw new ErroHttp(401, 'Este dispositivo não está ligado como bancada da oficina.');
        }

        const pool = await getPool();
        const [pessoas, folhas] = await Promise.all([
            pool.request()
                .input('oficina', sql.Int, bancada.oficinaId)
                .query(`
                    SELECT ID_Colaborador AS id, Nome AS nome, Cargo AS cargo
                    FROM Colaborador
                    WHERE ID_Oficina = @oficina AND Ativo = 1 AND PIN_Hash IS NOT NULL
                    ORDER BY Nome
                `),
            pool.request()
                .input('oficina', sql.Int, bancada.oficinaId)
                .query(`
                    SELECT Estado AS estado, COUNT(*) AS folhas
                    FROM Folha_Obra
                    WHERE ID_Oficina = @oficina AND Estado <> 'entregue'
                    GROUP BY Estado
                `),
        ]);

        // todos os estados aparecem, mesmo os que não têm nenhuma folha (a 0)
        const porEstado = Object.fromEntries(ESTADOS_ATIVOS.map((e) => [e, 0]));
        for (const { estado, folhas: n } of folhas.recordset) porEstado[estado] = n;

        res.json({
            oficina: { id: bancada.oficinaId, nome: bancada.oficinaNome },
            colaboradores: pessoas.recordset,
            porEstado,
        });
    });

    // POST /api/auth/bancada/entrar { colaboradorId, pin }
    router.post('/bancada/entrar', limitadores.pin, async (req, res) => {
        const bancada = await dispositivoValido(req, res);
        if (!bancada) {
            throw new ErroHttp(401, 'Este dispositivo não está ligado como bancada da oficina.');
        }

        const v = new Validador(req.body);
        const colaboradorId = v.id('colaboradorId');
        const pin = String(req.body?.pin ?? '');
        if (!/^\d{4,6}$/.test(pin)) v.erro('pin', 'O PIN tem 4 a 6 algarismos.');
        v.verificar();

        const pool = await getPool();
        const resultado = await pool.request()
            .input('id', sql.Int, colaboradorId)
            .input('oficina', sql.Int, bancada.oficinaId)
            .query(`
                SELECT c.ID_Colaborador AS id, c.Nome AS nome, c.Cargo AS cargo,
                       c.PIN_Hash AS hash, c.PIN_Falhas AS falhas, c.Versao_Sessao AS versaoSessao,
                       c.ID_Oficina AS oficinaId, o.Nome AS oficinaNome,
                       CASE WHEN c.PIN_Bloqueado_Ate > SYSUTCDATETIME()
                            THEN DATEDIFF(SECOND, SYSUTCDATETIME(), c.PIN_Bloqueado_Ate) ELSE 0 END AS segundosBloqueado
                FROM Colaborador c
                JOIN Oficina o ON o.ID_Oficina = c.ID_Oficina
                WHERE c.ID_Colaborador = @id AND c.ID_Oficina = @oficina
                  AND c.Ativo = 1 AND c.PIN_Hash IS NOT NULL
            `);

        const colaborador = resultado.recordset[0];
        if (!colaborador) {
            throw new ErroHttp(401, 'PIN incorreto.');
        }
        if (colaborador.segundosBloqueado > 0) {
            const minutos = Math.ceil(colaborador.segundosBloqueado / 60);
            throw new ErroHttp(429, `PIN bloqueado depois de várias tentativas erradas. Tenta outra vez daqui a ${minutos} min.`);
        }

        if (!(await confere(pin, colaborador.hash))) {
            // conta a falha numa só instrução (seguro mesmo com pedidos em
            // simultâneo). À quinta, bloqueia o PIN durante uns minutos
            const falha = await pool.request()
                .input('id', sql.Int, colaborador.id)
                .input('tentativas', sql.Int, TENTATIVAS_PIN)
                .input('minutos', sql.Int, MINUTOS_BLOQUEIO_PIN)
                .query(`
                    UPDATE Colaborador
                    SET PIN_Falhas = CASE WHEN PIN_Falhas + 1 >= @tentativas THEN 0 ELSE PIN_Falhas + 1 END,
                        PIN_Bloqueado_Ate = CASE WHEN PIN_Falhas + 1 >= @tentativas
                                                 THEN DATEADD(MINUTE, @minutos, SYSUTCDATETIME())
                                                 ELSE PIN_Bloqueado_Ate END
                    OUTPUT INSERTED.PIN_Falhas AS falhas, INSERTED.PIN_Bloqueado_Ate AS bloqueadoAte
                    WHERE ID_Colaborador = @id
                `);

            const { falhas, bloqueadoAte } = falha.recordset[0];
            if (bloqueadoAte && bloqueadoAte.getTime() > Date.now()) {
                throw new ErroHttp(429, `PIN errado ${TENTATIVAS_PIN} vezes. Fica bloqueado durante ${MINUTOS_BLOQUEIO_PIN} minutos.`);
            }
            const restam = TENTATIVAS_PIN - falhas;
            throw new ErroHttp(401, `PIN incorreto. ${restam === 1 ? 'Resta 1 tentativa' : `Restam ${restam} tentativas`}.`);
        }

        if (colaborador.falhas > 0) {
            await pool.request()
                .input('id', sql.Int, colaborador.id)
                .query('UPDATE Colaborador SET PIN_Falhas = 0, PIN_Bloqueado_Ate = NULL WHERE ID_Colaborador = @id');
        }

        sessao.iniciarSessao(res, colaborador, 'pin');
        res.json(respostaSessao({ ...colaborador, via: 'pin' }));
    });

    return router;
}

module.exports = { criarRouterAuth };
