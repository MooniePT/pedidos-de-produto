import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { Heading, Toast } from './components';
import { type Role } from './domain';
import { Shell } from './layout/EstruturaAplicacao';
import { Auth } from './pages/Auth';
import { Invite, Lists, Notifications, Preferences } from './pages/Lists';
import {
  Decisions,
  Metrics,
  Roadmap,
  SprintCurrent,
  SprintHistory,
  SprintPrepare,
  Taxonomy,
} from './pages/Planning';
import { RequestDetail, RequestForm } from './pages/Requests';
import { useApp } from './state';

function Home() {
  const { user } = useApp();

  return <Navigate replace to={user?.role === 'manager' ? '/app/triagem' : '/app/pedidos'} />;
}

/** Protege os endereços por perfil. As operações também voltam a verificar o papel antes de alterar dados. */
function Guard({ roles }: { roles: Role[] }) {
  const { user } = useApp();

  return user && roles.includes(user.role) ? <Outlet /> : <Navigate to="/app" replace />;
}

/** Cada Route associa um endereço a um ecrã. A estrutura comum mantém-se durante a navegação. */
export function App() {
  const { aVerificarSessao } = useApp();

  // Enquanto se confirma se já existe sessão, não se decide para onde ir.
  if (aVerificarSessao) {
    return (
      <main className="startup">
        <p className="muted">A carregar…</p>
      </main>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Auth />} />

      <Route
        path="/convite"
        element={
          <main className="startup">
            <Invite />
            <Toast />
          </main>
        }
      />

      <Route path="/app" element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="pedidos" element={<Lists />} />
        <Route path="forum" element={<Lists forum />} />
        <Route path="pedidos/:id" element={<RequestDetail />} />
        <Route path="notificacoes" element={<Notifications />} />
        <Route path="preferencias" element={<Preferences />} />

        <Route element={<Guard roles={['customer', 'manager']} />}>
          <Route path="meus" element={<Lists mine />} />
          <Route path="novo" element={<RequestForm />} />
          <Route path="pedidos/:id/editar" element={<RequestForm edit />} />
        </Route>

        <Route element={<Guard roles={['manager']} />}>
          <Route path="triagem" element={<Lists triage />} />
          <Route path="sprint" element={<SprintCurrent />} />
          <Route path="preparar" element={<SprintPrepare />} />
          <Route path="historico" element={<SprintHistory />} />
          <Route path="historico/:id" element={<SprintHistory />} />
        </Route>

        <Route element={<Guard roles={['product']} />}>
          <Route path="decisoes" element={<Decisions />} />
          <Route path="roadmap" element={<Roadmap />} />
          <Route path="metricas" element={<Metrics />} />
          <Route path="tags" element={<Taxonomy />} />
        </Route>

        <Route
          path="*"
          element={
            <>
              <Heading title="Página não encontrada" />
              <NavLink to="/app">Voltar aos pedidos</NavLink>
            </>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
