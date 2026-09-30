# Product

<!-- impeccable:product-schema 1 -->

> **Bancada**: folhas de obra digitais para oficinas.
>
> Este ficheiro descreve o produto: para quem é, que problema resolve, o que faz, como se usa e o que ainda não faz. Serve pessoas e agentes de IA. Os títulos das secções ficam em inglês porque a skill de design impeccable os lê; o conteúdo está em português.

## Platform

web

## Users

- **Mecânicos**, no chão da oficina, num **tablet partilhado**, fixo na bancada ou na parede. Vários mecânicos usam o mesmo tablet ao longo do dia, muitas vezes com as mãos sujas ou de luvas, com barulho e luz forte. Precisam de:
  - dar entrada a um veículo em poucos toques;
  - registar as peças e as horas à medida que as aplicam;
  - mudar o estado da reparação;
  - deixar conselhos para o cliente.
- **Gestores** (donos ou responsáveis da oficina), sobretudo no computador. Precisam de:
  - saber o que está na oficina e em que estado;
  - consultar o histórico de clientes e veículos;
  - gerir a equipa (acessos e PINs);
  - acompanhar os valores com IVA.
- **Oficinas novas**, que se registam sozinhas na plataforma (a oficina e o primeiro gestor), sem falar com ninguém.
- **Clientes das oficinas** (indiretamente). Não usam a Bancada, mas beneficiam dela: contas certas, histórico do carro e conselhos de manutenção. O telefone de cada cliente está na folha, para ser avisado quando o carro fica pronto.

## Product Purpose

**O problema.** Muitas oficinas pequenas trabalham com folhas de obra em papel. Na Duarte & Raposo, onde o projeto nasceu, isso traz problemas todos os dias:
- é difícil saber o que se fez a um carro no ano passado;
- as folhas sujam-se e perdem-se pela oficina;
- no fim da reparação faz-se as contas à mão para passar a fatura;
- nem sempre se sabe quem fez o quê.

**A solução.** A Bancada substitui a folha de papel por uma folha digital, feita para ser usada no próprio chão da oficina:
- cada entrada de um veículo abre uma folha;
- os mecânicos acrescentam peças, mão de obra e outros custos enquanto trabalham, e cada linha fica em nome de quem a registou;
- os totais e o IVA são calculados ao cêntimo;
- o histórico de cada veículo e de cada cliente fica guardado e pesquisável.

**Sucesso** é isto:
- um mecânico dá entrada a um carro e regista uma peça sem largar o trabalho por mais de um minuto;
- o gestor sabe, a qualquer momento, que veículos estão na oficina, em que estado, quanto vale o trabalho e quem o fez.

## Positioning

- **Feita para o chão da oficina, não para o escritório.**
  - O tablet é partilhado: cada mecânico entra com o seu nome e um PIN, e a sessão termina sozinha se o tablet ficar parado.
  - O ecrã principal é um tablier, como o de um carro: uma luz por estado da reparação, legível a um ou dois metros.
  - Os alvos de toque são grandes, para dedos com luvas.
- **Nasceu de folhas de obra reais** de uma oficina de mecânica, eletricidade e autocaravanas.
  - Trata as autocaravanas como veículos complexos: separa a marca e o modelo do chassis (a mecânica) da marca da célula habitacional.
  - Aceita clientes estrangeiros: matrículas e contribuintes de outros países.
- **Faz uma coisa bem feita.** Não é um ERP nem um programa de faturação: é a folha de obra. A fatura continua a ser emitida no programa certificado da oficina, com os totais que a Bancada já calculou.
- **Quem fez fica registado.** A autoria de cada folha e de cada linha vem da sessão de quem está a trabalhar, nunca de um campo que se possa escolher.
- **Várias oficinas, dados separados.** Cada oficina só vê o que é seu. O isolamento é garantido na API, na própria base de dados e em testes automáticos.

## Operating Context

O percurso de um carro pela oficina, na Bancada:

1. **Entrada.**
   - Escreve-se a matrícula, num campo com a forma da própria chapa.
   - Se o veículo já cá esteve, aparece logo. Se já está na oficina, a Bancada diz em que folha.
   - Se é novo, regista-se o veículo e o dono no mesmo passo.
   - Abre-se a folha com os quilómetros e o que o cliente pediu.
2. **Trabalho.**
   - Os mecânicos acrescentam linhas: peças e material, mão de obra (em horas) e outros custos, com preço sem IVA.
   - Depois de acrescentar uma linha, o cursor volta à descrição, para registar várias peças seguidas.
3. **Estados.**
   - A folha passa por aberta, em curso, a aguardar peças, pronta e entregue.
   - O quadro da oficina mostra quantos carros há em cada estado e a lista, do que está há mais tempo para o mais recente.
   - Tocar numa luz filtra a lista.
4. **Pronta.** Liga-se ao cliente: o telefone está na folha.
5. **Entregue.**
   - Entregar pede um segundo toque no botão, para não fechar uma folha por engano.
   - A folha fecha: só um gestor a pode reabrir, e também com dois toques (reabrir limpa a data de entrega).
   - A fatura é emitida no programa de faturação da oficina, com os totais da Bancada.
6. **Gestão**, no computador:
   - valores do mês;
   - equipa (criar colaboradores, definir PINs, tirar acessos);
   - definições (dados da oficina, taxa de IVA, tablets);
   - histórico de folhas, clientes e veículos.

