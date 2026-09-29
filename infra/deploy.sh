#!/usr/bin/env bash
# Publica no servidor a versão que está no disco: base de dados, cópia de
# segurança, imagem nova, troca do container, teste de fumo e, se o teste
# falhar, volta à versão anterior. Serve também para a primeira publicação
# num servidor novo. (PROPOSTA: ver docs/infraestrutura.md)
#
# Uso, no servidor, na pasta do projeto:
#   git fetch && git checkout <versão>      (uma etiqueta do git, por exemplo v0.3.0)
#   infra/deploy.sh
#
# Limites (estão explicados no documento): a troca do container leva alguns
# segundos em que a Bancada não responde, e voltar à versão anterior repõe só a
# aplicação: uma alteração à base de dados (hoje não há migrações) não se desfaz
# sozinha. Para isso é a cópia do passo 2.
set -euo pipefail
cd "$(dirname "$0")/.."

CONTENTOR=${CONTENTOR_BD:-bancada-db-1}
BD=${NOME_BD:-Bancada}
DOMINIO=$(sed -n 's/^DOMINIO=//p' .env | head -n1)
[ -n "$DOMINIO" ] || { echo "Falta o DOMINIO no .env" >&2; exit 1; }
URL="https://$DOMINIO"
TENTATIVAS=${TENTATIVAS_FUMO:-30}

# quantas bases com este nome existem (0 no primeiro arranque de um servidor novo)
base_existe() {
    docker exec "$CONTENTOR" sh -c 'exec /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -h -1 -W -Q "$1"' sh \
        "SET NOCOUNT ON; SELECT COUNT(*) FROM sys.databases WHERE name = N'$BD'" | tr -d '[:space:]'
}

echo "1/6  Base de dados a correr"
docker compose up -d --wait db

echo "2/6  Cópia de segurança antes de publicar"
if [ "$(base_existe)" != 0 ]; then
    infra/backup.sh antes-do-deploy
else
    echo "     (a base de dados ainda não existe: é a primeira publicação, não há nada para copiar)"
fi

echo "3/6  Imagem nova (a atual fica guardada como bancada-app:anterior)"
docker tag bancada-app:atual bancada-app:anterior 2>/dev/null || true
docker compose build app

echo "4/6  Preparar a base de dados"
docker compose --profile setup run --rm setup

echo "5/6  Troca do container da API"
docker compose up -d app caddy

echo "6/6  Teste de fumo (até $TENTATIVAS tentativas, 2 s entre elas)"
for _ in $(seq 1 "$TENTATIVAS"); do
    if infra/fumo.sh "$URL" >/dev/null 2>&1; then
        echo "Publicado: $URL"
        exit 0
    fi
    sleep 2
done

echo "O teste de fumo falhou. Última resposta:" >&2
infra/fumo.sh "$URL" >&2 || true
# os registos da versão que falhou perdem-se quando o container é recriado:
# ficam aqui, no ecrã, para se perceber o que correu mal
echo "--- últimas linhas do registo da API (versão que falhou):" >&2
docker compose logs --no-log-prefix --tail 25 app >&2 || true
echo "---" >&2
if docker image inspect bancada-app:anterior >/dev/null 2>&1; then
    echo "A voltar à versão anterior..." >&2
    docker tag bancada-app:anterior bancada-app:atual
    docker compose up -d --no-build --force-recreate app
else
    echo "Não há versão anterior a que voltar (é a primeira publicação)." >&2
fi
exit 1
