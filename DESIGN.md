---
name: Bancada
description: Folhas de obra digitais para oficinas, pensadas para um tablet partilhado no chão da oficina.
colors:
  ambar: "#f0a43a"
  ambar-hover: "#f5b457"
  ambar-premido: "#e0922a"
  ambar-tinta: "#1b1407"
  painel: "#0f1012"
  painel-2: "#1a1c1f"
  painel-linha: "#2a2d31"
  painel-aro: "#5a6068"
  painel-tinta: "#e7e9e4"
  painel-tinta-2: "#9aa0a6"
  luz-aberta: "#5b9bff"
  luz-em-curso: "#f0a43a"
  luz-aguarda: "#ff5a55"
  luz-pronta: "#3ecf74"
  luz-apagada: "#3a3e44"
  chapa: "#f6f6f2"
  chapa-tinta: "#101114"
  chapa-faixa: "#1d48a8"
  chapa-estrelas: "#ffd84a"
  fundo: "#eceef0"
  superficie: "#f8f9fa"
  superficie-2: "#fcfcfd"
  realce: "#e3e6e9"
  linha: "#d3d7db"
  linha-forte: "#848b93"
  tinta: "#15171a"
  tinta-2: "#4a5058"
  tinta-3: "#5f6670"
  foco: "#a35a00"
  erro: "#b42318"
  erro-fundo: "#fdecea"
  sucesso: "#17773f"
  sucesso-fundo: "#e6f4ec"
  estado-aberta: "#2563eb"
  estado-em-curso: "#c77a0a"
  estado-aguarda: "#d92d20"
  estado-pronta: "#18a04a"
  estado-entregue: "#848b93"
  fundo-escuro: "#16181b"
  superficie-escuro: "#1d2024"
  superficie-2-escuro: "#24282d"
  realce-escuro: "#2c3036"
  linha-escuro: "#33373e"
  linha-forte-escuro: "#6b727b"
  tinta-escuro: "#eef0ec"
  tinta-2-escuro: "#b3b8be"
  tinta-3-escuro: "#8f969e"
  foco-escuro: "#f0a43a"
  erro-escuro: "#ff8f85"
  erro-fundo-escuro: "#3a1a18"
  sucesso-escuro: "#6fdc98"
  sucesso-fundo-escuro: "#13301f"
  estado-aberta-escuro: "#5b9bff"
  estado-em-curso-escuro: "#f0a43a"
  estado-aguarda-escuro: "#ff5a55"
  estado-pronta-escuro: "#3ecf74"
  estado-entregue-escuro: "#6b727b"
typography:
  display:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "0.005em"
  headline:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "0.005em"
  title:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.15
  body:
    fontFamily: "Barlow, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-tablet:
    fontFamily: "Barlow, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Barlow, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.3
  caption:
    fontFamily: "Barlow, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.3
  readout:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "tnum"
  plate:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.06em"
    fontFeature: "tnum"
  wordmark:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.06em"
rounded:
  chip: "6px"
  controlo: "10px"
  painel: "14px"
  chapa: "5px"
  chapa-grande: "7px"
spacing:
  e-1: "4px"
  e-2: "8px"
  e-3: "12px"
  e-4: "16px"
  e-5: "20px"
  e-6: "24px"
  e-8: "32px"
  e-10: "40px"
  e-12: "48px"
