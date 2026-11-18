import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { Command, Database, User } from './domain';
import { ErroApi } from './services/api';
import * as autenticacao from './services/autenticacao';
import { repository } from './services/repository';

type StateContext = {
  db: Database;
  user: User | undefined;
  /** true enquanto se confirma, ao abrir o programa, se já existe uma sessão. */
  aVerificarSessao: boolean;
  login: (email: string, palavraPasse: string) => Promise<void>;
  logout: () => Promise<void>;
  act: (c: Command, message?: string) => Promise<{ ok: boolean; result?: string }>;
  toast: { text: string; error: boolean } | null;
  clearToast: () => void;
};

const Context = createContext<StateContext | null>(null);

export function Provider({ children }: { children: ReactNode }) {
  const db = useSyncExternalStore(repository.subscribe, repository.snapshot);
  const [sessao, setSessao] = useState<autenticacao.UtilizadorSessao | null>(null);
  const [aVerificarSessao, setAVerificarSessao] = useState(true);
  const [toast, setToast] = useState<StateContext['toast']>(null);

  // Dados completos do utilizador (por exemplo, a preferência de notificações) vêm do estado.
  const user = sessao ? db.users.find((u) => u.id === sessao.id) : undefined;

  // Ao abrir o programa: se já houver sessão (cookie), carrega os dados.
  useEffect(() => {
    autenticacao
      .obterSessao()
      .then(async (utilizador) => {
        if (utilizador) {
          await repository.carregar();
          setSessao(utilizador);
        }
      })
      .catch((erro) => setToast({ text: (erro as Error).message, error: true }))
      .finally(() => setAVerificarSessao(false));
  }, []);

  // Se a sessão expirar durante o uso, volta ao ecrã de entrada.
  useEffect(
    () =>
      repository.aoPerderSessao(() => {
        setSessao(null);
        setToast({ text: 'A sessão terminou. Inicie sessão novamente.', error: true });
      }),
    [],
  );

  async function login(email: string, palavraPasse: string) {
    const utilizador = await autenticacao.entrar(email, palavraPasse);

    await repository.carregar();
    setSessao(utilizador);
    setToast(null);
  }

  async function logout() {
    await autenticacao.sair().catch(() => undefined);
    repository.limpar();
    setSessao(null);
    setToast(null);
  }

  // Ponto usado pelos ecrãs: executa a operação e converte o sucesso ou a exceção numa mensagem para o utilizador.
  async function act(command: Command, message?: string) {
    try {
      if (!user) throw Error('Inicie sessão.');

      const result = await repository.command(command);

      if (message) setToast({ text: message, error: false });

      return { ok: true, result };
    } catch (error) {
      // Sem sessão, o aviso já foi dado por aoPerderSessao.
      if (!(error instanceof ErroApi && error.semSessao)) {
        setToast({
          text: error instanceof Error ? error.message : 'Não foi possível concluir a operação.',
          error: true,
        });
      }

      return { ok: false };
    }
  }

  return (
    <Context.Provider
      value={{
        db,
        user,
        aVerificarSessao,
        login,
        logout,
        act,
        toast,
        clearToast: () => setToast(null),
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useApp() {
  const app = useContext(Context);

  if (!app) throw Error('Falta o Provider.');

  return app;
}
