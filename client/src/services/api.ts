/** Pedidos à API (pasta bd/). O cookie da sessão vai automaticamente em cada pedido. */

/** Erro devolvido pela API, com a mensagem a mostrar e, num formulário, os erros por campo. */
export class ErroApi extends Error {
  constructor(
    readonly codigo: number,
    mensagem: string,
    readonly erros: Record<string, string> = {},
  ) {
    super(mensagem);
  }

  /** 401: não há sessão iniciada (ou expirou). */
  get semSessao() {
    return this.codigo === 401;
  }
}

export const SEM_LIGACAO =
  'Sem ligação ao servidor. Confirme que o programa foi iniciado com "npm run bd".';

export type ClienteApi = <T>(caminho: string, corpo?: unknown) => Promise<T | null>;

/**
 * Cria a função que fala com a API.
 * - No navegador, `base` fica vazia: o Vite encaminha /api para o servidor (mesma origem).
 * - Nos testes, `base` é o endereço do servidor e `cabecalhos` leva o cookie da sessão.
 */
export function criarClienteApi(base = '', cabecalhos: Record<string, string> = {}): ClienteApi {
  return async <T>(caminho: string, corpo?: unknown): Promise<T | null> => {
    let resposta: Response;

    try {
      resposta = await fetch(base + caminho, {
        method: corpo === undefined ? 'GET' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...cabecalhos },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
      });
    } catch {
      throw new ErroApi(0, SEM_LIGACAO);
    }

    if (resposta.status === 204) return null;

    const dados = await resposta.json().catch(() => null);

    if (!resposta.ok) {
      // Sem resposta JSON (por exemplo, o Vite sem o servidor da API ligado).
      const mensagem = dados?.mensagem || (resposta.status >= 500 ? SEM_LIGACAO : '');

      throw new ErroApi(
        resposta.status,
        mensagem || 'Não foi possível concluir a operação.',
        dados?.erros || {},
      );
    }

    return dados as T;
  };
}