components:
  button-primary:
    backgroundColor: "{colors.ambar}"
    textColor: "{colors.ambar-tinta}"
    typography: "{typography.label}"
    rounded: "{rounded.controlo}"
    padding: "0 20px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.ambar-hover}"
  button-primary-active:
    backgroundColor: "{colors.ambar-premido}"
  button-primary-large:
    backgroundColor: "{colors.ambar}"
    textColor: "{colors.ambar-tinta}"
    rounded: "{rounded.controlo}"
    padding: "0 24px"
    height: "56px"
  button-secondary:
    backgroundColor: "{colors.superficie-2}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.controlo}"
    padding: "0 20px"
    height: "48px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.tinta-2}"
    rounded: "{rounded.controlo}"
    padding: "0 20px"
    height: "48px"
  button-ghost-hover:
    backgroundColor: "{colors.realce}"
    textColor: "{colors.tinta}"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.erro}"
    rounded: "{rounded.controlo}"
    height: "48px"
  button-danger-confirm:
    backgroundColor: "{colors.erro}"
    textColor: "{colors.superficie}"
  input:
    backgroundColor: "{colors.superficie-2}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.controlo}"
    padding: "0 14px"
    height: "48px"
  input-large:
    height: "56px"
  top-bar:
    backgroundColor: "{colors.painel}"
    textColor: "{colors.painel-tinta}"
    height: "64px"
  tab:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta-2}"
    typography: "{typography.label}"
    padding: "0 16px"
    height: "52px"
  tab-active:
    textColor: "{colors.tinta}"
  tablier:
    backgroundColor: "{colors.painel}"
    rounded: "{rounded.painel}"
  tablier-lamp:
    textColor: "{colors.painel-tinta-2}"
    padding: "16px 20px"
    height: "112px"
  tablier-lamp-lit:
    textColor: "{colors.painel-tinta}"
  tablier-symbol:
    textColor: "{colors.luz-apagada}"
    size: "60px"
  panel:
    backgroundColor: "{colors.superficie}"
    rounded: "{rounded.painel}"
  plate:
    backgroundColor: "{colors.chapa}"
    textColor: "{colors.chapa-tinta}"
    typography: "{typography.plate}"
    rounded: "{rounded.chapa}"
    height: "30px"
    width: "124px"
  plate-large:
    backgroundColor: "{colors.chapa}"
    textColor: "{colors.chapa-tinta}"
    rounded: "{rounded.chapa-grande}"
    height: "50px"
    width: "212px"
  plate-band:
    backgroundColor: "{colors.chapa-faixa}"
    width: "9px"
  state-lamp:
    size: "10px"
  pin-key:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.painel}"
    height: "72px"
  pin-key-enter:
    backgroundColor: "{colors.ambar}"
    textColor: "{colors.ambar-tinta}"
    rounded: "{rounded.painel}"
    height: "72px"
---

# Design System: Bancada

> Os títulos das secções ficam em inglês porque seguem o formato DESIGN.md (as ferramentas que o leem dependem deles). O resto está em português, como a aplicação. Os valores normativos estão no bloco YAML acima e em `frontend/src/styles/tokens.css`, que é a fonte de verdade no código. Os temas claro e escuro partilham os nomes; as variantes escuras têm o sufixo `-escuro` no YAML.

## Overview

**Creative North Star: "O Tablier da Oficina"**

A Bancada é desenhada como o painel de instrumentos de um carro. Há uma parte que é sempre escura (a barra de topo, o tablier com as luzes de aviso, o painel da entrada) e uma superfície de trabalho que segue o tema do dispositivo: clara ao sol da oficina, escura à noite. As luzes são o sinal principal. Num relance, a meio de uma reparação e a um ou dois metros do tablet, o mecânico vê quantos carros estão abertos, em curso, à espera de peças ou prontos, tal como se vê uma luz de aviso acesa sem ler nada.

É uma ferramenta de trabalho e não um produto de marketing. A densidade é média: alvos grandes para dedos sujos ou com luvas, texto de leitura entre 16 e 18 px, números sempre tabulares. A identidade vem de objetos reais da oficina e não de decoração: as luzes do tablier, a chapa de matrícula branca com a faixa azul europeia e a letra Barlow, que nasceu da sinalética e das matrículas. O âmbar é a cor de ação, a mesma "luz indicadora" que já existia no login original do projeto.

O que foi rejeitado de forma explícita: o quadro kanban genérico de colunas, o dashboard de métricas com números gigantes, as lentes e os aros à volta das luzes (fazem-nas parecer botões de uma app e não lâmpadas) e as janelas modais para confirmar.

