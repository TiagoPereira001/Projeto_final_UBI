---
version: 1
slug: "frontend-src-pages-quadro-jsx"
primary_target: "frontend/src/pages/Quadro.jsx"
related_targets: ["frontend/src/pages/Folha.jsx","frontend/src/pages/Entrar.jsx"]
---

# Quadro da oficina (ecrã principal do tablet)

Modo: Operate. Público: mecânicos no tablet partilhado da oficina (modo bancada) e gestores no computador. Tarefa: perceber num relance o que está na oficina, abrir a folha certa, dar entrada a um veículo. Frequência: dezenas de vezes por dia, de pé, a 0,5 a 2 m do ecrã, com as mãos sujas.

## Direction contract

THESIS: O ecrã principal é o tablier da oficina: uma luz por estado, acesa quando há veículos nesse estado, e a lista de trabalho por baixo. Recusa o quadro kanban genérico de colunas e o dashboard de métricas com números grandes.

OWN-WORLD: Painel de instrumentos em grafite (sempre escuro, como num carro) com luzes de aviso: azul (aberta), âmbar (em curso), vermelho (aguarda peças), verde (pronta), apagada (entregue). Superfície de trabalho clara ou escura conforme o tema. Matrículas como chapas brancas com a faixa azul europeia. Barlow e Barlow Condensed (letra de sinalética e de matrículas). Âmbar é a única cor de ação.

STORY: O mecânico olha para o tablier e percebe o estado da oficina num segundo; toca numa luz para ver só esses carros, ou em Nova entrada; abre a folha e regista a peça em poucos toques. O gestor vê o mesmo quadro e as contas do mês.

FIRST VIEWPORT: Barra de topo com Bancada, o nome da oficina, quem está a trabalhar e o botão de sair (neutro; no tablet partilhado chama-se Sair do tablet). Logo abaixo, a faixa do tablier com quatro luzes grandes (Abertas, Em curso, Aguardam peças, Prontas), cada uma com o número de veículos. Por baixo, pesquisa por matrícula ou cliente e o botão âmbar Nova entrada à direita. Depois a lista: chapa de matrícula, veículo, cliente, queixa, tempo na oficina e luz de estado. Assinatura: a luz acende com um breve cintilar quando um estado passa de zero para um ou mais veículos; tocar numa luz filtra a lista.

FORM: Tablier de luzes, posição 5 da lista ordenada (1 quadro por estado, 2 quadro de chaves, 3 matrícula primeiro, 4 lista e folha lado a lado, 5 tablier de luzes, 6 lista única com luzes, 7 calha de folhas), escolhido pelo autor. Seed f10a6f2d (sorteio degradado, sem desafiantes).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
