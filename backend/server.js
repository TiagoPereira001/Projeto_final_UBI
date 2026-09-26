const config = require('./config');
const { criarApp } = require('./app');
const { fecharPool } = require('./db');

const app = criarApp();

const servidor = app.listen(config.porta, () => {
    console.log(`API da Bancada a correr em http://localhost:${config.porta}`);
});

// ao parar (Ctrl+C, docker stop), deixa acabar os pedidos em curso e fecha
// as ligações à base de dados com calma, em vez de as cortar a meio
function desligar(sinal) {
    console.log(`${sinal} recebido: a desligar...`);
    servidor.close(async () => {
        await fecharPool();
        process.exit(0);
    });
    // se algum pedido ficar pendurado, não espera para sempre
    setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => desligar('SIGINT'));
process.on('SIGTERM', () => desligar('SIGTERM'));