**Key Characteristics:**
- Painel de instrumentos sempre escuro por cima de uma superfície de trabalho clara ou escura.
- Luzes de aviso desenhadas de propósito (carro, chave de bocas, pistão, bandeira de xadrez, chave), acesas quando há veículos nesse estado.
- Matrículas desenhadas como chapas: brancas nos dois temas, com a faixa azul europeia.
- Um só acento: âmbar para a ação principal, o separador ativo e o filtro ativo.
- Plano, sem sombras de profundidade: camadas tonais e linhas de 1 px.
- Alvos de toque de 48 px no mínimo, 56 px nas ações principais e 72 px no teclado do PIN.

## Colors

Grafite quase preto no painel, cinzentos frios na superfície de trabalho, âmbar como único acento de ação e as quatro cores das luzes de aviso, que só brilham no painel escuro.

### Primary
- **Âmbar Luz Indicadora** (`ambar`): a ação principal de cada ecrã (Nova entrada, Entrar, Guardar), a barra do separador ativo, a barra do filtro ativo no tablier e o contorno de foco sobre o painel escuro. O texto por cima é quase preto (`ambar-tinta`) e nunca branco. Ao passar o rato fica mais claro (`ambar-hover`) e ao premir mais escuro (`ambar-premido`).

### Secondary
- **Luzes de aviso** (`luz-aberta` azul, `luz-em-curso` âmbar, `luz-aguarda` vermelho, `luz-pronta` verde, `luz-apagada` cinzento de lâmpada apagada): só existem no painel escuro. Uma luz acesa quer dizer "há veículos neste estado". A luz apagada é quase da cor do painel, para se perceber que existe sem chamar a atenção.

### Tertiary
- **Chapa de matrícula** (`chapa`, `chapa-tinta`, `chapa-faixa`, `chapa-estrelas`): um objeto físico. É branca, com letras pretas, nos dois temas. A faixa é o azul europeu e as estrelas, na chapa grande, são amarelas.

### Neutral
- **Grafite do Painel** (`painel`, `painel-2`, `painel-linha`, `painel-aro`, `painel-tinta`, `painel-tinta-2`): barra de topo, tablier, painel da entrada e faixa de topo do tablet partilhado. Igual nos dois temas.
- **Cinzento Oficina** (`fundo`, `superficie`, `superficie-2`, `realce`): fundo da página, painéis, campos e o realce de linhas premidas. No tema escuro passam para as variantes `-escuro`, sempre mais claras do que o painel para que o tablier se distinga do resto.
- **Linhas** (`linha`, `linha-forte`): divisórias de 1 px e contornos de campos. `linha-forte` é o contorno dos campos, que tem de passar os 3:1.
- **Tinta** (`tinta`, `tinta-2`, `tinta-3`): texto principal, secundário e de apoio. Todos passam os 4,5:1 sobre `fundo` e `superficie` nos dois temas.
- **Estados nas listas** (`estado-aberta`, `estado-em-curso`, `estado-aguarda`, `estado-pronta`, `estado-entregue`): a pequena luz sólida ao lado do nome do estado. No tema claro são mais escuros do que as luzes do painel, para terem contraste sobre fundo claro.
- **Mensagens** (`erro`, `erro-fundo`, `sucesso`, `sucesso-fundo`, `foco`): erros de formulário, avisos de sucesso e o anel de foco sobre a superfície de trabalho (`foco` é um âmbar escurecido no tema claro).

### Named Rules
**A Regra da Voz Única.** O âmbar é a única cor de ação. Se um ecrã tiver dois botões âmbar, um deles está errado.

**A Regra das Luzes no Painel.** As cores `luz-*` só aparecem sobre o grafite do painel. Na superfície de trabalho o estado usa as cores `estado-*` (a luz sólida de 10 px nas listas, o pictograma no seletor da folha) e vem sempre com o nome, porque a cor nunca pode ser a única pista.

**A Regra da Chapa Branca.** A matrícula é branca em qualquer tema. Não se inverte, não se tinge, não se põe transparente.

## Typography

