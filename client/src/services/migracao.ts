import type { Database, Request, User, Version } from '../domain';

/** Mantém os pedidos locais antigos; empresas e categorias deixam de integrar o modelo. */
export function migrarDados(valor: unknown): Database | null {
  if (!valor || typeof valor !== 'object') return null;

  const anterior = valor as Database;

  if (
    ![2, 3].includes(anterior.schema) ||
    !Array.isArray(anterior.requests) ||
    !Array.isArray(anterior.users)
  ) {
    return null;
  }

  const copy = structuredClone(anterior);

  copy.schema = 3;

  copy.users = copy.users.map((u) => {
    const { company: _, ...rest } = u as User & { company?: string };

    return rest;
  });

  copy.requests = copy.requests.map((r) => {
    const {
      company: _,
      category: __,
      ...rest
    } = r as Request & { company?: string; category?: string };

    return {
      ...rest,
      author: copy.users.find((u) => u.id === r.submittedBy)?.name || 'Utilizador Removido',
      workspaceCreatedAt: r.workspace ? r.workspaceCreatedAt || r.date : '',
      members: r.workspace ? [...new Set([r.submittedBy, ...r.members])] : [r.submittedBy],
      versions: r.versions.map((v) => {
        const { category: _, ...rest } = v as Version & { category?: string };

        return { ...rest, product: v.product || r.product };
      }),
    };
  });

  delete (copy as Database & { categories?: string[] }).categories;

  return copy;
}
