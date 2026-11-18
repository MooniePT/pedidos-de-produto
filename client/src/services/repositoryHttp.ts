import type { Command, Database } from '../domain';
import { criarClienteApi, ErroApi } from './api';
import type { Repository } from './repository';

type Resposta = { revisao: number; estado: Database; resultado?: string };

const VAZIO: Database = {
  schema: 3,
  sequence: 0,
  users: [],
  requests: [],
  sprints: [],
  releases: [],
  tags: [],
  dependencies: [],
  notifications: [],
  invites: [],
};

const INTERVALO_MS = 3000;

/**
 * Dados guardados no MongoDB através da API (pasta bd/).
 * Só carrega os dados depois de iniciada a sessão; ao terminar a sessão, limpa-os.
 */
export function criarRepositorioHttp(
  base = '',
  cabecalhos: Record<string, string> = {},
): Repository {
  const pedir = criarClienteApi(base, cabecalhos);
  const listeners = new Set<() => void>();
  const aoPerderSessao = new Set<() => void>();
  let estado = VAZIO;
  let revisao = -1;
  let ativo = false;
  let temporizador: ReturnType<typeof setInterval> | undefined;

  const avisar = () => {
    for (const listener of listeners) listener();
  };

  const publicar = (resposta: Resposta) => {
    if (resposta.revisao < revisao) return;

    revisao = resposta.revisao;
    estado = resposta.estado;
    avisar();
  };

  function limpar() {
    ativo = false;
    clearInterval(temporizador);
    estado = VAZIO;
    revisao = -1;
    avisar();
  }

  // A sessão expirou ou foi terminada noutro lado: limpa os dados e avisa o ecrã.
  function tratarErro(erro: unknown): never {
    if (erro instanceof ErroApi && erro.semSessao && ativo) {
      limpar();

      for (const aviso of aoPerderSessao) aviso();
    }

    throw erro;
  }

  // Vai buscar as alterações feitas noutros navegadores.
  async function atualizar() {
    const resposta = await pedir<Resposta>(`/api/estado?revisao=${revisao}`).catch(tratarErro);

    if (resposta) publicar(resposta);
  }

  return {
    snapshot: () => estado,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    aoPerderSessao: (aviso) => {
      aoPerderSessao.add(aviso);

      return () => {
        aoPerderSessao.delete(aviso);
      };
    },
    async carregar() {
      ativo = true;
      await atualizar();

      clearInterval(temporizador);

      temporizador = setInterval(() => {
        if (ativo && document.visibilityState === 'visible') atualizar().catch(() => undefined);
      }, INTERVALO_MS);
    },
    limpar,
    async command(command: Command) {
      const resposta = await pedir<Resposta>('/api/comandos', { comando: command }).catch(
        tratarErro,
      );

      publicar(resposta!);

      return resposta!.resultado;
    },
  };
}
