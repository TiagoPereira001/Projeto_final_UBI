#!/usr/bin/env bash
# Repõe a base de dados da Bancada a partir de uma cópia de segurança
# (recuperação de um desastre ou de um engano).
# ATENÇÃO: com --substituir, apaga a base de dados que existir e põe a da cópia.
# (PROPOSTA: ver docs/infraestrutura.md)
#
# Uso:
#   infra/restaurar.sh copias/diaria-XXXX.bak.gz.age /caminho/da/chave-privada.txt
#   infra/restaurar.sh copias/diaria-XXXX.bak.gz.age /caminho/da/chave-privada.txt --substituir
#
# Num servidor novo basta o container da base de dados a correr
# (docker compose up -d db): a base ainda não existe, por isso não é preciso
# o --substituir. Sem ele, o script recusa-se a tocar numa base que já exista.
#
# No fim corre o "setup", que volta a ligar o login da API à base restaurada.
# Sem isso, num servidor novo, a API não consegue entrar (REL-005): a cópia traz
# o utilizador ligado ao login do servidor antigo.
#
# Depois: docker compose up -d app caddy   e   infra/fumo.sh https://<dominio>
set -euo pipefail
cd "$(dirname "$0")/.."

FICHEIRO=${1:?Uso: infra/restaurar.sh <cópia.bak.gz.age> <chave-privada.txt> [--substituir]}
CHAVE=${2:?Falta o caminho da chave privada do age}
SUBSTITUIR=${3:-}
CONTENTOR=${CONTENTOR_BD:-bancada-db-1}
BD=${NOME_BD:-Bancada}
DENTRO=/var/opt/mssql/backup/restaurar.bak

sql() {
    docker exec "$CONTENTOR" sh -c 'exec /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -h -1 -W -s "|" -Q "SET NOCOUNT ON; $1"' sh "$1"
}
limpar() { docker exec "$CONTENTOR" rm -f "$DENTRO" 2>/dev/null || true; }
trap limpar EXIT

# num servidor novo a imagem da aplicação ainda não existe, e o "setup" do fim
# precisa dela. Constrói-se já, antes de mexer em qualquer coisa (se já existir,
# é instantâneo)
echo "A garantir que a imagem da aplicação existe (num servidor novo demora um pouco)..."
docker compose build app >/dev/null

existe=$(sql "SELECT COUNT(*) FROM sys.databases WHERE name = N'$BD'" | tr -d '[:space:]')
if [ "$existe" != 0 ]; then
    if [ "$SUBSTITUIR" != "--substituir" ]; then
        echo "A base de dados $BD já existe e ficaria substituída. Se é isso que queres, acrescenta --substituir." >&2
        exit 1
    fi
    echo "A parar a API (a base vai ser substituída)..."
    docker compose stop app >/dev/null 2>&1 || true
fi

docker exec "$CONTENTOR" mkdir -p /var/opt/mssql/backup
echo "A descifrar e a copiar para o container da base de dados..."
age -d -i "$CHAVE" "$FICHEIRO" | gunzip | docker exec -i "$CONTENTOR" sh -c "cat > $DENTRO" || {
    echo "Não consegui abrir a cópia: a chave privada não é a certa, ou o ficheiro está incompleto ou corrompido." >&2
    exit 1
}

sql "RESTORE VERIFYONLY FROM DISK = N'$DENTRO' WITH CHECKSUM" >/dev/null
echo "A restaurar..."
if [ "$existe" != 0 ]; then
    sql "ALTER DATABASE [$BD] SET SINGLE_USER WITH ROLLBACK IMMEDIATE" >/dev/null
fi
sql "RESTORE DATABASE [$BD] FROM DISK = N'$DENTRO' WITH MOVE N'$BD' TO N'/var/opt/mssql/data/$BD.mdf', MOVE N'${BD}_log' TO N'/var/opt/mssql/data/${BD}_log.ldf', CHECKSUM, REPLACE, RECOVERY" >/dev/null
sql "IF DATABASEPROPERTYEX(N'$BD', 'UserAccess') <> 'MULTI_USER' ALTER DATABASE [$BD] SET MULTI_USER" >/dev/null

modelo=$(sql "SELECT recovery_model_desc FROM sys.databases WHERE name = N'$BD'" | tr -d '[:space:]')
if [ "$modelo" = FULL ]; then
    echo "Aviso: a base está em modo de recuperação FULL. Sem cópias do registo de transações o ficheiro de" >&2
    echo "       registo só cresce. Para as cópias completas do infra/backup.sh, o certo é SIMPLE:" >&2
    echo "       ALTER DATABASE [$BD] SET RECOVERY SIMPLE (ver docs/infraestrutura.md)." >&2
fi

echo "A religar o login da API à base restaurada (setup)..."
docker compose --profile setup run --rm setup

echo "Base $BD restaurada a partir de $FICHEIRO."
echo "Falta: docker compose up -d app caddy   e   infra/fumo.sh https://<dominio>"