**Display Font:** Barlow Condensed (com Barlow e system-ui como alternativas)
**Body Font:** Barlow (com system-ui, -apple-system e Segoe UI como alternativas)

**Character:** Barlow é uma letra de sinalética, inspirada nas placas e matrículas da Califórnia. A versão condensada dá aos títulos, às chapas e aos números o ar de uma etiqueta de oficina, e a normal lê-se bem em corpo pequeno num tablet. As duas vêm da própria aplicação (woff2, só latin e latin-ext), sem pedidos a terceiros.

### Hierarchy
- **Display** (600, 2.25rem, 1.15): o título dos ecrãs de entrada ("Entrar", "Quem vai trabalhar?"). No tablet partilhado pode ir até 2.75rem.
- **Headline** (600, 1.75rem, 1.15): o título de cada página (Histórico, Clientes, Folha nº 3).
- **Title** (600, 1.375rem, 1.15): o título dos painéis ("Na oficina", "Linhas").
- **Body** (400, 1rem, 1.5): texto corrente, queixas, observações. Nos campos sobe para 1.0625rem, para o iPad não fazer zoom ao tocar.
- **Body tablet** (400, 1.125rem, 1.5): textos de apoio lidos à distância (instruções da bancada, dicas).
- **Label** (600, 0.875rem): etiquetas de campos, nomes de estados, botões compactos.
- **Caption** (500, 0.8125rem): metadados das linhas (nº da folha, há quanto tempo).
- **Readout** (Barlow Condensed 600, 1.625rem, 1, algarismos tabulares): o número de veículos por baixo de cada luz do tablier.
- **Plate** (Barlow Condensed 600, 1.1875rem, espaçamento 0.06em, algarismos tabulares): o texto da chapa. A chapa grande usa 2rem e o campo de matrícula da nova entrada usa 3rem.

### Named Rules
**A Regra da Sinalética.** Barlow Condensed nos títulos, nas chapas e nas leituras. Barlow no texto que se lê. Não entra uma terceira família.

**A Regra dos Números Alinhados.** Valores em euros, quantidades, horas e quilómetros usam sempre algarismos tabulares (a classe `.num`), para as colunas alinharem.

## Layout

A aplicação tem uma coluna central com largura máxima de 1280 px e margens de 24 px (16 px em ecrãs estreitos). Por cima fica a barra de topo, com 64 px, e os separadores, com 52 px. Os dois ficam colados ao topo quando se faz scroll. O espaçamento segue uma base de 4 px (`e-1` a `e-12`) e os painéis separam-se entre si por 20 px.

O ecrã principal segue sempre a mesma ordem: o tablier com as quatro luzes, depois a pesquisa com o botão âmbar "Nova entrada" à direita e por fim a lista dos veículos na oficina, dos mais antigos para os mais recentes. Cada linha mostra a chapa, o veículo com o cliente, a queixa e o estado com o tempo na oficina.

Pontos de quebra usados:
- **1024 px**: as linhas do quadro deixam de ter quatro colunas. A chapa fica à esquerda e o estado à direita, com o veículo e a queixa empilhados ao meio.
- **980 px**: a folha de obra passa a uma coluna (as linhas primeiro, o estado e as notas por baixo).
- **860 px**: as linhas do histórico reorganizam-se em duas filas e os ecrãs de entrada perdem o painel lateral, que passa para cima.
- **760 px**: o tablier passa para uma grelha 2×2, com símbolos de 44 px, e a margem do conteúdo desce para 16 px.
- **600 px**: telemóvel. As linhas das listas empilham-se e as tabelas mostram a quantidade e o preço por baixo da designação.

O dispositivo de referência é um tablet na horizontal (1180 × 820), a um ou dois metros do mecânico. O computador do gestor e o telemóvel também são suportados.

## Elevation & Depth

O sistema é plano. A profundidade vem das camadas tonais (fundo, superfície, superfície 2, realce) e de linhas de 1 px, nunca de sombras. Os cartões e os painéis assentam na página sem sombra. O único elemento que flutua é o aviso temporário ("Guardado", "Linha removida"), que usa `--sombra-flutuante`.

