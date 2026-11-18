# Alinhamento do frontend — Sprint 4

Referências consultadas em 16/11/2026:

- [Personas, cenários, US, critérios de aceitação e regras atualizadas](https://docs.google.com/document/d/1UdDemhC3-RSzNkQCDxrQEzGzNQD_12YY61YNkCHZgkc/edit?tab=t.0).
- [Diagrama de Classes geral no Miro](https://miro.com/app/board/uXjVEXQ3Fsw=/?moveToWidget=3458764690539431902&cot=14).

O documento atualizado e as indicações do grupo prevalecem sobre textos antigos ainda existentes nos diagramas ou protótipos. Por exemplo: as empresas e as categorias saíram do modelo; as tags mantêm-se (US31). A criação do Workspace segue US2/CA2: ocorre quando o primeiro convidado aceita o link, com o título do pedido como nome, limitado a 50 carateres. Não exige criar manualmente o espaço antes do convite.

A referência UML é exclusivamente o grupo central assinalado pelo grupo: o diagrama geral e a coluna de diagramas imediatamente ao seu lado. Os diagramas mais à direita, riscados na imagem de 16/11/2026, não são usados como referência.

## Correspondência com o Diagrama de Classes geral

Os métodos abaixo estão implementados nas classes de domínio, com os nomes do diagrama geral. Os componentes React continuam a separar a apresentação das operações do domínio.

| Classe no UML        | Ficheiro                                   | Operações                                                                                                                                                                                                                                                 |
| -------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PedidoFuncionalidade | `client/src/model/PedidoFuncionalidade.ts` | `editar`, `alterarEstado`, `getEstado`, `getAutor`, `getWorkspace`, `setWorkspace`, `adicionarVoto`, `removerVoto`, `adicionarComentario`, `atribuir`, `definirPriorizacao`, `associarPedidoOriginal`, `devolver`, `rejeitar`, `getDeveloper`, `concluir` |
| Workspace            | `client/src/model/Workspace.ts`            | `adicionarMembro`, `removerMembro`, `contemMembro`, `gerarConvite`, `isAberto`, `getMembros`                                                                                                                                                              |
| ColecaoPedidos       | `client/src/model/ColecaoPedidos.ts`       | `findPedido`, `addPedido`, `pesquisar`, `findSemelhantes`, `findAtribuidos`, `findPorConvite`                                                                                                                                                             |
| Backlog              | `client/src/model/Backlog.ts`              | `adicionarPedido`, `removerPedido`, `ordenarPorPrioridade`, `getPedidos`                                                                                                                                                                                  |
| Sprint               | `client/src/model/Sprint.ts`               | `adicionarPedido`, `removerPedido`, `getPedidos`, `iniciar`, `concluir`                                                                                                                                                                                   |

O adaptador usa identificadores `string`, datas ISO e objetos serializáveis, adequados à persistência no navegador e à futura API. `dados` conserva os registos; as classes agrupam as operações. As assinaturas TypeScript adaptam os tipos UML à aplicação, por exemplo `User` para o utilizador e `Request` para os dados do pedido. Este frontend não substitui a implementação do domínio e das permissões no backend.

`client/src/services/reducer.ts` recebe comandos com nomes de operações em português e valida o papel, o estado e as condições antes de chamar o modelo. As validações estão divididas em services/comandos por pedidos, produto, implementação, planeamento, colaboração e notificações. O comando de serviço `fecharSprint` chama `Sprint.concluir()`; o comando `concluir` chama `PedidoFuncionalidade.concluir()`.

## Fórum e privacidade

- O fórum público mostra os pedidos, descrição, produto, estado e votos. Não contém comentários públicos.
- Os comentários, ficheiros e membros ficam no Workspace privado. Só os membros e o Product Manager podem consultar este espaço; o Product Manager tem apenas leitura.
- O histórico e as versões só aparecem ao autor do pedido. As suas ações aparecem como «Você»; nomes da equipa são substituídos por «Equipa do produto».
- O criador gera um convite válido por 7 dias. O primeiro convidado autenticado cria automaticamente o Workspace; os seguintes aderem ao mesmo espaço.
- O Workspace fecha exatamente 14 × 24 horas após a criação, ou quando o pedido é aprovado, rejeitado ou duplicado, conforme o que ocorrer primeiro. Continua fechado nos estados posteriores à aprovação.
- O bloqueio aplica-se também a novos convites, aceitação de convites antigos, membros e ficheiros. A interface atualiza o prazo enquanto está aberta e a operação volta a validá-lo ao guardar.
- Ao escrever `@`, são sugeridos apenas membros do Workspace. Só as pessoas mencionadas recebem a notificação de menção.

## Pesquisa de semelhantes

`services/semelhantes.ts` contém `normalizar`, `palavrasChave` e `procurarSemelhantes`, com a lista de palavras ignoradas fornecida pelo grupo. `ColecaoPedidos.findSemelhantes` limita primeiro os candidatos ao produto escolhido.

A interface procura enquanto o título ou a descrição são escritos. Normaliza acentos e maiúsculas, usa palavras com pelo menos quatro carateres, exclui pedidos rejeitados e duplicados e apresenta no máximo três sugestões. O autor pode consultar e votar num pedido existente ou continuar a submeter o seu, sem associação automática.

## Dados anteriores e validação

A migração para `pedidos-produto.frontend.v3` preserva os pedidos, votos, versões e comentários. Retira campos de empresa/categoria e identifica o autor pelo utilizador que submeteu. Para Workspaces antigos sem data própria, utiliza a data original do pedido, evitando conceder um novo prazo de 14 dias. A chave antiga permanece disponível como cópia dos dados anteriores.

Os testes de `client/tests/sprint4.test.ts` cobrem palavras-chave, seleção de produto, convites, criação automática, permissões, menções, migração e a fronteira exata dos 14 dias. Os testes anteriores continuam a verificar o percurso completo entre os quatro perfis e os sprints.