**Dispositivos e ambiente:**
- **Tablet da oficina** (o dispositivo de referência é 1180 × 820, deitado): ativado por um gestor como "bancada". Tem tema claro para a luz forte e tema escuro para o fim do dia.
- **Computador do gestor e telemóvel**: os mesmos ecrãs, adaptados a cada largura.

**Contas:**
- Cada oficina tem a sua taxa de IVA. A taxa é copiada para cada folha quando abre, por isso mudá-la depois não altera folhas antigas.
- As folhas são numeradas por oficina.

## Capabilities and Constraints

### O que a Bancada faz hoje

- **Registo público** de oficinas (a oficina e o primeiro gestor) e entrada com email e password.
- **Modo bancada**:
  - o tablet partilhado, onde cada mecânico entra com o seu nome e PIN;
  - o PIN fica bloqueado ao fim de 5 falhas;
  - a sessão termina ao fim de 5 minutos parado;
  - o gestor pode desligar todos os tablets de uma vez.
- **Quadro da oficina**: o tablier de luzes, a pesquisa por matrícula, cliente ou número, e a lista dos carros na oficina. O gestor vê também os valores do mês.
- **Nova entrada** a partir da matrícula, com o veículo e o cliente criados no mesmo passo quando são novos.
- **Folha de obra**:
  - estado escolhido com um toque;
  - linhas de peças, mão de obra e outros custos;
  - totais por categoria, subtotal, IVA e total;
  - quilómetros, observações e conselhos para o cliente;
  - folha entregue fechada.
- **Histórico** de folhas, **clientes** e **veículos** (com o histórico de visitas de cada um). Clientes e veículos arquivam-se e nunca se apagam.
- **Equipa**: gestores e mecânicos, com email e password, PIN, ou os dois.
- **Definições**: dados da oficina, taxa de IVA, tablets.
- **Interface**:
  - temas claro e escuro;
  - funciona no tablet, no computador e no telemóvel;
  - pode ser instalada como app (PWA).

### Restrições

- **Não emite faturas.** Em Portugal, as faturas têm de ser emitidas por software certificado pela Autoridade Tributária (Portaria n.º 363/2010). A Bancada calcula e prepara; a fatura sai do programa de faturação da oficina.
- **Nada se apaga a sério.** Clientes, veículos, colaboradores e folhas são arquivados, por causa do histórico e das obrigações fiscais. Só as linhas de uma folha ainda aberta se podem remover.
- **Cada oficina só vê os seus dados.**
- **Precisa de rede.** A app fica guardada no dispositivo, mas os dados vêm do servidor.
- **Tecnologia:**
  - web (React, instalável como PWA);
  - API em Node.js;
  - base de dados SQL Server;
  - língua: português de Portugal.

### Ainda não existe

Por decidir ou por fazer. Nada disto deve ser apresentado como feito:
- integração com programas de faturação certificados;
- funcionamento sem rede;
- notificações ao cliente;
- fotografias nas folhas;
- orçamentos e stock de peças;
- folha imprimível para o cliente;
- recuperação de password por email;
- registo completo de alterações (auditoria);
- versão publicada online com HTTPS;
- testes com os mecânicos da Duarte & Raposo.

## Brand Commitments

- **Nome:** a plataforma chama-se **Bancada**, escolhido pelo autor.
- **Identidade visual:** manter e elevar a identidade que já existia.
  - Grafite + âmbar, e a "luz indicadora" do login original.
  - O tablier de um carro como ideia central, com pictogramas próprios para cada estado: carro, chave de bocas, pistão, bandeira de xadrez e chave.
  - A matrícula desenhada como a chapa.
  - Tema claro e tema escuro.
  - Os detalhes estão em [`DESIGN.md`](DESIGN.md).
- **Duarte & Raposo:** aparece como cliente e oficina, não como marca da plataforma.

## Evidence on Hand

- **Folhas de obra e faturas em branco** da Duarte & Raposo: foram a fonte dos requisitos. São documentos físicos e não estão no repositório.
- **Diagramas do modelo de dados** em `Relatorio/Anexos/`:
  - `Diagrama.png` e `Esquema_relacional.png`: primeira versão, no ERDPlus;
  - `esquema_bancada.pdf`: segunda versão, multi-oficina.
- **Capturas dos ecrãs** em `docs/imagens/` e `Relatorio/Anexos/ecras/`, com os dados fictícios do `npm run db:seed`.
- **Não há** utilizadores reais, testemunhos, métricas de uso, preços nem outros clientes além da Duarte & Raposo. Nada disso pode ser inventado.

## Product Principles

1. **O tablet é partilhado e as mãos estão sujas.** Alvos grandes, poucos passos, nada que exija escrever muito.
2. **Quem fez fica registado.** A autoria vem da sessão, nunca de um campo que se possa escolher.
3. **As contas têm de bater certo ao cêntimo.** Totais e IVA calculados no servidor, com decimais exatos.
4. **Cada oficina só vê o que é seu.** O isolamento é garantido na API e na própria base de dados.
5. **O papel era rápido.** Se um passo digital for mais lento do que escrever na folha, está errado.

## Accessibility & Inclusion

- WCAG 2.2 AA:
  - contraste mínimo de 4,5:1 no texto, confirmado nos dois temas;
  - foco sempre visível;
  - navegação por teclado no computador.
- Alvos de toque de pelo menos 48 px: 56 px nas ações principais do tablet e 72 px no teclado do PIN, para uso com luvas.
- A cor nunca é a única pista: cada estado tem sempre o nome escrito ao lado.
- Legível com luz forte (sol, lâmpadas da oficina). As animações desaparecem com `prefers-reduced-motion`.
