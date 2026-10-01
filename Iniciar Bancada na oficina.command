#!/bin/bash
# Iniciar Bancada na oficina: o mesmo que "Iniciar Bancada.command", mas deixa o
# tablet abrir a Bancada pelo Wi-Fi (ensaio na oficina, só com dados de
# demonstração). O guia do dia está em docs/ensaio-oficina.md.
#
# Duplo clique no Finder (macOS). Quem trata de tudo é o outro ficheiro: este só
# liga o modo oficina e passa-lhe a vez.

cd "$(dirname "$0")" || exit 1
BANCADA_REDE=1 exec bash "./Iniciar Bancada.command"
