import { useEffect } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Toast } from '../components';
import { roleNames, type Role } from '../domain';
import { useApp } from '../state';

/** Estrutura comum aos quatro perfis: menu, cabeçalho, troca de perfil e área do ecrã atual. */
const nav: Record<Role, [string, string, string][]> = {
  customer: [
    ['/app/pedidos', 'Fórum público', 'da847.svg'],
    ['/app/meus', 'Os meus pedidos', '71d75.svg'],
  ],
  manager: [
    ['/app/forum', 'Fórum público', 'da847.svg'],
    ['/app/triagem', 'Triagem de pedidos', 'da847.svg'],
    ['/app/sprint', 'Sprint atual', '47740.svg'],
    ['/app/preparar', 'Preparar sprint', '71d75.svg'],
    ['/app/historico', 'Histórico de sprints', 'abe1c.svg'],
  ],
  product: [
    ['/app/forum', 'Fórum público', 'da847.svg'],
    ['/app/pedidos', 'Backlog de produto', 'da847.svg'],
    ['/app/decisoes', 'Pedidos por decidir', '71d75.svg'],
    ['/app/roadmap', 'Roadmap', '47740.svg'],
    ['/app/metricas', 'Métricas', '22f62.svg'],
    ['/app/tags', 'Tags', '05eab.svg'],
  ],
  developer: [['/app/pedidos', 'Os meus pedidos', 'da847.svg']],
};

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    'Os meus pedidos': 'M8 3h8v4H8z M6 5H4v16h16V5h-2 M8 12h8 M8 16h6',
    'Pedidos por decidir': 'M9 11l2 2 4-4 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    'Sprint atual': 'M4 4h16v16H4z M4 9h16 M9 9v11',
    'Preparar sprint': 'M4 5h16v15H4z M8 3v4 M16 3v4 M8 14h8 M12 10v8',
    'Histórico de sprints': 'M3 12a9 9 0 1 0 3-7 M3 3v5h5 M12 7v6l4 2',
    Roadmap: 'M4 4v16 M20 4v16 M4 6h10v5H4 M10 15h10v5H10',
    Métricas: 'M4 20h17 M7 16v-5 M12 16V5 M17 16V8',
    Tags: 'M3 3h8l10 10-8 8L3 11z M7 7h.01',
    Notificações: 'M6 9a6 6 0 0 1 12 0v6l2 2H4l2-2z M10 21h4',
    Preferências: 'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M9 15v6',
  };

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || 'M4 5h16v14H4z M4 13h5l2 3h2l2-3h5'} />
    </svg>
  );
}

function ScrollReset() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export function Shell() {
  const { db, user, logout } = useApp();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/" replace />;

  const unread = db.notifications.filter(
    (n) => n.user === user.id && !n.read && (user.preference === 'all' || n.relevant),
  ).length;

  return (
    <>
      <a href="#conteudo" className="skip-link">
        Saltar para o conteúdo
      </a>

      <aside className="sidebar">
        <NavLink className="brand" to="/app">
          <img src="/assets/4c665.png" width="32" height="32" alt="" />
          <span>
            <strong>Pedidos de produto</strong>
            <small>Gestão de ferramentas</small>
          </span>
        </NavLink>

        <div>
          <p className="nav-label">ÁREA DE TRABALHO</p>

          <nav aria-label="Navegação principal">
            {nav[user.role].map(([href, label, icon]) => (
              <NavLink key={href} to={href}>
                <NavIcon name={label} />
                {label}
              </NavLink>
            ))}

            <NavLink to="/app/notificacoes">
              <NavIcon name="Notificações" />
              Notificações {unread > 0 && <span className="nav-count">{unread}</span>}
            </NavLink>

            <NavLink to="/app/preferencias">
              <NavIcon name="Preferências" />
              Preferências
            </NavLink>
          </nav>
        </div>

        <div className="user-card">
          <span className="avatar">
            {user.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </span>
          <span>
            <strong>{user.name}</strong>
            <small>{roleNames[user.role]}</small>
          </span>
        </div>
      </aside>

      <header className="topbar">
        <div className="breadcrumb">
          <strong>Pedidos de produto</strong>
          <span>/</span>
          {roleNames[user.role]}
        </div>

        <div className="header-actions">
          <button
            className="signout"
            onClick={() => {
              void logout().then(() => navigate('/'));
            }}
          >
            Terminar sessão
          </button>
        </div>
      </header>

      <ScrollReset />

      <main id="conteudo" className="main">
        <Outlet key={user.id} />
      </main>

      <Toast />
    </>
  );
}
