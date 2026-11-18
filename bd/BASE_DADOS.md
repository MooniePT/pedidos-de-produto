# Base de dados MongoDB

A base de dados segue o **Diagrama de Classes UML Geral** (Miro, board "Sprint 3 - Diagramas"): cada classe tem uma coleção com o mesmo nome, e os atributos, os tipos e os valores dos enums são os do diagrama. O teste `bd/testes/diagrama.test.ts` confirma isto automaticamente. Alguns campos que o programa usa ainda não estão no diagrama (por exemplo `arquivado`, `ficheiros`, a coleção `Sessao`).

## Como usar

Requer Node.js 22.12 ou superior. Na pasta do projeto:

```sh
npm install
npm run bd
```

Abrir http://127.0.0.1:5174. O comando arranca três coisas: o MongoDB, a API (porta 3001) e o programa. Na primeira vez descarrega o MongoDB 8.0 da Internet e carrega os dados de exemplo.

| Comando                  | O que faz                                                                        |
| ------------------------ | -------------------------------------------------------------------------------- |
| `npm run bd`             | MongoDB, API e programa, ligados                                                 |
| `npm run bd:api`         | Só MongoDB e API                                                                 |
| `npm run bd:criar`       | Cria coleções, validação e índices; carrega os dados de exemplo se estiver vazia |
| `npm run bd:exportar`    | Grava todos os dados em `bd/dados/estado.json`                                   |
| `npm run bd:importar`    | Substitui os dados pelos de `bd/dados/estado.json`                               |
| `npm run bd:repor`       | Volta aos dados de exemplo                                                       |
| `npm run bd:ver`         | Mostra as coleções e quantos documentos têm (com o programa aberto)              |
| `npm run bd:ver -- Voto` | Mostra os documentos de uma coleção                                              |
| `npm run test:bd`        | Testes da base de dados, da API e da correspondência com o diagrama              |

Os quatro comandos de manutenção (`criar`, `exportar`, `importar`, `repor`) exigem que o `npm run bd` esteja fechado quando se usa o MongoDB local.

## Ver os dados em tempo real

Com o `npm run bd` aberto, o MongoDB local está em `mongodb://127.0.0.1:27017` (se a porta estiver ocupada, o endereço certo aparece na primeira linha do `npm run bd`).

- **Terminal:** noutro terminal, `npm run bd:ver` (coleções) ou `npm run bd:ver -- PedidoFuncionalidade` (documentos).
- **Navegador:** com sessão iniciada como Gestor, Product Manager ou Developer, abrir `http://127.0.0.1:5174/api/bd` (coleções) ou `http://127.0.0.1:5174/api/bd/Voto` (documentos). Só leitura; os clientes não têm acesso e a password nunca aparece.
- **MongoDB Compass ou extensão "MongoDB for VS Code":** ligar a `mongodb://127.0.0.1:27017`, base de dados `pedidos_produto`.

## Onde ficam os dados

- **Sem configuração:** o MongoDB corre no próprio computador e guarda os dados em `.pedidos-produto/mongo`, na pasta do utilizador. Fica fora do OneDrive de propósito: a sincronização de ficheiros de uma base de dados aberta pode corrompê-la.
- **Para levar os dados para outro computador:** `npm run bd:exportar` num, `npm run bd:importar` no outro.
- **Com Docker, MongoDB instalado ou Atlas:** copiar `.env.example` para `.env` e pôr o endereço em `MONGODB_URI`. Com Docker, correr antes `docker compose up -d`.

## Como funciona

```
ecrãs -> state.tsx -> repository.ts -> repositoryHttp.ts -> API (bd/servidor.ts) -> MongoDB
```

1. O ecrã pede uma operação (por exemplo `adicionarVoto`).
2. `repositoryHttp.ts` envia-a à API. O cookie da sessão identifica o utilizador; o servidor ignora qualquer utilizador indicado no pedido.
3. A API lê os dados da base de dados e aplica as regras do programa (`client/src/services/reducer.ts`). É o backend que valida (ACE-7).
4. Se uma regra falhar, nada é gravado e a mensagem aparece no ecrã.
5. Se passar, a API grava só os documentos que mudaram e devolve o estado novo.
6. De 3 em 3 segundos o programa pergunta à API se houve alterações feitas noutro navegador.

