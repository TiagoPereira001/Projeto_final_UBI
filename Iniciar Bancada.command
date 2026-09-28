#!/bin/bash
# Iniciar Bancada: põe a Bancada a funcionar para testes com um duplo clique
# no Finder (macOS). Só precisa do Docker Desktop: a base de dados, a API e a
# interface correm em containers (docker compose --profile app), por isso não
# é preciso instalar o Node.js nem escrever comandos.
#
# O que faz, por esta ordem:
#   1. abre o Docker Desktop, se estiver fechado, e espera que arranque;
#   2. cria o .env com passwords aleatórias, se ainda não existir;
#   3. constrói e arranca a Bancada (da primeira vez demora vários minutos);
#   4. cria os dados de demonstração (fictícios) e mostra como entrar;
#   5. abre o browser em http://localhost:3000.
# Para parar: Enter nesta janela, Ctrl + C, ou fechar a janela.
#
# Também corre no Linux (aí o Docker tem de estar a correr antes).
# Escrito para o bash 3.2, que é o que vem com o macOS.

cd "$(dirname "$0")" || exit 1

ENDERECO="http://localhost:3000"
SISTEMA=$(uname)

# o Docker Desktop pode instalar o comando docker em sítios que o Terminal
# não conhece (sobretudo se nunca foi aberto com permissões de administrador)
PATH="$PATH:/usr/local/bin:/opt/homebrew/bin:$HOME/.docker/bin:/Applications/Docker.app/Contents/Resources/bin"
export PATH

if [ -t 1 ]; then
    NEGRITO=$'\033[1m'
    AMBAR=$'\033[38;5;214m'
    VERDE=$'\033[32m'
    VERMELHO=$'\033[31m'
    FIM=$'\033[0m'
else
    NEGRITO='' AMBAR='' VERDE='' VERMELHO='' FIM=''
fi

passo() { printf '\n%s%s%s\n' "$AMBAR$NEGRITO" "$1" "$FIM"; }
info() { printf '  %s\n' "$1"; }
ok() { printf '  %s%s%s\n' "$VERDE" "$1" "$FIM"; }

# mostra o erro e espera por Enter: sem isto, a janela podia fechar antes de
# se conseguir ler o que correu mal
falhar() {
    printf '\n%s%s%s\n' "$VERMELHO$NEGRITO" "$1" "$FIM"
    shift
    for linha in "$@"; do printf '  %s\n' "$linha"; done
    printf '\nCarrega em Enter para fechar esta janela.'
    read -r _
    exit 1
}

abrir() {
    if [ "$SISTEMA" = Darwin ]; then
        open "$1"
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$1" >/dev/null 2>&1
    fi
}

compose() { docker compose --profile app "$@"; }

printf '\033]0;Bancada\007'
printf '\n%sBANCADA%s  versão de testes, com dados de demonstração fictícios\n' "$AMBAR$NEGRITO" "$FIM"

# ---------------------------------------------------------------------------
passo "1/5  Docker"
if ! command -v docker >/dev/null 2>&1; then
    [ "$SISTEMA" = Darwin ] && open "https://www.docker.com/products/docker-desktop/"
    falhar "Não encontrei o Docker Desktop." \
        "Instala-o (abri a página para o descarregares), abre-o uma vez" \
        "e depois abre outra vez este ficheiro. O guia está no README, passo 1."
fi

if ! docker info >/dev/null 2>&1; then
    if [ "$SISTEMA" = Darwin ]; then
        info "A abrir o Docker Desktop..."
        open -a Docker 2>/dev/null || falhar "Não consegui abrir o Docker Desktop." \
            "Abre-o à mão (pasta Aplicações) e depois abre outra vez este ficheiro."
    fi
    info "À espera que o Docker arranque. Se pedir para aceitar os termos, aceita."
    printf '  '
    tentativas=0
    until docker info >/dev/null 2>&1; do
        tentativas=$((tentativas + 1))
        if [ "$tentativas" -gt 90 ]; then
            echo
            falhar "O Docker não arrancou em 3 minutos." \
                "Abre o Docker Desktop, espera que diga «Engine running»" \
                "e depois abre outra vez este ficheiro."
        fi
        printf '.'
        sleep 2
    done
    echo
fi
docker compose version >/dev/null 2>&1 || falhar "Falta o docker compose." \
    "Atualiza o Docker Desktop para uma versão recente e tenta outra vez."
ok "O Docker está a correr."

