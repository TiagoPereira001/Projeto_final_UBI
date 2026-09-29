#!/usr/bin/env bash
# Prova que uma cópia de segurança serve: descifra, restaura para uma base
# temporária, confirma a integridade e apaga a temporária.
# NÃO mexe na base de dados verdadeira. (PROPOSTA: ver docs/infraestrutura.md)
#
# Uso:  infra/restauro-teste.sh copias/diaria-XXXX.bak.gz.age /caminho/da/chave-privada.txt
#
# A chave privada do age vem de FORA do servidor (é a que guardaste quando
# geraste o par com age-keygen). Uma cópia que nunca foi restaurada não é uma
# cópia de segurança: correr isto uma vez por mês, com a cópia mais recente.
set -euo pipefail
cd "$(dirname "$0")/.."

FICHEIRO=${1:?Uso: infra/restauro-teste.sh <cópia.bak.gz.age> <chave-privada.txt>}
CHAVE=${2:?Falta o caminho da chave privada do age}
CONTENTOR=${CONTENTOR_BD:-bancada-db-1}
BD=${NOME_BD:-Bancada}
TEMP="${BD}_TesteRestauro"
DENTRO=/var/opt/mssql/backup/restauro-teste.bak

sql() {
    docker exec "$CONTENTOR" sh -c 'exec /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -h -1 -W -s "|" -Q "SET NOCOUNT ON; $1"' sh "$1"
}
limpar() {
    sql "IF DB_ID(N'$TEMP') IS NOT NULL BEGIN ALTER DATABASE [$TEMP] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$TEMP]; END" >/dev/null 2>&1 || true
    docker exec "$CONTENTOR" rm -f "$DENTRO" 2>/dev/null || true
}
trap limpar EXIT

docker exec "$CONTENTOR" mkdir -p /var/opt/mssql/backup
age -d -i "$CHAVE" "$FICHEIRO" | gunzip | docker exec -i "$CONTENTOR" sh -c "cat > $DENTRO" || {
    echo "Não consegui abrir a cópia: a chave privada não é a certa, ou o ficheiro está incompleto ou corrompido." >&2
    exit 1
}

sql "RESTORE VERIFYONLY FROM DISK = N'$DENTRO' WITH CHECKSUM" >/dev/null
sql "RESTORE DATABASE [$TEMP] FROM DISK = N'$DENTRO' WITH MOVE N'$BD' TO N'/var/opt/mssql/data/$TEMP.mdf', MOVE N'${BD}_log' TO N'/var/opt/mssql/data/${TEMP}_log.ldf', CHECKSUM, RECOVERY" >/dev/null
sql "DBCC CHECKDB ([$TEMP]) WITH NO_INFOMSGS" >/dev/null
echo "Integridade: o DBCC CHECKDB não encontrou erros."

# para um humano comparar com o que se espera (folhas, linhas, entrada mais recente)
echo "Conteúdo da cópia (folhas | linhas | folha mais recente):"
sql "SELECT (SELECT COUNT(*) FROM [$TEMP].dbo.Folha_Obra), (SELECT COUNT(*) FROM [$TEMP].dbo.Linha_Reparacao), (SELECT CONVERT(varchar(19), MAX(Data_Entrada), 120) FROM [$TEMP].dbo.Folha_Obra)"
echo "OK: a cópia restaura-se e está íntegra."
