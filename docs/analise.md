# Análise de segurança, performance e viabilidade

Revisão feita a 26 de setembro de 2026 sobre o estado do repositório no commit `786edf4` ("front end adiantado"), e o que foi feito a seguir na branch de trabalho. Para cada ponto: o que estava, o risco e o que mudou. No fim, o que fica por fazer.

## Resumo

- O **backend** estava bem encaminhado (queries parametrizadas, bcrypt, helmet, rate limiting no login, segredos fora do código), mas tinha falhas importantes: a autoria das folhas podia ser falsificada, a API ligava-se como administrador do SQL Server e o SQL Server estava exposto à rede.
- O **frontend** não arrancava: faltava o `main.jsx`, os ficheiros estavam em pastas trocadas e as páginas da oficina e de gestão não existiam.
- Não havia **testes automáticos**, e o relatório descrevia como feitas coisas que ainda não existiam (PWA e dashboard).
- A mudança para **multi-oficina** trouxe um risco novo, o maior de todos: uma oficina ver dados de outra. Está coberto em três camadas (API, base de dados e testes).

## 1. Segurança

| # | Encontrado | Risco | O que foi feito |
|---|---|---|---|
| 1 | A password `sa` do SQL Server e um `JWT_SECRET` estiveram no código, num repositório público. O autor já os tinha tirado do código, mas continuam no histórico do git. | Crítico | Continuam fora do código. Têm de ser tratados como públicos: nunca reutilizar. O `config.js` recusa segredos curtos ou copiados de exemplos. |
| 2 | `docker-compose.yml` publicava o SQL Server em todas as interfaces (`1433:1433`), com o login `sa`. O Docker contorna a firewall do sistema. | Alto | Porta publicada só em `127.0.0.1`. |
| 3 | A API ligava-se como `sa` (administrador de todo o servidor). | Alto | Login próprio `bancada_app`, só com leitura/escrita de dados e **sem permissão de DELETE** nas tabelas com soft delete. Criado pelo `npm run db:setup`. |
| 4 | O colaborador responsável de uma folha vinha no corpo do pedido (`id_colaborador`): qualquer pessoa registava obra em nome de outra. Isto anulava o objetivo de auditoria. | Alto | A autoria vem sempre da sessão, nas folhas e nas linhas. Testado. |
| 5 | O token ia para o `localStorage`, onde qualquer script da página o pode ler (roubo de sessão se houver XSS). | Médio | Cookie `httpOnly` + `SameSite=Strict` + `Content-Security-Policy` rigorosa (só recursos do próprio site). Verificado no browser: zero violações. |
| 6 | Com cookies passa a haver risco de CSRF. | Médio | `SameSite=Strict` e, por cima, verificação da origem (`Origin` / `Sec-Fetch-Site`) em todos os pedidos que alteram dados. Testado. |
| 7 | Uma sessão continuava válida até 8 h depois de o colaborador ser desativado ou mudar de cargo. | Médio | A API relê o colaborador na BD em cada pedido; mudar a password ou desativar corta as sessões na hora (`Versao_Sessao`). Testado. |
| 8 | `jwt.verify` sem algoritmo fixo nem audiência. | Baixo | `HS256` fixo, emissor e audiência (um token de dispositivo não serve como sessão). Testado com tokens adulterados e `alg: none`. |
| 9 | O login respondia mais depressa quando o email não existia (dava para descobrir contas pelo tempo). | Baixo | Compara sempre contra um hash, exista ou não a conta. |
| 10 | Rate limiting do login só por IP. Numa oficina todos os dispositivos saem com o mesmo IP: um mecânico a enganar-se bloqueava a oficina inteira. | Médio | Limite por IP **e** conta, mais um teto por IP. Registo público e PIN também limitados. Testado. |
| 11 | Validação mínima: um `ano` com letras dava erro 500; o cargo era texto livre (dava para inventar cargos); estados e categorias também. | Médio | `Validador` para todos os campos (tipos, tamanhos, NIF com dígito de controlo, matrículas, decimais com vírgula) e `CHECK` na BD para os valores permitidos. |
| 12 | O bcrypt ignora em silêncio o que passa de 72 bytes; não havia regras para passwords. | Baixo | Mínimo 10 caracteres, máximo 72 bytes, lista de passwords óbvias. Custo do bcrypt de 10 para 12. |
| 13 | `OUTPUT INSERTED.*` devolvia todas as colunas (uma coluna sensível acrescentada no futuro ia parar à resposta). | Baixo | Colunas sempre explícitas. |
| 14 | `package-lock.json` estava no `.gitignore`: instalações diferentes em cada máquina, `npm ci` impossível. `.env.example` referido no README mas inexistente. | Médio | Lockfiles no repositório, `npm audit` no CI (0 vulnerabilidades), `.env.example` completo. |
| 15 | **Novo, com a mudança para multi-oficina:** uma oficina ver ou alterar dados de outra. | Crítico | Três camadas: todas as consultas filtram pela oficina da sessão; chaves estrangeiras compostas impedem, na própria BD, uma folha de apontar para dados de outra oficina; testes automáticos tentam ler, alterar, arquivar e reutilizar dados de outra oficina e esperam sempre 404. |
| 16 | **Novo, modo bancada:** um PIN de 4 a 6 algarismos é fraco por natureza. | Médio | Só funciona num tablet ativado por um gestor; bloqueia 5 min ao fim de 5 falhas (contado na BD); não dá acesso a contas nem definições; a sessão termina sozinha ao fim de 5 min parada; "desligar todos os tablets" para um tablet perdido. |