| Ficheiro                  | Responsabilidade                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------ |
| `esquema.ts`              | Coleções (uma por classe), validação e índices                                       |
| `mapeamento.ts`           | Conversão entre os dados do programa e os documentos de cada classe                  |
| `ligacao.ts`              | Abrir a base de dados, ler e gravar                                                  |
| `servidor.ts`             | API: `/api/estado`, `/api/comandos`, `/api/saude`, `/api/bd` e `/api/autenticacao/*` |
| `autenticacao.ts`         | Passwords (hash scrypt), sessões, registo e cookies                                  |
| `iniciar.ts`              | `npm run bd`                                                                         |
| `ferramentas.ts`          | Comandos de manutenção                                                               |
| `ver.ts`                  | `npm run bd:ver`                                                                     |
| `testes/bd.test.ts`       | Testes da base de dados e da API                                                     |
| `testes/diagrama.test.ts` | Confirma classes, atributos, tipos e enums contra o diagrama                         |

## Do diagrama de classes para o MongoDB

Regras usadas em todas as classes:

| Diagrama                     | Base de dados                                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Classe                       | Coleção com o mesmo nome (`PedidoFuncionalidade`, `Voto`, ...)                                                    |
| Classe abstrata `Utilizador` | Não tem coleção: uma por subclasse (`Cliente`, `GestorDeProjeto`, `ProductManager`, `Developer`)                  |
| Atributo                     | Campo com o mesmo nome e o mesmo tipo (`int`, `String`, `Date`, `boolean`, `double`)                              |
| Enumeração                   | Validação `enum` com os mesmos valores (`EmTriagem`, `Atribuido`, `Medio`, ...)                                   |
| Associação                   | Campo com o identificador do outro objeto: nome do papel no diagrama ou, se não houver, nome da classe            |
| `_id`                        | Chave técnica obrigatória do MongoDB. Não é um atributo do diagrama; o `id: int` do diagrama é o campo `id`       |
| Classes sem atributos        | `Utilizadores`, `ColeçãoPedidos`, `Backlog` e `Dashboard` são as próprias coleções e consultas: não guardam dados |

| Coleção                              | Atributos do diagrama                                                           | Associações                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `Cliente` (e as outras 3 subclasses) | `id`, `nome`, `email`, `password` (só o hash)                                   |                                                                                 |
| `Produto`                            | `id`, `nome`                                                                    |                                                                                 |
| `Tag`                                | `id`, `nome`                                                                    |                                                                                 |
| `PedidoFuncionalidade`               | `id`, `titulo`, `descricao`, `estado`, `dataCriacao`, `motivo`, `notaResolucao` | `autor` (Cliente que submete), `produto`, `tags`, `developer`, `pedidoOriginal` |
| `VersaoPedido`                       | `numeroVersao`, `titulo`, `descricao`, `dataEdicao`                             | `pedidoFuncionalidade`, `utilizador`                                            |
| `HistoricoEstado`                    | `estadoAnterior`, `novoEstado`, `data`                                          | `pedidoFuncionalidade`, `autor`                                                 |
| `Voto`                               | `data`                                                                          | `pedidoFuncionalidade`, `cliente` (faz)                                         |
| `Priorizacao`                        | `impacto`, `esforco`, `prioridade`                                              | `pedidoFuncionalidade`                                                          |
| `SugestaoIA`                         | `impacto`, `esforco`, `prioridade`, `decisao`                                   | `pedidoFuncionalidade`                                                          |
| `UserStory`                          | `texto`, `geradaPorIA`                                                          | `pedidoFuncionalidade`                                                          |
| `CriterioAceitacao`                  | `texto`                                                                         | `userStory`                                                                     |
| `LinkCodigo`                         | `url`                                                                           | `pedidoFuncionalidade`, `developer` (associa)                                   |
| `Workspace`                          | `nome`, `somenteLeitura`, `dataCriacao`                                         | `pedidoFuncionalidade` (tem), `cliente` (cria), `participantes`                 |
| `ConviteLink`                        | `link`, `dataExpiracao`                                                         | `workspace`                                                                     |
| `Comentario`                         | `texto`, `data`                                                                 | `pedidoFuncionalidade`, `utilizador`                                            |
| `Notificacao`                        | `tipo`, `mensagem`, `data`, `lida`                                              | `utilizador`                                                                    |
| `Release`                            | `nome`, `dataPrevista`                                                          | `produto`, `pedidos`                                                            |
| `Milestone`                          | `nome`, `data`                                                                  | `release`                                                                       |
| `Sprint`                             | `id`, `dataInicio`, `dataFim`, `estado`                                         | `pedidos`, `gestorDeProjeto`                                                    |
| `Metrica`                            | `tipo`, `valor`                                                                 | (um documento por `TipoMetrica`)                                                |

