import { workspaceApenasLeitura, type Command } from '../../domain';
import { Workspace } from '../../model/Workspace';
import type { ContextoComando } from './contexto';

/** Colaboração privada: verifica membros, prazo de 14 dias e decisão do pedido antes de escrever. */
export function tratarColaboracao(contexto: ContextoComando, comando: Command): string | undefined {
  const {
    dados,
    utilizador,
    agoraIso,
    exigirPapel,
    obterPedido,
    obterModelo,
    registarHistorico,
    notificar,
    obterWorkspaceEditavel,
    gerarId,
  } = contexto;

  let resultado: string | undefined;

  switch (comando.type) {
    case 'gerarConvite': {
      exigirPapel('customer');

      const pedido = obterPedido(comando.id);

      if (pedido.submittedBy !== utilizador.id) {
        throw Error('Só o criador do pedido pode gerar convites.');
      }

      if (workspaceApenasLeitura(pedido)) throw Error('O Workspace está em modo de leitura.');

      const invite = new Workspace(pedido).gerarConvite();

      dados.invites.push(invite);
      resultado = invite.token;
      break;
    }
    case 'aceitarConvite': {
      exigirPapel('customer');

      const invite = dados.invites.find((i) => i.token === comando.token);

      if (!invite || Date.parse(invite.expires) <= Date.now()) {
        throw Error('Este link de convite expirou ou não é válido.');
      }

      const pedido = obterPedido(invite.requestId);

      if (workspaceApenasLeitura(pedido)) throw Error('O Workspace está em modo de leitura.');
      if (pedido.members.includes(utilizador.id)) throw Error('Já pertence a este Workspace.');

      if (!pedido.workspace) {
        obterModelo(pedido).setWorkspace(
          new Workspace({
            ...pedido,
            workspace: pedido.title.slice(0, 50),
            workspaceCreatedAt: agoraIso,
            members: [pedido.submittedBy],
          }),
        );

        registarHistorico(
          pedido,
          'Workspace criado automaticamente após aceitação do primeiro convite',
        );
      }

      obterModelo(pedido).getWorkspace()!.adicionarMembro(utilizador);
      notificar(pedido.submittedBy, pedido, utilizador.name + ' aceitou o convite.');
      notificar(utilizador.id, pedido, 'Convite aceite para o Workspace de ' + pedido.code);
      resultado = pedido.id;
      break;
    }
    case 'removerMembro': {
      const pedido = obterWorkspaceEditavel(comando.id);

      if (pedido.submittedBy !== utilizador.id) {
        throw Error('Só quem submeteu pode gerir participantes.');
      }

      if (!comando.remove) throw Error('Os novos participantes entram pelo link de convite.');

      if (comando.member === pedido.submittedBy) {
        throw Error('O autor da submissão não pode ser removido.');
      }

      const membro = dados.users.find((u) => u.id === comando.member);

      if (!membro) throw Error('Participante não encontrado.');
      obterModelo(pedido).getWorkspace()!.removerMembro(membro);
      registarHistorico(pedido, 'Participante removido');
      break;
    }
    case 'adicionarComentario': {
      const pedido = obterWorkspaceEditavel(comando.id);

      if (!comando.text.trim() || comando.text.trim().length > 1000) {
        throw Error('O comentário deve ter entre 1 e 1000 carateres.');
      }

      if (comando.mentions.some((i) => !pedido.members.includes(i))) {
        throw Error('Só pode mencionar participantes do Workspace.');
      }

      obterModelo(pedido).adicionarComentario(comando.text, utilizador, comando.mentions);

      for (const member of new Set(comando.mentions))
        if (member !== utilizador.id) {
          notificar(member, pedido, utilizador.name + ' mencionou-o em ' + pedido.code + '.');
        }

      break;
    }
    case 'adicionarFicheiro': {
      const pedido = obterWorkspaceEditavel(comando.id);

      if (comando.file.size > 2 * 1024 * 1024) {
        throw Error('O ficheiro deve ter até 2 MB.');
      }

      if (
        !['application/pdf', 'image/png', 'image/jpeg', 'text/plain'].includes(comando.file.type)
      ) {
        throw Error('Use um ficheiro PDF, PNG, JPEG ou TXT.');
      }

      pedido.files.push({ ...comando.file, id: gerarId(), user: utilizador.id, date: agoraIso });
      break;
    }
    case 'removerFicheiro': {
      const pedido = obterWorkspaceEditavel(comando.id);
      const file = pedido.files.find((f) => f.id === comando.fileId);

      if (!file || (file.user !== utilizador.id && pedido.submittedBy !== utilizador.id)) {
        throw Error('Não pode remover este ficheiro.');
      }

      pedido.files = pedido.files.filter((f) => f.id !== comando.fileId);
      break;
    }
  }

  return resultado;
}
