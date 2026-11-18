/** Registo, início e fim de sessão (rotas /api/autenticacao do servidor). */
import type { User } from '../domain';
import { criarClienteApi, ErroApi } from './api';

export type UtilizadorSessao = Pick<User, 'id' | 'name' | 'email' | 'role'>;

type RespostaUtilizador = { utilizador: UtilizadorSessao };

const pedir = criarClienteApi();

/** Utilizador com sessão iniciada, ou null se não houver sessão. */
export async function obterSessao(): Promise<UtilizadorSessao | null> {
  try {
    return (await pedir<RespostaUtilizador>('/api/autenticacao/sessao'))!.utilizador;
  } catch (erro) {
    if (erro instanceof ErroApi && erro.semSessao) return null;

    throw erro;
  }
}

export async function entrar(email: string, palavraPasse: string): Promise<UtilizadorSessao> {
  return (await pedir<RespostaUtilizador>('/api/autenticacao/entrar', { email, palavraPasse }))!
    .utilizador;
}

/** O registo público cria sempre um cliente. Não inicia sessão. */
export async function registar(nome: string, email: string, palavraPasse: string) {
  await pedir('/api/autenticacao/registar', { nome, email, palavraPasse });
}

export async function sair() {
  await pedir('/api/autenticacao/sair', {});
}
