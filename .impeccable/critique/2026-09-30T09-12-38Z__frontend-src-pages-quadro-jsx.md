---
target: review (Quadro da oficina e percurso do tablet)
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/user/Projeto_final_UBI/frontend/src/pages/Quadro.jsx"
target_fingerprint: "sha256:b4f34ad5ab13f8e2e36908ad69ffa8d45cf9428154489dc7103270a88cdf86ba"
target_path: /home/user/Projeto_final_UBI/frontend/src/pages/Quadro.jsx
timestamp: 2026-09-30T09-12-38Z
slug: frontend-src-pages-quadro-jsx
---
# Crítica de design: Quadro da oficina e percurso do tablet

Method: dual-agent (A: subagente de revisão de design · B: subagente de detetor e browser). 30/09/2026.

Alvo: `frontend/src/pages/Quadro.jsx`, com o percurso Entrar, Nova entrada, Folha e modo bancada com PIN. 70 capturas reais com dados fictícios (mais 20 extra), dois temas, 390, 1180 e 1440 px.

## Design Health Score

| # | Heurística | Nota | Problema principal |
|---|---|---|---|
| 1 | Visibilidade do estado | 3 | Sem rede, o Quadro fica igual ao normal. O bloqueio de 5 min e o do PIN não têm aviso nem contagem. |
| 2 | Correspondência com o mundo real | 3 | "Aberta" e "Entregue" são vocabulário do modelo. "Trabalho em curso" soma todas as folhas ativas. |
| 3 | Controlo e liberdade | 3 | "Entregue" fecha com um toque e só um gestor reabre. Notas por gravar perdem-se ao sair. |
| 4 | Consistência | 3 | A regra de um só âmbar quebra-se em seis ecrãs. |
| 5 | Prevenção de erros | 3 | Forte na entrada. Falha em "Entregue", sem confirmação. |
| 6 | Reconhecimento | 3 | A explicação dos estados está num `title`, que o toque não mostra. |
| 7 | Flexibilidade e eficiência | 2 | Cada peça escreve-se de raiz: sem sugestões nem preço da hora por omissão. |
| 8 | Estética e minimalismo | 3 | Ecrã de descanso 70% vazio, células do tablier 40 a 45% vazias, estado e tempo em 14 e 13 px. |
| 9 | Recuperar de erros | 3 | Toasts de erro somem em 3,2 s; o bloqueio do PIN não diz o passo seguinte. |
| 10 | Ajuda | 2 | Só ajuda em linha. |
| | **Total** | **28/40** | **Bom, no limite inferior da faixa** |

## Veredito de especificidade

LLM: feito para esta oficina só em quatro objetos (tablier, chapa de matrícula, teclado do PIN, linha de autoria). O resto (Histórico, Clientes, Veículos, Equipa, Definições, login) é competente e intercambiável. O carácter desperdiça-se no ecrã de descanso do tablet.

Deterministic: 0 achados na linha de comandos (29 `.jsx` e `index.html`, com controlo positivo). No browser, 4 regras em 14 páginas, todas falsos positivos (`cramped-padding` na chapa, `repeated-container-text` em texto só para leitores de ecrã, `text-overflow` deliberado em `topo__nome` a 390 px, `dark-glow` do próprio detetor). O detetor apanhou o que a revisão não disse: a 390 px o nome de quem trabalha fica cortado ao 9.º carácter e o DESIGN.md não o documenta. Sem aba [Human]: não há sobreposição visível para o utilizador.

## Impressão geral

Base forte e disciplinada. A maior oportunidade é fazer o tablier ser verdadeiro no tablet parado, visto de longe, e não só depois de um PIN.

## O que funciona

1. O tablier é a mesma peça no sistema todo (luzes que filtram, pictogramas no seletor da folha, cor nunca sozinha).
2. A chapa como identidade do trabalho, e como campo que impede duplicados.
3. Alvos medidos, contrastes de 4,6:1 a 8,2:1, confirmação no próprio botão, vista do mecânico sem a faixa de valores.

## Problemas prioritários

1. [P1] O tablier só existe depois de um PIN. Aos 5 min o tablet vai para `/bancada`, que só mostra nomes. Correção: ecrã de descanso com o tablier grande e só de leitura (contagens, sem dados pessoais), aviso de 30 s antes do bloqueio. Comando: `layout`.
2. [P1] "Entregue" fecha a folha com um toque, ao lado de "Pronta", sem confirmação; só um gestor reabre (409 para o mecânico). Correção: dois toques, afastar dos estados de trabalho, mostrar a `ajuda` de cada estado. Comando: `harden`.
3. [P2] O tablier não cumpre a distância que promete: símbolo 60 px, nome 16 px, número 24 px, com células vazias. Correção: em toque com 1024 px ou mais, símbolo 80, número 48, nome 20; validar a 1,5 m. Comando: `adapt`.
4. [P2] A regra de um só âmbar quebra-se em seis ecrãs e "Terminar" (contorno âmbar) compete com "Nova entrada"; o DESIGN.md (linhas 302 e 398) contradiz-se. Correção: secundários nos "Guardar", sai o segundo botão do Quadro vazio, "Terminar" neutro, teste de percurso. Comando: `quieter`.
5. [P2] O trabalho e a "verdade" degradam-se em silêncio: notas sem gravação automática, bloqueio sem aviso, Quadro sem sinal de dados velhos sem rede. Correção: gravar ao sair do campo e após 2 s, aviso de 30 s e regresso ao destino, tablier esbatido com "dados de há 2 min". Comando: `harden`.

## Red flags por persona

Alex: primeira peça abaixo da dobra (y=836 em 820), tudo escrito de raiz, ecrã extra para carro conhecido, PIN a meio do ritmo.
Casey: texto por gravar perde-se, Quadro congela sem rede, toast de erro de 3,2 s.
Sam: bloqueio sem aviso, toasts curtos, `role="radio"` sem setas, campos desativados sem estilo, sem `errorElement` (REL-001).
Nuno (mecânico de luvas): tablet parado não diz nada, números de 24 px, "Pronta" e "Entregue" a 8 px, teclado do PIN que se desloca.
Gestora ao computador: valores com e sem IVA misturados, "Trabalho em curso" soma todas as folhas ativas, "usar como bancada" termina a sessão sem o dizer.

## Observações menores

DESIGN.md desatualizado (10 px nos botões e campos nas linhas 374 e 393, contra 6 px no código). Dois nomes para o mesmo estado e três para o mesmo ecrã. Três grafias da mesma chapa. Teclado do PIN: reservar a altura do erro, mostrar a contagem do bloqueio. Carro parado há 10 dias sem sinal. Filtro do tablier perdido ao voltar da folha.

## Perguntas

Porque é que o ecrã mais visto é o que não diz nada? O que quer dizer "Entregue" para um mecânico? Se o âmbar é uma só voz, porque fala "Terminar" tão alto? Que aspeto tem a Bancada quando o Wi-Fi cai: mente ou avisa?
