# Guia para compreender e explicar o código

## Referências do projeto

Os requisitos vêm do documento atualizado do grupo. A referência UML é **apenas o conjunto central assinalado na imagem pelo grupo**: o Diagrama de Classes geral e a coluna de diagramas junto dele. Os diagramas mais à direita, riscados na imagem, não são a referência desta implementação.

Os nomes dos métodos de domínio mantêm a correspondência com esse diagrama geral. Os componentes React representam os ecrãs; não são classes do UML.

## Por onde começar

1. [`client/src/main.tsx`](client/src/main.tsx) inicia o React, a navegação e o estado partilhado.
2. [`client/src/App.tsx`](client/src/App.tsx) associa cada endereço ao ecrã e limita os acessos por perfil.
3. A pasta [`client/src/pages`](client/src/pages) contém os ecrãs, divididos por área.
4. [`client/src/state.tsx`](client/src/state.tsx) disponibiliza os dados, o utilizador e a função `act` aos ecrãs.
5. [`client/src/services/repository.ts`](client/src/services/repository.ts) é o ponto único de acesso aos dados: guarda-os no navegador (`npm run dev`) ou, através de `repositoryHttp.ts`, no MongoDB (`npm run bd`).
6. [`client/src/services/reducer.ts`](client/src/services/reducer.ts) recebe uma operação e encaminha-a para as regras da área correspondente.
7. As classes em [`client/src/model`](client/src/model) executam as operações dos objetos do domínio.

## Organização das pastas

| Pasta/ficheiro            | Responsabilidade                                           | Exemplos                                                         |
| ------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| `pages/pedidos/`          | Submissão, detalhe, votos e histórico                      | `FormularioPedido.tsx`, `DetalhePedido.tsx`                      |
| `pages/workspace/`        | Convites, membros, discussão e ficheiros privados          | `Participantes.tsx`, `WorkspacePedido.tsx`, `AceitarConvite.tsx` |
| `pages/gestor/`           | Triagem, atribuição e sprints                              | `TriagemEAtribuicao.tsx`, `PrepararSprint.tsx`                   |
| `pages/produto/`          | Aprovação, prioridade, requisitos e planeamento do produto | `DecisaoPedido.tsx`, `PriorizacaoPedido.tsx`, `Roadmap.tsx`      |
| `pages/developer/`        | Trabalho técnico sobre um pedido atribuído                 | `ImplementacaoPedido.tsx`                                        |
| `pages/comum/`            | Listas, notificações e preferências                        | `ListaPedidos.tsx`, `Notificacoes.tsx`                           |
| `components/`             | Elementos reutilizados em vários ecrãs                     | Formulários, cartões, tabelas, confirmação e mensagens           |
| `hooks/`                  | Comportamento reutilizável entre componentes               | `useAgora.ts`, para atualizar o prazo do Workspace               |
| `model/`                  | Objetos e métodos do diagrama geral                        | `PedidoFuncionalidade.ts`, `Workspace.ts`, `ColecaoPedidos.ts`   |
| `services/comandos/`      | Permissões e regras de cada operação                       | `pedidos.ts`, `colaboracao.ts`, `planeamento.ts`                 |
| `services/semelhantes.ts` | Extração de palavras-chave e pesquisa de semelhantes       | `normalizar`, `palavrasChave`, `procurarSemelhantes`             |
| `services/migracao.ts`    | Compatibilidade com dados de demonstração antigos          | Mantém pedidos e retira campos que saíram do projeto             |
| `domain.ts`               | Tipos dos dados, estados e regras partilhadas              | `Request`, `User`, `Command`, prazo do Workspace                 |
| `seed.ts`                 | Dados de exemplo para experimentar a aplicação             | Utilizadores, pedidos, sprints e releases                        |

`Requests.tsx`, `Planning.tsx`, `Lists.tsx` e `components.tsx` são pontos de exportação curtos. A implementação que antes estava nesses ficheiros está agora nas pastas da tabela.

## O que acontece quando alguém carrega num botão

O ecrã recolhe os dados e chama `act` com uma operação, por exemplo:

```ts
await act({ type: 'adicionarVoto', id: pedido.id }, 'Voto registado.');
```

O percurso é este:

1. `state.tsx` identifica o utilizador e entrega a operação ao repositório.
2. `repository.ts` obtém os dados mais recentes e chama `executarComando`.
3. `comandos/contexto.ts` cria uma cópia dos dados e disponibiliza funções de validação, histórico e notificação.
4. `reducer.ts` escolhe o ficheiro da área. Os votos são tratados em `comandos/pedidos.ts`.
5. A área verifica o perfil e chama `PedidoFuncionalidade.adicionarVoto`.
6. Se tudo resultar, o repositório grava a cópia e avisa os componentes. O React apresenta os dados atualizados.
7. Se uma validação falhar, a operação lança um erro. A cópia não é guardada e `state.tsx` apresenta a mensagem.

Assim, um ecrã não precisa de saber como os dados são guardados, e uma classe de domínio não precisa de saber como o botão é desenhado.

## Como explicar a submissão de um pedido

O código do ecrã está em [`pages/pedidos/FormularioPedido.tsx`](client/src/pages/pedidos/FormularioPedido.tsx).

