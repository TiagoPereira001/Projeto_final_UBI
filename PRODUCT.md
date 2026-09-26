# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Mecânicos**, no chão da oficina, num **tablet partilhado** fixo na bancada ou na parede (confirmado pelo autor). Vários mecânicos usam o mesmo tablet ao longo do dia, muitas vezes com as mãos sujas ou de luvas, com barulho e luz forte. O trabalho deles: dar entrada a um veículo em poucos toques, registar peças e horas à medida que as aplicam, deixar conselhos para o cliente, mudar o estado da reparação.
- **Gestores** (donos ou responsáveis da oficina), sobretudo num computador, para ver o que está a ser feito, consultar o histórico de clientes e veículos, gerir a equipa e acompanhar os valores com IVA.
- **Oficinas novas**, que se registam sozinhas na plataforma (registo público: oficina + primeiro gestor).

## Product Purpose

A Bancada substitui as folhas de obra em papel por registos digitais. Resolve problemas reais do papel: histórico difícil de consultar, folhas que se sujam ou perdem, contas feitas à mão no fim da reparação e ninguém saber ao certo quem fez o quê.

Sucesso: um mecânico dá entrada a um carro e regista uma peça sem largar o trabalho por mais de um minuto; o gestor sabe, a qualquer momento, que veículos estão na oficina, em que estado, quanto vale o trabalho e quem o fez.

## Positioning

Nasceu das folhas de obra reais da **Duarte & Raposo** (Canhoso, Covilhã), uma oficina de mecânica, eletricidade e **autocaravanas**, e é o primeiro cliente da plataforma. Por isso trata as autocaravanas como veículos complexos, separando a marca/modelo do chassis (mecânica) da marca da célula habitacional. Passou a servir **qualquer oficina**: cada uma tem os seus dados isolados das outras.

O tablet partilhado é tratado como tal: cada mecânico entra com o seu nome e um PIN, e cada folha e cada linha ficam registadas em nome de quem as fez.

## Operating Context

- Tablet partilhado na oficina (modo bancada), ativado por um gestor. Troca rápida de pessoa: nome + PIN, e "Terminar" no fim.
- Computador do gestor para gestão (clientes, veículos, equipa, definições, valores).
- A folha de obra tem estados: aberta, em curso, a aguardar peças, concluída, entregue. Uma folha entregue fica fechada (só um gestor a reabre).
- Linhas de reparação: peças/material, mão de obra (em horas) e outros custos, com preço sem IVA. O IVA é calculado por folha, com a taxa da oficina no dia da entrada.
- Muitos clientes de autocaravanas são turistas estrangeiros (matrículas e contribuintes de outros países).

## Capabilities and Constraints

- Web app React (PWA) + API Node.js/Express + SQL Server. Idioma: português de Portugal.
- Multi-oficina com isolamento de dados por oficina (verificado por testes automáticos).
- **Não emite faturas.** Em Portugal, a faturação exige software certificado pela Autoridade Tributária. A Bancada calcula totais e IVA e prepara a informação; a fatura é emitida no programa de faturação da oficina.
- Soft delete: clientes, veículos e colaboradores são arquivados, nunca apagados (histórico e obrigações fiscais).
- Por decidir: integração com programas de faturação, funcionamento offline, notificações ao cliente, fotografias nas folhas.

## Brand Commitments

- Nome da plataforma: **Bancada** (escolhido pelo autor).
- Manter e elevar a identidade que já existia: grafite + âmbar, a "luz indicadora" (como as luzes do tablier de um carro) como sinal de estado, e o ambiente de oficina. Com tema claro e tema escuro.
- A Duarte & Raposo aparece como cliente/oficina, não como marca da plataforma.

## Evidence on Hand

- Diagramas do modelo de dados em `Relatorio/Anexos/` (Diagrama.png, Esquema_relacional.png).
- Não há testemunhos, métricas de uso nem outros clientes além da Duarte & Raposo: nada disso pode ser inventado.
- Os dados do `npm run db:seed` são fictícios e servem só para demonstração.

## Product Principles

1. **O tablet é partilhado e as mãos estão sujas.** Alvos grandes, poucos passos, nada que exija escrever muito.
2. **Quem fez fica registado.** A autoria vem da sessão, nunca de um campo que se possa escolher.
3. **As contas têm de bater certo ao cêntimo.** Totais e IVA calculados no servidor, com decimais exatos.
4. **Cada oficina só vê o que é seu.** O isolamento é garantido na API e na própria base de dados.
5. **O papel era rápido.** Se um passo digital for mais lento do que escrever na folha, está errado.

## Accessibility & Inclusion

- WCAG 2.2 AA: contraste mínimo 4.5:1 no texto, foco visível, navegação por teclado no computador.
- Alvos de toque de pelo menos 48 px (idealmente 56 px) para uso com luvas.
- Legível com luz forte (sol, lâmpadas da oficina) e respeito por `prefers-reduced-motion`.
