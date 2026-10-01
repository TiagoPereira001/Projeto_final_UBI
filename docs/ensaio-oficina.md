# Ensaio na oficina

> **Isto é um plano, ainda não realizado.** Nada aqui é resultado: o que se medir no dia entra num documento à parte, com a data e as condições (ver [Depois do ensaio](#8-depois-do-ensaio)).

## 1. O que é, e o que não é

- **O que é:** meio dia na Duarte & Raposo, com 2 ou 3 mecânicos, o tablet Android deles e a Bancada a correr no teu Mac, ligado ao Wi-Fi da oficina. O tablet abre-a pelo Chrome, pelo endereço do Mac.
- **Para quê:** ver se a Bancada se usa no chão da oficina. Quanto tempo leva uma entrada, onde hesitam, como se vê o quadro de pé, o que acontece quando o diagnóstico (Bluetooth) e o Wi-Fi entram na conversa. É um teste de utilização, não de infraestrutura.
- **Só dados fictícios** (os do `db:seed`). Por isso não há RGPD, nem servidor, nem HTTPS: é o que torna possível fazê-lo já. Avisa o dono e pede-lhe licença para o fazer.
- **O que não é:** o piloto. O piloto (dados reais, servidor na UE, cópias de segurança) vem depois, e depende do que este ensaio mostrar. Está em [`infraestrutura.md`](infraestrutura.md).
- **Um limite do ensaio:** sem HTTPS, o Chrome não instala a Bancada como app. Vai num separador, com a barra do endereço, e isso tira ecrã. Anota-o: o ecrã útil real é menor do que o dos nossos testes.

## 2. Antes de ires (em casa, na véspera)

- [ ] Docker Desktop instalado e a Bancada já arrancada uma vez com internet (`Iniciar Bancada.command`). Da primeira vez descarrega o SQL Server e prepara a aplicação, o que demora vários minutos: não o faças na oficina.
- [ ] **Ensaia o modo oficina com o teu telemóvel:** duplo clique em **`Iniciar Bancada na oficina.command`**, escreve no Chrome do telemóvel (no mesmo Wi-Fi) o endereço que a janela mostra, entra como gestor, ativa a bancada e entra com um PIN. Se aqui não abrir, na oficina também não.
- [ ] Mac, tablet e telemóvel carregados; carregador do Mac.
- [ ] Esta folha e a [folha de observação](#4-o-guião) impressas, e uma caneta.
- [ ] Duas ou três folhas de obra em papel da oficina, para medires o papel.
- [ ] O dono avisado: quando, quanto tempo, quem (2 ou 3 mecânicos, uns 20 minutos cada) e que os dados são inventados.

## 3. Montar (10 a 15 minutos na oficina)

1. Liga o Mac ao Wi-Fi da oficina: o **mesmo** do tablet, não a rede de convidados. Deixa-o ligado à corrente.
2. Duplo clique em **`Iniciar Bancada na oficina.command`**. Se o macOS perguntar se o Docker pode aceitar ligações da rede, escolhe **Permitir**.
3. Espera pelo "5/5  Pronto". Se a janela disser que os dados de demonstração já existem e não tiveres a password, escreve **N** e Enter nos 20 segundos: cria dados novos, com uma password nova. **Não feches a janela**: fechá-la, ou carregar em Enter, pára a Bancada. O lançador pede ao Mac que não adormeça enquanto ela estiver aberta (não feches a tampa).
4. A janela mostra o **endereço para o tablet** (`http://192.168...:3000`), o email e a password do gestor e os PINs dos mecânicos de demonstração. Anota-os: só aparecem uma vez.
5. No tablet, abre o Chrome e escreve o endereço, **com o `http://`**. Um aviso de "ligação não segura" é esperado: é HTTP na rede local.
6. Entra com o email e a password do gestor.
7. (Opcional) Em **Equipa**, acrescenta os mecânicos que vão participar (só o primeiro nome, e um PIN que escolham), para o ecrã lhes parecer o deles. Ficam só no teu Mac e apagam-se no fim. Faz isto **antes** do passo seguinte: depois dele, o tablet já não deixa mexer na equipa.
8. Em **Definições**, carrega em «Usar este dispositivo como bancada». A sessão do gestor termina e o tablet passa a mostrar "Quem vai trabalhar?". (Para voltar a mexer na equipa ou nas definições: «Entrar com email», no canto de cima desse ecrã. A bancada continua ativa.)
9. Deixa o tablet deitado, no sítio onde ficaria (na bancada ou na parede), com o brilho que usam. Anota o modelo, o tamanho do ecrã, a versão do Android e a do Chrome.

**Se o tablet não abrir o endereço:**
- está no mesmo Wi-Fi que o Mac? (não na rede de convidados, que costuma isolar os aparelhos uns dos outros);
- escreveste o `http://` à frente?
- a firewall do Mac (Definições do Sistema, Rede, Firewall) deixa o Docker aceitar ligações?
- plano B: liga o Mac **e** o tablet ao ponto de acesso do teu telemóvel (não é preciso internet), fecha a janela do lançador e abre-o outra vez. O endereço muda: usa o novo.

**Se o endereço do Mac mudar** (outra rede, ou o Mac adormeceu e voltou), o tablet deixa de ser a bancada, porque os cookies são por endereço. Volta a ativá-lo em Definições.

## 4. O guião

**O que dizer a cada mecânico, antes de começar:** «Estou a testar a aplicação, não a ti. Não há respostas erradas: se alguma coisa for difícil, o problema é da aplicação. Os carros e os clientes são inventados. Diz em voz alta o que estás a pensar. Podes parar quando quiseres.»

**O que fazes tu:**
- não ajudes nem expliques. Se ficar preso mais de um minuto, ajuda e anota **onde** e **quanto tempo** esteve preso;
- cronometra com o telemóvel e anota as hesitações, os erros e os toques falhados;
- tira capturas de ecrã no tablet (botão de ligar mais baixar o volume) em cada ecrã onde algo correr mal. Só com dados inventados: nada da aplicação de diagnóstico nem de carros de clientes.

Imprime uma folha por mecânico:

| # | Tarefa | Cronometrar | Tempo | Ajuda? | Erros, hesitações e notas |
|---|---|---|---|---|---|
| 0 | **No papel:** dar entrada a um carro (a mesma informação que a folha de papel pede) | até a folha estar preenchida | | | |
| 1 | **Entrar:** tocar no nome e escrever o PIN | do toque no nome até ver o quadro | | | |
| 2 | **Ler o quadro de pé, a 1,5 m:** «quantos carros estão prontos? e a aguardar peças?» | até responder | | | |
| 3 | **Dar entrada a um carro que já cá veio** (uma matrícula de demonstração) | de «Nova entrada» até a folha estar aberta | | | |
| 4 | **Dar entrada a um carro novo,** com cliente novo (matrícula, nome e telefone inventados) | idem | | | |
| 5 | **Registar uma peça e uma hora de trabalho** numa folha | de «Adicionar» até a linha aparecer, duas vezes | | | |
| 6 | **Mudar o estado:** Em curso, A aguardar peças, Pronta. Depois tentar Entregue | por mudança | | | |
| 7 | **Encontrar um carro** pela matrícula, no quadro | até abrir a folha | | | |
| 8 | **Passar a vez:** sair do tablet e entrar outro mecânico | do toque em «Sair do tablet» até o outro ver o quadro | | | |
| 9 | **Diagnóstico:** abrir a aplicação de diagnóstico, ligá-la ao carro por Bluetooth e, uns 6 minutos depois, voltar à Bancada | | | | |
| 10 | **Sem Wi-Fi:** com a Bancada aberta, modo avião durante 1 minuto e voltar a ligar | | | | |

O que ver em cada uma:
- **1:** engana-se no PIN? as teclas servem com as mãos como estão (ou com luvas)?
- **2:** olha para as luzes ou para a lista? acerta? É o teste do quadro a distância, que ainda não foi feito num tablet montado.
- **3 e 4:** onde hesita, na matrícula, no cliente ou no veículo? O teclado do Android tapa o campo?
- **5:** consegue escrever o preço com vírgula? o teclado tapa o botão?
- **6:** percebe sozinho que «Entregue» pede um segundo toque?
- **9:** a Bancada continua a atualizar com o Bluetooth do diagnóstico ligado? Ao voltar, pede o PIN, ou o Chrome recarregou a página? Anota o que aconteceu e o tempo que passou.
- **10:** o que diz o ecrã? Recupera sozinho quando o Wi-Fi volta? Se fechares e abrires a página sem rede, o que mostra?

E, se houver uma porta com sol, vê o tema claro e o escuro lá fora.

## 5. Já sei que... (para não gastares tempo a descobrir)

- Sem rede, o quadro mostra "Sem ligação ao servidor" e esbate os números. Mas se a página for **recarregada** sem rede, aparece o ecrã de entrada (REL-003, por corrigir).
- O bloqueio aos 5 minutos de inatividade existe só no ecrã. Se o Android descartar a página em segundo plano e a recarregar, a sessão continua em nome do mecânico anterior, até 12 horas.
- Se dois aparelhos gravarem as notas da mesma folha, o último a gravar apaga o que o outro escreveu (BUG-01, por corrigir). Não testes as notas com dois aparelhos ao mesmo tempo.
- A Bancada não tem modo offline: sem rede, não grava.

## 6. Perguntas no fim

Perguntas abertas a cada mecânico, uma de cada vez:
1. O que foi mais difícil?
2. E o mais fácil?
3. Usarias isto amanhã, em vez do papel? Porquê?
4. O que falta?
5. Onde ficava o tablet, e quem o usava mais?

Ao dono: **o que tem de acontecer para experimentarem com carros a sério?**

## 7. Como se arruma

1. Carrega em **Enter** na janela do lançador: pára a Bancada. Os dados ficam no Mac.
2. Para apagar tudo, incluindo os mecânicos que criaste: na pasta do projeto, `docker compose --profile app down -v` (apaga o volume da base de dados). O duplo clique normal (`Iniciar Bancada.command`) volta a deixar a Bancada só no teu Mac.
3. Se a janela se fechar à força (o Mac desligou, por exemplo), a Bancada pode ficar a correr aberta à rede. Abre o duplo clique **normal** e carrega em Enter: volta a fechar a porta e pára.

## 8. Depois do ensaio

- Passa as notas e as capturas a limpo no mesmo dia. Uma lista de problemas por gravidade (impede de trabalhar, atrapalha, incomoda), com a captura ao lado.
- Ao relatório e aos documentos só entra o que mediste, com a data e as condições. O resto fica "por fazer".
- **Critérios para passar ao piloto (uma proposta, não uma regra):** ninguém fica preso sem ajuda nas tarefas 1 a 6; nenhum erro perde dados; a entrada no tablet (tarefas 3 e 4) não demora mais do que no papel (tarefa 0); o diagnóstico e o Wi-Fi (tarefas 9 e 10) não estragam o uso; e pelo menos dois dos três mecânicos dizem que usariam.
- Antes do piloto, corrigir o que o ensaio mostrar e o que a lista da secção 5 e a [revisão de código](revisao-codigo.md) já apontam (BUG-01 e REL-003 primeiro).

## 9. O que este ensaio não prova

Desempenho e fiabilidade num servidor real, HTTPS e a instalação como app, as cópias de segurança, o RGPD e o uso durante semanas com dados reais. Isso é o piloto.

## 10. O que foi verificado no modo oficina, e o que não foi

Verificado a 01/10/2026, num ambiente Linux sem tablet nem Mac: o lançador arranca em modo oficina, a Bancada responde pelo endereço da rede e a base de dados continua só no computador; o Chromium (contexto inseguro, como o tablet) abre a Bancada por esse endereço, o gestor entra, ativa a bancada e um mecânico entra com o PIN; a verificação de origem aceita o endereço da rede e recusa uma origem alheia; o duplo clique normal volta a fechar a porta; e, sem endereço de rede, o lançador pára com uma mensagem (12 verificações, sem falhas).

**Não verificado:** o macOS a sério (a deteção do endereço foi testada com comandos simulados, e o `caffeinate` e o pedido da firewall não), o Docker Desktop, e um tablet Android a sério.