# daqui para a frente, se a janela fechar ou se carregar em Ctrl + C, a Bancada
# é parada antes de sair
PARADO=0
parar() {
    [ "$PARADO" = 1 ] && return
    PARADO=1
    printf '\nA parar a Bancada...\n'
    compose stop >/dev/null 2>&1
    printf 'Parei. Os dados ficam guardados para a próxima vez.\n'
}
trap 'parar; exit 0' INT TERM
# ao fechar a janela já não há onde escrever: para sem mostrar nada
trap 'trap "" HUP; parar >/dev/null 2>&1; exit 0' HUP

# ---------------------------------------------------------------------------
passo "2/5  Configuração"

# corre o script do projeto num container com o Node, que é o mesmo que a
# aplicação vai usar: assim não é preciso ter o Node.js instalado
criar_env() {
    docker run --rm --user "$(id -u):$(id -g)" -v "$PWD:/bancada" -w /bancada \
        node:22-bookworm-slim node backend/scripts/criar-env.js
}

# um .env de uma versão antiga do projeto pode não ter estas variáveis
env_completo() {
    grep -Eq '^DB_ADMIN_PASSWORD=[^[:space:]]' .env && grep -Eq '^DB_PASSWORD=[^[:space:]]' .env \
        && grep -Eq '^JWT_SECRET=[^[:space:]]{32,}' .env
}

if [ -f .env ] && ! env_completo; then
    antigo=".env.antigo-$(date +%Y%m%d%H%M%S)"
    mv .env "$antigo"
    info "O .env desta pasta não tinha tudo o que a Bancada precisa. Guardei-o como $antigo."
fi
if [ -f .env ]; then
    ok "Já existe um .env nesta pasta: uso esse."
else
    info "A criar o .env com passwords aleatórias, só para este computador..."
    criar_env || falhar "Não consegui criar o .env." "Vê a mensagem acima."
fi

# ---------------------------------------------------------------------------
passo "3/5  Arrancar a Bancada"

# containers com o mesmo nome, mas de outra cópia do projeto (ou da primeira
# versão, que se chamava dr_oficina_sql), ocupam o nome ou a porta. Tirá-los
# não apaga dados: esses ficam nos volumes do Docker
aqui=$(pwd -P)
for nome in bancada_sql bancada_app dr_oficina_sql; do
    docker container inspect "$nome" >/dev/null 2>&1 || continue
    pasta=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' "$nome" 2>/dev/null)
    if [ -n "$pasta" ] && [ -d "$pasta" ]; then pasta=$(cd "$pasta" && pwd -P); fi
    if [ "$nome" = dr_oficina_sql ] || [ "$pasta" != "$aqui" ]; then
        info "A tirar o container $nome, de outra cópia ou de uma versão antiga do projeto..."
        docker rm -f "$nome" >/dev/null
    fi
done

# espera que o SQL Server fique pronto. Devolve 0 (pronto), 2 (a password do
# .env não é a do primeiro arranque), 3 (a password do .env é fraca demais) ou
# 1 (outro problema). Os registos dizem-no em segundos; a verificação de saúde
# do docker compose só o diria ao fim de mais de dois minutos
esperar_bd() {
    printf '  A arrancar o SQL Server'
    tentativas=0
    while :; do
        registo=$(docker logs --tail 300 bancada_sql 2>&1)
        case "$registo" in
            *"Password did not match"*) echo; return 2 ;;
            *"Password validation failed"*) echo; return 3 ;;
        esac
        saude=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' bancada_sql 2>/dev/null)
        reinicios=$(docker inspect -f '{{.RestartCount}}' bancada_sql 2>/dev/null || echo 0)
        if [ "$saude" = healthy ]; then echo; return 0; fi
        tentativas=$((tentativas + 1))
        if [ "$saude" = unhealthy ] || [ "${reinicios:-0}" -gt 2 ] || [ "$tentativas" -gt 120 ]; then
            echo
            return 1
        fi
        printf '.'
        sleep 2
    done
}

arrancar() {
    info "Da primeira vez demora vários minutos: descarrega o SQL Server e prepara a aplicação."
    compose up -d db || return 1
    esperar_bd || return $?
    compose up -d --build
}

# o SQL Server guarda a password do administrador no primeiro arranque. Se a
# base de dados já existia com outra password, ou se a do .env é fraca demais,
# a única saída é criar uma base de dados de testes nova
recomecar() {
    printf '\n%s%s%s\n' "$AMBAR$NEGRITO" "$1" "$FIM"
    info "Para continuar, apago a base de dados de testes do Docker e crio outra."
    info "Os dados de teste que lá estavam perdem-se."
    printf '  Escreve APAGAR e carrega em Enter para continuar (ou fecha esta janela): '
    read -r resposta
    resposta=$(printf '%s' "$resposta" | tr '[:lower:]' '[:upper:]')
    [ "$resposta" = APAGAR ] || falhar "Não apaguei nada." "Abre outra vez este ficheiro quando quiseres continuar."
    compose down -v
    arrancar || falhar "A Bancada não arrancou." "Vê a mensagem acima."
}