A luz de uma lâmpada acesa não conta como elevação. É emissão: `drop-shadow(0 0 6px)` na cor da luz, a 55%, aplicado só ao símbolo aceso.

### Shadow Vocabulary
- **Sombra flutuante** (`box-shadow: 0 12px 32px -8px hsl(220 15% 20% / 0.28), 0 2px 6px hsl(220 15% 20% / 0.12)`, mais forte no tema escuro): só para os avisos temporários que flutuam sobre o conteúdo.
- **Emissão da luz** (`filter: drop-shadow(0 0 6px color-mix(in srgb, <cor da luz> 55%, transparent))`): só nos símbolos acesos do tablier e do painel de entrada.
- **Anel de foco dos campos** (`box-shadow: 0 0 0 3px color-mix(in srgb, var(--foco) 28%, transparent)`): o campo com foco, junto com o contorno em `foco`.

### Named Rules
**A Regra do Plano.** Superfícies planas em repouso. Se um cartão precisa de sombra para se distinguir, falta-lhe uma linha ou um tom.

**A Regra da Lâmpada.** As luzes do tablier não têm aro, lente, gradiente nem sombra interior. São o próprio símbolo desenhado no grafite, apagado ou aceso.

## Shapes

Há três raios em toda a aplicação. `chip` (6 px) para etiquetas pequenas, `controlo` (10 px) para botões e campos e `painel` (14 px) para painéis, o tablier e as teclas do PIN. As chapas de matrícula têm os seus próprios cantos, mais apertados (5 px na normal, 7 px na grande e 10 px no campo da nova entrada), porque imitam um objeto físico.

As bordas são sempre de 1 px (`linha` na superfície, `painel-linha` no painel). A barra do separador ativo e a do filtro ativo são iguais: 3 px de âmbar com os cantos de cima arredondados, encostadas ao fundo do elemento. As luzes de estado são círculos perfeitos. Entregue é o único estado que aparece como um anel vazio, porque a folha já saiu da oficina.

Os pictogramas das luzes estão numa grelha de 32 × 32 e usam formas cheias com furos pela regra "nonzero" (formas no sentido dos ponteiros do relógio, furos no sentido contrário), como as luzes de aviso reais.

## Components

### Buttons
- **Shape:** cantos suaves (10 px). 48 px de altura, 56 px no tamanho grande.
- **Primary:** fundo âmbar e texto quase preto, em peso 600. Uma por ecrã. Pode levar a "luz indicadora" de 10 px à esquerda, que pisca enquanto espera pela API, fica verde se correu bem e vermelha se falhou.
- **Hover / Focus:** o hover só existe em dispositivos com rato (`@media (hover: hover)`). Premir desce o botão 1 px. O foco é um contorno de 2 px em `foco`, afastado 2 px.
- **Secondary / Ghost:** o secundário tem fundo `superficie-2` e contorno `linha`. O fantasma não tem fundo e o texto é `tinta-2`. É o fantasma que se usa em ações repetidas numa lista, como remover uma linha.
- **Danger:** em repouso é neutro ou tem o texto a vermelho sem fundo. O primeiro toque transforma o botão na pergunta ("Remover?", "Arquivar mesmo?") com fundo vermelho cheio. O segundo toque executa. Passados 4 s sem resposta volta ao estado inicial. Não há janelas modais.

### Chips
- **Etiquetas** (`chip`, 6 px): fundo `realce`, texto `tinta-2` em 0.8125rem e peso 600, 24 px de altura. Só informam (por exemplo "Tu", "PIN" ou "Arquivado") e não se tocam.
- **Segmentos:** escolhas curtas lado a lado (tipo de veículo, categoria da linha). A opção escolhida fica com contorno âmbar e fundo âmbar a 20%.

