#!/usr/bin/env bash
# Cópia de segurança da Bancada: completa, verificada, comprimida e cifrada.
# (PROPOSTA, ainda não está em uso: ver docs/infraestrutura.md)
#
# Uso:  infra/backup.sh [etiqueta]     (etiqueta: horaria, diaria, antes-do-deploy...)
#
# Precisa de: docker, gzip e age (https://github.com/FiloSottile/age).
# Definir no .env da raiz (ou no ambiente):
#   AGE_DESTINATARIO   a chave PÚBLICA do age (age1...). A chave privada fica FORA
#                      do servidor: quem entrar no servidor não consegue abrir as cópias
#   PING_URL           (opcional) endereço a chamar quando a cópia correu bem. Um
#                      serviço de "sinal de vida" avisa se ele deixar de ser chamado
#
# O que faz, por ordem, e pára à primeira falha:
#   1. BACKUP ... WITH CHECKSUM, dentro do container da base de dados
#   2. RESTORE VERIFYONLY ... WITH CHECKSUM (a cópia lê-se e as somas batem certo)
#   3. comprime e cifra a caminho do disco do servidor (o ficheiro sem cifra nunca
#      chega a existir fora do container, e é apagado de lá no fim)
#   4. apaga as cópias antigas
#   5. chama o PING_URL
# Copiar o resultado para FORA do servidor (outro fornecedor) é o passo seguinte:
# uma cópia que está no mesmo disco não protege de perder o servidor.
set -euo pipefail
cd "$(dirname "$0")/.."

de_env() { sed -n "s/^$1=//p" .env 2>/dev/null | head -n1 || true; }

CONTENTOR=${CONTENTOR_BD:-bancada-db-1}
BD=${NOME_BD:-Bancada}
ETIQUETA=${1:-manual}
PASTA=${PASTA_COPIAS:-copias}
AGE_DESTINATARIO=${AGE_DESTINATARIO:-$(de_env AGE_DESTINATARIO)}
PING_URL=${PING_URL:-$(de_env PING_URL)}
[ -n "$AGE_DESTINATARIO" ] || { echo "Falta AGE_DESTINATARIO (a chave pública do age)." >&2; exit 1; }

NOME="${ETIQUETA}-$(date -u +%Y%m%dT%H%M%SZ)"
DENTRO="/var/opt/mssql/backup/${NOME}.bak"
DESTINO="$PASTA/$NOME.bak.gz.age"
mkdir -p "$PASTA"

# o sqlcmd corre dentro do container e lê a password do ambiente dele: ela nunca
# aparece na linha de comandos do servidor
sql() {
    docker exec "$CONTENTOR" sh -c 'exec /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -Q "$1"' sh "$1"
}
limpar() {
    docker exec "$CONTENTOR" rm -f "$DENTRO" 2>/dev/null || true
    rm -f "$DESTINO.parcial"
}
trap limpar EXIT

docker exec "$CONTENTOR" mkdir -p /var/opt/mssql/backup
sql "BACKUP DATABASE [$BD] TO DISK = N'$DENTRO' WITH INIT, CHECKSUM" >/dev/null
sql "RESTORE VERIFYONLY FROM DISK = N'$DENTRO' WITH CHECKSUM" >/dev/null

docker exec "$CONTENTOR" cat "$DENTRO" | gzip -9 | age -r "$AGE_DESTINATARIO" > "$DESTINO.parcial"
mv "$DESTINO.parcial" "$DESTINO"
( cd "$PASTA" && sha256sum "$NOME.bak.gz.age" > "$NOME.sha256" )

# retenção: as horárias 2 dias, as diárias 30 dias, as de antes de publicar 90
find "$PASTA" -maxdepth 1 -name 'horaria-*'          -mtime +2  -delete
find "$PASTA" -maxdepth 1 -name 'diaria-*'           -mtime +30 -delete
find "$PASTA" -maxdepth 1 -name 'antes-do-deploy-*'  -mtime +90 -delete

# a cópia já está feita: se o serviço do sinal de vida não responder, só se avisa
# (o próprio serviço dá pela falta do sinal)
[ -z "$PING_URL" ] || curl -fsS -m 10 --retry 3 -o /dev/null "$PING_URL" \
    || echo "Aviso: a cópia está feita, mas não consegui chamar o PING_URL." >&2

echo "OK: $DESTINO ($(du -h "$DESTINO" | cut -f1))"