## 2. Performance

| Encontrado | O que foi feito |
|---|---|
| Nenhum índice nas chaves estrangeiras (o SQL Server não os cria sozinho). | Índices compostos por oficina, ajustados às consultas reais (quadro por estado, histórico por veículo, linhas por folha). |
| Listas sem paginação nem pesquisa: com anos de dados, cada lista trazia tudo. | Paginação e pesquisa no servidor (nome, NIF, telefone, matrícula com ou sem traços). |
| A folha vinha em dois pedidos seguidos à BD. | Uma ida à BD com três consultas no mesmo pedido. Acrescentar ou remover uma linha já devolve os totais novos (sem pedido extra). |
| Totais somados em JavaScript (`3 × 19,99` dá `59,970000000000006`). | Contas feitas no SQL Server com `DECIMAL`, arredondadas ao cêntimo. |
| Fontes carregadas do Google (mais ligações, dados dos utilizadores para terceiros, incompatível com uma CSP rigorosa). | Fontes self-hosted, só latin e latin-ext, em woff2. |
| (novo frontend) Os ícones Phosphor traziam 6 pesos cada: ~30 KB gzip, mais do dobro do código da app. | Módulo gerado só com os pesos usados: **menos 22 KB gzip (−15%)** no pacote inicial. |
| (novo frontend) | Páginas de gestão carregadas à parte e descarregadas antecipadamente quando o browser está parado; compressão gzip na API; ficheiros com hash em cache "para sempre"; respostas da API nunca em cache; PWA guarda a app e abre instantaneamente. |

Números do build atual: JavaScript inicial **120 KB gzip** (React DOM 66 KB, React Router 31 KB, app e ícones ~23 KB), CSS **8,4 KB gzip** (mais 1,2 KB que só carrega nas páginas de gestão). Os 52 testes da API correm em cerca de 22 s contra um SQL Server real.

## 3. Viabilidade

### Técnica

- A stack (React, Node.js, SQL Server, Docker) é adequada e corrente. O SQL Server **Express** é gratuito até 10 GB por base de dados, o que chega para muitas oficinas; acima disso há custos de licença (ou Azure SQL).
- A instalação é um container com a API e o frontend, mais o SQL Server. Cabe num servidor pequeno.
- Falta um sistema de **migrações** da base de dados antes de haver dados reais em produção (hoje o esquema recria-se do zero).

### Como produto

- **Faturação:** em Portugal, emitir faturas exige software certificado pela Autoridade Tributária. Certificar é caro e demorado; o caminho realista é integrar com programas de faturação que têm API (InvoiceXpress, Moloni, Vendus) e enviar-lhes os dados da folha. Até lá a Bancada calcula e prepara, e a fatura sai do programa da oficina (a interface já o diz).
- **RGPD:** a plataforma guarda dados pessoais dos clientes das oficinas. Para ser usada a sério precisa de política de privacidade, contrato de subcontratação com cada oficina e uma resposta para o direito ao apagamento (anonimizar, porque os registos fiscais têm de ser guardados 10 anos).
- **Diferenciação:** o tablet partilhado com PIN, a simplicidade face aos ERPs e o detalhe das autocaravanas (chassis e célula) são vantagens reais para oficinas pequenas.

### Como projeto final de curso

O projeto tem uma base forte: um problema real, um cliente real, requisitos tirados das folhas verdadeiras e um modelo de dados pensado. O que o enfraquecia era não ter interface a funcionar, não ter testes e o relatório prometer mais do que existia. Isso está resolvido. O que ainda o valorizava bastante (sugestões, não feito):

1. **Teste com os mecânicos da Duarte & Raposo:** medir o tempo de uma entrada e de uma peça em papel e no tablet, e recolher opiniões. Dá um capítulo de validação com dados reais.
2. **Pôr uma versão online** para o júri experimentar (com HTTPS).
3. **Diagramas** de arquitetura, casos de uso e sequência (login com PIN, entrada de um veículo).
4. Uma versão **imprimível da folha** para entregar ao cliente, com os conselhos.

## 4. O que fica por fazer

- HTTPS em produção (proxy com TLS), `COOKIE_SECURE=true` e ligação encriptada à BD (`DB_ENCRYPT=true`).
- Backups automáticos do SQL Server.
- Migrações da base de dados.
- Rate limiting partilhado (ex.: Redis) se a API correr em mais de uma instância.
- Registo de auditoria completo (quem alterou o quê e quando), além da autoria de folhas e linhas.
- Recuperação de password por email.
- Opcional: reescrever o histórico do git para tirar a password antiga (o essencial é não a usar em lado nenhum, e isso já acontece).