### Cards / Containers
- **Corner Style:** 14 px.
- **Background:** `superficie`, sobre o `fundo` da página.
- **Shadow Strategy:** nenhuma (ver A Regra do Plano).
- **Border:** 1 px `linha`. O cabeçalho do painel separa-se do corpo por outra linha.
- **Internal Padding:** 16 × 20 px no cabeçalho e 20 px no corpo. As linhas das listas têm pelo menos 80 px de altura no quadro.

### Inputs / Fields
- **Style:** fundo `superficie-2`, contorno de 1 px em `linha-forte`, cantos de 10 px, 48 px de altura (56 px na pesquisa do quadro). A etiqueta fica sempre por cima do campo, em Label. O placeholder nunca substitui a etiqueta.
- **Focus:** contorno em `foco` e um anel de 3 px em `foco` a 28%.
- **Error / Disabled:** contorno `erro` e a mensagem por baixo em `erro`, com peso 500. O erro geral do formulário aparece num bloco no fim, antes do botão.

### Navigation
- **Barra de topo:** sempre grafite, 64 px. À esquerda a marca e o nome da oficina, à direita quem está a trabalhar, o botão de tema e Sair. No tablet partilhado, Sair passa a "Terminar", com contorno âmbar.
- **Separadores:** Oficina, Histórico, Clientes e Veículos, mais Equipa e Definições para o gestor. Ficam numa faixa `superficie` com 52 px de altura, com ícone e texto em Label. O ativo fica com o texto em `tinta` e a barra âmbar de 3 px por baixo. Em ecrãs estreitos a faixa faz scroll na horizontal.

### Tablier (componente de assinatura)
O painel de luzes da oficina: uma luz por estado ativo (Abertas, Em curso, Aguardam peças, Prontas), numa faixa grafite de 4 colunas separadas por linhas de 1 px.
- **Luz:** o pictograma de 60 px desenhado diretamente no grafite, seguido do nome (Body, 600) e da leitura do número (Readout). A luz nunca é mais pequena do que o número.
- **Apagada / acesa:** apagada, o símbolo fica em `luz-apagada` e o texto em `painel-tinta-2`. Acesa (há veículos), o símbolo passa para a cor do estado com emissão e o texto para `painel-tinta`.
- **Movimento:** logo a seguir a alguém entrar (com password ou PIN) ou à app abrir, as quatro luzes fazem o autoteste de um carro ao rodar a chave. Acendem por ordem, com 110 ms entre cada uma, e ao fim de 1,8 s ficam acesas só as que têm veículos. Acontece uma vez por entrada: voltar ao quadro depois de ver uma folha mostra logo as luzes como estão (a lista fica em memória até a sessão mudar). Quando um estado passa de 0 para 1 ou mais, a luz acende com um cintilar de 0,8 s. As duas animações desaparecem com `prefers-reduced-motion`.
- **Toque:** tocar numa luz filtra a lista. A luz escolhida fica com o fundo um pouco mais claro e a barra âmbar por baixo, e tocar outra vez tira o filtro. Até 1024 px os nomes reservam duas linhas, para os quatro números ficarem alinhados mesmo quando "Aguardam peças" se parte. Com menos de 760 px a grelha passa a 2×2, com símbolos de 44 px.
- **Pictogramas** (`frontend/src/components/Luzes.jsx`): a frente de um carro (aberta), uma chave de bocas (em curso), um pistão (aguarda peças), a bandeira de xadrez com moldura (pronta) e uma chave (entregue). Não se usa a roda dentada, que toda a gente lê como "definições". Os cinco têm um peso visual parecido (entre 22% e 30% da grelha coberta). O painel da entrada usa os mesmos símbolos a 40 px.

### Seletor de estado da folha
Cinco botões lado a lado, com 56 px de altura (duas filas no telemóvel). Cada um tem o pictograma do estado a 26 px e o nome. O estado atual fica com o pictograma aceso na cor `estado-*`, o contorno nessa cor e um fundo tingido a 14%. Nos outros, o pictograma fica apagado (um cinzento entre `linha-forte` e a superfície). É o mesmo gesto do tablier: a luz do estado em que o carro está.

