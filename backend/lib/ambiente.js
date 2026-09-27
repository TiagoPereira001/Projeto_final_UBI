const path = require('node:path');

// carrega o backend/.env e depois o .env da raiz (o mesmo do docker compose).
// o Node 22 já faz isto sozinho, sem precisar do pacote dotenv. Variáveis que
// já existam no ambiente (Docker, CI) têm sempre prioridade.
for (const ficheiro of [path.join(__dirname, '..', '.env'), path.join(__dirname, '..', '..', '.env')]) {
    try {
        process.loadEnvFile(ficheiro);
    } catch {
        // o ficheiro não existe: não faz mal, usa-se só o ambiente
    }
}