- `input` guarda título, descrição e produto enquanto o utilizador escreve.
- `matches` é calculado a partir do texto atual; `ColecaoPedidos.findSemelhantes` limita a pesquisa ao produto selecionado.
- `procurarSemelhantes` ignora palavras comuns, normaliza acentos e devolve no máximo três pedidos. Mostrar sugestões não associa nem grava pedidos.
- `submeterPedido` valida o formulário e envia a operação `submeterPedido`, ou `editar` quando o formulário está em modo de edição.
- [`comandos/pedidos.ts`](client/src/services/comandos/pedidos.ts) valida o papel, atribui o identificador e o estado `Submetido` e regista o histórico.
- Só depois do sucesso é aberto o detalhe do pedido.

Na edição, `expectedVersion` conserva a versão que foi aberta. Se alguém tiver guardado outra versão entretanto, a operação é recusada para não sobrescrever essa alteração.

## Como explicar o Workspace

- O criador gera um convite através de `gerarConvite`. O token fica válido durante sete dias.
- A operação `aceitarConvite`, em [`comandos/colaboracao.ts`](client/src/services/comandos/colaboracao.ts), cria o espaço quando entra o primeiro convidado.
- `Workspace` agrupa as operações sobre membros e convites. `PedidoFuncionalidade` associa esse espaço ao pedido e recebe os comentários.
- `workspaceApenasLeitura`, em `domain.ts`, aplica a regra WRK-8: fecha após 14 dias ou na aprovação, rejeição ou marcação como duplicado.
- `useAgora` atualiza a interface enquanto a página está aberta. A operação verifica novamente a regra ao guardar, mesmo que o botão ainda estivesse visível.
- O Product Manager consulta o espaço apenas em leitura. Quem não é membro não vê os comentários nem os participantes.
- As sugestões de `@` usam apenas membros. A notificação guarda o identificador do membro, para não depender de comparar nomes.

## Nomes dos dados e nomes do UML

| Nome no TypeScript     | Significado                                             |
| ---------------------- | ------------------------------------------------------- |
| `Request`              | Registo serializável de um pedido                       |
| `PedidoFuncionalidade` | Classe com os métodos desse pedido no diagrama geral    |
| `User`                 | Dados de um utilizador, incluindo o seu papel           |
| `Command`              | Operação pedida pelo ecrã e os respetivos argumentos    |
| `Database`             | Estado completo do programa; não é a ligação ao MongoDB |
| `dados`                | Registo sobre o qual uma classe atua                    |

Por exemplo, `Request` guarda título e estado; `PedidoFuncionalidade.editar` e `alterarEstado` executam as operações sobre esse registo. Os dados simples podem ser guardados como JSON, e as classes são criadas quando uma operação precisa delas.

## Como verificar uma alteração

Dentro de `app`:

```sh
npm run format:check
npm test
npm run build
```

Os testes percorrem os quatro perfis e verificam permissões, versões, sprints, palavras-chave, convites, menções, migração e o instante exato em que acabam os 14 dias.

Para explicar uma regra na apresentação, mostrem primeiro o ecrã, depois o comando dessa área, o método da classe e finalmente o teste correspondente. Isto permite demonstrar a ligação entre interface, UML, regra de negócio e resultado.

## Limites da implementação atual

Os dados ficam sempre no MongoDB e as regras são aplicadas na API (pasta `bd/`). A entrada no programa usa email e palavra-passe (`services/autenticacao.ts` no ecrã, `bd/autenticacao.ts` no servidor). Falta a recuperação da palavra-passe por email. As sugestões de IA são simuladas.

## Base de dados (MongoDB): passos para os colegas

Quem já tem a pasta `pedidos-de-produto` só precisa do ficheiro `bd-para-colegas.zip`. Traz a pasta `bd\` e os ficheiros do programa que foram alterados para o ligar à base de dados.

1. Extrair o zip para dentro de `pedidos-de-produto` e aceitar substituir os ficheiros.
2. No terminal, dentro de `pedidos-de-produto`, correr `npm install`.
3. Correr `npm run bd` e abrir `http://127.0.0.1:5174`.

Na primeira vez, o `npm run bd` descarrega o MongoDB (cerca de 740 MB). Não é preciso instalar MongoDB nem Docker. A base de dados começa com os dados de exemplo.

Ficheiros substituídos pelo zip: `package.json`, `package-lock.json`, `FRONTEND.md`, `GUIA_CODIGO.md`, `scripts\build.mjs`, `client\src\main.tsx` e `client\src\services\repository.ts`. Quem já alterou algum deles deve juntar as duas versões à mão em vez de substituir.

| Comando               | O que faz                                                      |
| --------------------- | -------------------------------------------------------------- |
| `npm run bd`          | Arranca o MongoDB, a API e o programa, com os dados no MongoDB |
| `npm run dev`         | Arranca só o programa (precisa de `npm run bd:api` a correr)   |
| `npm run bd:exportar` | Grava os dados em `bd\dados\estado.json`                       |
| `npm run bd:importar` | Substitui os dados pelos de `bd\dados\estado.json`             |

Cada computador tem a sua cópia da base de dados. Para passar dados a outra pessoa: fechar o `npm run bd`, correr `npm run bd:exportar`, enviar o ficheiro `bd\dados\estado.json` e, no outro computador, correr `npm run bd:importar`.

O manual completo da base de dados está em [`bd/BASE_DADOS.md`](bd/BASE_DADOS.md).
