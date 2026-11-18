import type { Command, Database } from '../domain';
import { tratarColaboracao } from './comandos/colaboracao';
import { criarContexto, type ContextoComando } from './comandos/contexto';
import { tratarImplementacao } from './comandos/implementacao';
import { tratarNotificacoes } from './comandos/notificacoes';
import { tratarPedidos } from './comandos/pedidos';
import { tratarPlaneamento } from './comandos/planeamento';
import { tratarProduto } from './comandos/produto';

// Um único ponto de entrada garante que todos os comandos usam o mesmo controlo de sessão e a mesma cópia dos dados.
const operacoes = {
  submeterPedido: tratarPedidos,
  editar: tratarPedidos,
  adicionarVoto: tratarPedidos,
  removerVoto: tratarPedidos,
  triarPedido: tratarPedidos,
  alterarEstado: tratarPedidos,
  definirPriorizacao: tratarProduto,
  definirCriteriosAceitacao: tratarProduto,
  atribuirTags: tratarProduto,
  gerirTags: tratarProduto,
  atribuir: tratarImplementacao,
  atualizarEstado: tratarImplementacao,
  concluir: tratarImplementacao,
  associarCodigo: tratarImplementacao,
  removerCodigo: tratarImplementacao,
  definirSprintBacklog: tratarPlaneamento,
  fecharSprint: tratarPlaneamento,
  guardarRelease: tratarPlaneamento,
  adicionarDependencia: tratarPlaneamento,
  removerDependencia: tratarPlaneamento,
  gerarConvite: tratarColaboracao,
  aceitarConvite: tratarColaboracao,
  removerMembro: tratarColaboracao,
  adicionarComentario: tratarColaboracao,
  adicionarFicheiro: tratarColaboracao,
  removerFicheiro: tratarColaboracao,
  marcarComoLida: tratarNotificacoes,
  marcarTodasComoLidas: tratarNotificacoes,
  configurarNotificacoes: tratarNotificacoes,
} satisfies Record<
  Command['type'],
  (contexto: ContextoComando, comando: Command) => string | undefined
>;

/** Valida e executa uma operação local. A persistência só acontece depois de esta função terminar sem erro. */
export function executarComando(
  dadosAtuais: Database,
  utilizadorId: string,
  comando: Command,
): { state: Database; result?: string } {
  const contexto = criarContexto(dadosAtuais, utilizadorId);
  const resultado = operacoes[comando.type](contexto, comando);

  return { state: contexto.dados, result: resultado };
}
