import type { Command, Database } from '../domain';
import { criarRepositorioHttp } from './repositoryHttp';

/** Ponto único de acesso aos dados. Os dados estão sempre no servidor (MongoDB). */
export interface Repository {
  snapshot(): Database;
  subscribe(listener: () => void): () => void;
  /** Avisa quando a sessão termina sem ser pelo botão "Terminar sessão" (por exemplo, expirou). */
  aoPerderSessao(aviso: () => void): () => void;
  /** Carrega os dados depois de iniciada a sessão e passa a acompanhar as alterações. */
  carregar(): Promise<void>;
  /** Esquece os dados ao terminar a sessão. */
  limpar(): void;
  /** O utilizador é o da sessão: o servidor não aceita outro. */
  command(command: Command): Promise<string | undefined>;
}

export const repository: Repository = criarRepositorioHttp();