arrancar
case $? in
    0) ;;
    2)
        recomecar "A base de dados de testes foi criada antes com outra password (por exemplo, por uma versão antiga do projeto)."
        ;;
    3)
        # a password fraca veio do .env: guarda-o à parte e cria outro. Com ela
        # o SQL Server nunca chegou a arrancar, por isso não há dados a perder
        fraco=".env.fraco-$(date +%Y%m%d%H%M%S)"
        mv .env "$fraco"
        criar_env >/dev/null || falhar "Não consegui criar um .env novo."
        info "A password do SQL Server no .env era fraca demais. Guardei-o como $fraco"
        info "e criei um novo. A arrancar outra vez..."
        compose down -v >/dev/null 2>&1
        arrancar || falhar "A Bancada não arrancou." "Vê a mensagem acima."
        ;;
    *)
        docker logs --tail 15 bancada_sql 2>&1 | sed 's/^/    /'
        dicas="Vê as mensagens acima. Se falam em «port is already allocated» ou «ports are not available», há outro programa a usar a porta 1433 ou 3000."
        [ "$(uname -m)" = arm64 ] && dicas="$dicas No Docker Desktop, confirma também que o Rosetta está ligado (Settings, General)."
        falhar "A Bancada não arrancou." "$dicas"
        ;;
esac

# ---------------------------------------------------------------------------
passo "4/5  Dados de demonstração"

esperar_api() {
    info "À espera da API..."
    tentativas=0
    until curl -fs "$ENDERECO/api/saude" >/dev/null 2>&1; do
        tentativas=$((tentativas + 1))
        reinicios=$(docker inspect -f '{{.RestartCount}}' bancada_app 2>/dev/null || echo 0)
        if [ "$tentativas" -gt 90 ] || [ "${reinicios:-0}" -gt 2 ]; then
            docker logs --tail 25 bancada_app
            falhar "A API não arrancou." "As últimas linhas do registo estão acima."
        fi
        sleep 2
    done
}
esperar_api

saida=$(docker exec bancada_app node backend/scripts/seed.js 2>&1)
case "$saida" in
    *"Guarda estes dados"*) novos=1 ;;
    *"Já existe uma conta"*) novos=0 ;;
    *) printf '%s\n' "$saida"; falhar "Não consegui criar os dados de demonstração." "Vê a mensagem acima." ;;
esac

if [ "$novos" = 0 ]; then
    email=$(printf '%s\n' "$saida" | sed -n 's/^Já existe uma conta \([^ ]*\)\. .*/\1/p')
    ok "Os dados de demonstração já existem."
    info "Entra com o email ${email:-do gestor} e a password que apareceu da primeira vez."
    info "Não a tens? Escreve N e carrega em Enter para criar dados novos, com uma"
    info "password nova (os dados de teste atuais perdem-se). Para continuar com"
    info "os que tens, carrega só em Enter (ou espera 20 segundos)."
    printf '  > '
    resposta=''
    read -r -t 20 resposta
    echo
    if [ "$resposta" = N ] || [ "$resposta" = n ]; then
        info "A criar dados novos..."
        docker exec bancada_app node backend/scripts/db-setup.js --reset >/dev/null 2>&1 \
            || falhar "Não consegui apagar os dados de teste."
        saida=$(docker exec bancada_app node backend/scripts/seed.js 2>&1)
        case "$saida" in
            *"Guarda estes dados"*) ;;
            *) printf '%s\n' "$saida"; falhar "Não consegui criar os dados de demonstração." "Vê a mensagem acima." ;;
        esac
        # a API volta a ligar-se à base de dados que acabou de ser criada
        docker restart bancada_app >/dev/null
        esperar_api
        novos=1
    fi
fi

# ---------------------------------------------------------------------------
passo "5/5  Pronto"
printf '\n  A Bancada está a correr em %s%s%s\n' "$NEGRITO" "$ENDERECO" "$FIM"
if [ "$novos" = 1 ]; then
    printf '%s\n' "$saida" | sed -e '/^$/d' -e 's/^/  /'
    info "(São dados fictícios, só deste computador. Esta janela é o único sítio onde aparecem.)"
fi
abrir "$ENDERECO"
printf '\n  Para parar a Bancada: carrega em Enter nesta janela (ou fecha-a).\n'
# só um Enter sozinho para a Bancada: um N escrito tarde de mais, depois dos
# 20 segundos da pergunta, não a desliga por engano
while read -r linha; do
    [ -z "$linha" ] && break
done
parar