### Como se preenchem os elementos do diagrama que o programa não guarda

| Elemento                                          | Como fica preenchido                                                                                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id: int` (utilizadores, produtos, tags, sprints) | Número pela ordem de criação. No pedido o `id` é `String` com o código (`P-052`)                                                                    |
| `Utilizador.password`                             | Hash scrypt (`scrypt$<sal>$<hash>`). Nunca em texto, nunca enviado ao navegador                                                                     |
| `Workspace.somenteLeitura`                        | Calculado pela regra do programa: pedido decidido ou 14 dias desde a criação                                                                        |
| `Workspace.dataCriacao`                           | `null` enquanto ninguém aceitou o convite: o Workspace existe desde o 1.º `ConviteLink`, mas para o programa só abre quando alguém aceita (US2 CA2) |
| `Notificacao.tipo`                                | `Mencao`, `Convite`, `Atribuicao`, `Sprint` ou `AlteracaoEstado`, conforme a mensagem                                                               |
| `UserStory.geradaPorIA`                           | `true` se a última gravação aceitou ou ajustou a sugestão da IA (registado no histórico)                                                            |
| `SugestaoIA`                                      | Uma por decisão sobre a sugestão de prioridade registada no histórico                                                                               |
| `Release.produto`                                 | O produto dos pedidos da release, quando são todos do mesmo; senão `null`                                                                           |
| `Sprint.gestorDeProjeto`                          | O Gestor de Projeto que definiu o sprint                                                                                                            |
| `LinkCodigo.developer`                            | O Developer a quem o pedido está atribuído                                                                                                          |
| `Metrica`                                         | Os 7 tipos de `TipoMetrica`, recalculados a cada gravação como no ecrã de métricas (US18)                                                           |

## Autenticação

| Rota                              | O que faz                                                        |
| --------------------------------- | ---------------------------------------------------------------- |
| `POST /api/autenticacao/registar` | Cria um **Cliente** (nome, email, palavra-passe ≥ 8)             |
| `POST /api/autenticacao/entrar`   | Confirma email e palavra-passe e cria a sessão (cookie HttpOnly) |
| `POST /api/autenticacao/sair`     | Termina a sessão                                                 |
| `GET /api/autenticacao/sessao`    | Devolve o utilizador da sessão, ou 401                           |

- As contas de exemplo recebem a palavra-passe inicial `pedidos123` (ou a de `PALAVRA_PASSE_INICIAL` no `.env`) no primeiro arranque.
- `Sessao`: `_id` = resumo SHA-256 do código do cookie, `utilizador`, `criadaEm`, `expiraEm` (índice TTL).
- `npm run bd:repor` apaga as contas registadas, termina todas as sessões e põe todas as contas de exemplo com a palavra-passe inicial.

## Limites

- **Sem transações.** Cada operação grava várias coleções seguidas. A API trata uma operação de cada vez, mas uma falha a meio de uma gravação pode deixar dados incompletos.
- **O estado é lido por inteiro em cada operação.** Serve para a dimensão do projeto, não para milhares de pedidos.
- **A revisão (para saber se há alterações) fica em memória** e recomeça na hora de cada arranque.
- **Exportar e importar não levam as passwords.** Depois de `bd:importar`, todas as contas recebem a palavra-passe inicial.
- **Atualização a partir da versão anterior:** as coleções antigas (`pedidos`, `utilizadores`, ...) são apagadas no primeiro arranque e a base de dados recomeça com os dados de exemplo.
