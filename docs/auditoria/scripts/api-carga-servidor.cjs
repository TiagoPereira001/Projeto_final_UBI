// a mesma API, com os limites de pedidos subidos, só para medir a capacidade
const { criarApp } = require(require('node:path').join(__dirname, '..', '..', '..', 'backend', 'app.js'));
const app = criarApp({ limites: { geral: 1e9, loginPorConta: 1e9, loginPorIp: 1e9, registo: 1e9, pin: 1e9 } });
app.listen(3001, () => console.log('API de carga em http://localhost:3001'));