### Matrícula (componente de assinatura)
A chapa desenhada: fundo `chapa`, texto em Plate centrado, contorno interior escuro de 1,5 px e a faixa azul à esquerda.
- **Normal:** 30 px de altura e pelo menos 124 px de largura, para as chapas ficarem alinhadas numa coluna em todas as listas.
- **Grande** (cabeçalho da folha e do veículo): 50 px de altura e pelo menos 212 px de largura. Nas matrículas com formato português, a faixa leva o círculo de 12 estrelas e o "P". Nas estrangeiras a faixa fica lisa, porque não se sabe o país.
- **Formato:** as portuguesas mostram-se com hífenes (AA-00-AA). As estrangeiras ficam como foram escritas.
- **Campo da nova entrada:** a própria chapa, com 84 px de altura e letra de 3rem, onde se escreve a matrícula.

### Luz de estado
Um círculo sólido de 10 px na cor do estado, sempre seguido do nome ("Em curso", "Pronta"). Entregue é um anel de 2 px. Não há halo à volta.

### Teclado do PIN
Doze teclas em grelha 3 × 4, com 72 px de altura e cantos de 14 px. Os algarismos estão em Barlow Condensed de 2rem. Segue o tema do tablet. Só a tecla de entrar é âmbar, e fica desativada até haver 4 algarismos. Os pontos do visor são anéis de 18 px em `linha-forte`, que ficam cheios em `tinta`. Um PIN errado abana o visor e mostra a mensagem em `erro`. Também funciona com o teclado físico.

### Marca e ícones da PWA
A marca é a "luz indicadora": uma lâmpada âmbar dentro de um aro escuro, num quadrado grafite de cantos redondos, com uma barra cinzenta por baixo. Ao lado vem BANCADA em Wordmark. Os PNG da PWA em `frontend/public/icons/` (192, 512, a versão maskable e o apple-touch-icon) foram exportados de `frontend/public/favicon.svg` pelo Chromium (Playwright). As imagens em `docs/imagens/` são capturas da própria aplicação, com os dados fictícios do `npm run db:seed`.

## Do's and Don'ts

### Do:
- **Do** usar âmbar (`ambar`) só na ação principal de cada ecrã, na barra do separador ativo, na barra do filtro ativo e no foco sobre o painel escuro.
- **Do** acompanhar sempre a cor de um estado com o nome dele. A cor nunca pode ser a única pista.
- **Do** manter os alvos de toque em 48 px ou mais (`--toque`), 56 px nas ações principais do tablet (`--toque-g`) e 72 px no teclado do PIN.
- **Do** pôr os estilos de `:hover` dentro de `@media (hover: hover)`, para o toque num tablet não deixar o hover preso.
- **Do** usar algarismos tabulares (`.num`) em euros, quantidades, horas e quilómetros.
- **Do** usar os pictogramas de `Luzes.jsx` para os estados. Os ícones Phosphor servem para ações e navegação e são gerados só com os pesos usados (`npm run icones`).
- **Do** escrever o texto da interface em português de Portugal, sem travessões: usar dois pontos, vírgulas ou parênteses.
- **Do** verificar os dois temas e os 1180 × 820 do tablet antes de dar um ecrã por acabado.

### Don't:
- **Don't** usar as cores `luz-*` fora do grafite do painel.
- **Don't** pôr aros, lentes, gradientes radiais ou sombras interiores nas luzes do tablier.
- **Don't** mostrar o número de um estado maior do que a luz. O número é uma leitura, como o conta-quilómetros.
- **Don't** usar sombras para destacar cartões ou painéis. A única sombra é a do aviso flutuante.
- **Don't** mudar a cor da chapa de matrícula no tema escuro.
- **Don't** confirmar ações com janelas modais. Confirma-se no próprio botão.
- **Don't** pintar de vermelho um botão em repouso. O vermelho cheio só aparece no passo de confirmação.
- **Don't** carregar fontes ou scripts de CDNs. A CSP só aceita `'self'` e a Barlow vem da própria aplicação.
- **Don't** criar um segundo botão âmbar no mesmo ecrã.
