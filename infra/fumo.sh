#!/usr/bin/env bash
# Teste de fumo: a Bancada publicada responde e está bem configurada.
# (PROPOSTA: ver docs/infraestrutura.md)
#
# Uso:  infra/fumo.sh https://bancada.exemplo.pt
#       CACERT=/caminho/root.crt infra/fumo.sh https://localhost   (só em testes,
#       com o certificado de uma autoridade local; nunca se desliga a verificação)
#
# Sai com erro à primeira verificação que falhar, e diz qual foi.
set -euo pipefail

URL=${1:?Uso: infra/fumo.sh https://o-teu-dominio}
URL=${URL%/}

c() { curl -sS -m 10 ${CACERT:+--cacert "$CACERT"} "$@"; }
falha() { echo "FALHOU: $1" >&2; exit 1; }

# 1) a API responde e consegue falar com a base de dados
c "$URL/api/saude" | grep -q '"estado":"ok"' || falha "/api/saude não devolveu estado ok"

# 2) HTTPS com os cabeçalhos de segurança da API
cabecalhos=$(c -I "$URL/")
echo "$cabecalhos" | grep -qi '^strict-transport-security:' || falha "falta o cabeçalho Strict-Transport-Security"
echo "$cabecalhos" | grep -qi '^content-security-policy:' || falha "falta o cabeçalho Content-Security-Policy"

# 3) a proteção contra pedidos vindos de outros sites (CSRF) está a funcionar...
codigo=$(c -o /dev/null -w '%{http_code}' -X POST "$URL/api/auth/entrar" \
    -H 'Content-Type: application/json' -H 'Origin: https://outro-site.exemplo' -d '{}')
[ "$codigo" = 403 ] || falha "um pedido de outra origem devia dar 403 e deu $codigo"

# 4) ...e a origem certa é aceite. 401 (conta que não existe) prova que o pedido
# passou a verificação da origem; 403 aqui quer dizer que o APP_ORIGINS está errado
codigo=$(c -o /dev/null -w '%{http_code}' -X POST "$URL/api/auth/entrar" \
    -H 'Content-Type: application/json' -H "Origin: $URL" \
    -d '{"email":"fumo@teste.invalido","password":"nao-existe"}')
[ "$codigo" = 401 ] || falha "um pedido da origem certa devia dar 401 e deu $codigo (o APP_ORIGINS está certo?)"

echo "OK: $URL responde, com HTTPS, cabeçalhos e proteção de origem."
