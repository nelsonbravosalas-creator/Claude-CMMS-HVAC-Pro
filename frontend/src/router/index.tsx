/**
 * Router — CMMS HVAC PRO
 *
 * React Router v7 — Library mode (createBrowserRouter)
 *
 * Estructura:
 *   /                       → redirect a /app/dashboard
 *   /login                  → LoginPage (público)
 *   /app/                   → AppLayout (protegido, requiere auth)
 *     dashboard             → DashboardPage
 *     ot                    → OTListPage
 *     ot/:id                → OTDetailPage (Sprint 2)
 *     equipos               → EquiposPage (Sprint 2)
 *     equipos/:tag          → EquipoDetallePage (Sprint 2)
 *     mp                    → MpListPage (Sprint 5)
 *     tickets               → TicketsPage (Sprint 5)
 *     inventario            → InventarioPage (Sprint 5)
 *     admin/                → AdminLayout (rol: programador | administrador)
 *       zonas               → ZonasPage (Sprint 3)
 *       tipos               → TiposEquipoPage (Sprint 3)
 *       equipos-admin       → EquiposAdminPage (Sprint 3)
 *       usuarios            → UsuariosPage (Sprint 3)
 *   *                       → NotFoundPage
 */

import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { AppLayout } from '@/layouts/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { OTListPage } from '@/pages/ot/OTListPage';
import { OTDetailPage } from '@/pages/ot/OTDetailPage';
import { FormInstancePage } from '@/pages/ot/FormInstancePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProtectedRoute } from './ProtectedRoute';
// Sprint 3
import { EquiposPage } from '@/pages/equipos/EquiposPage';
import { EquipoDetallePage } from '@/pages/equipos/EquipoDetallePage';
import { ZonasPage } from '@/pages/admin/ZonasPage';
import { TiposEquipoPage } from '@/pages/admin/TiposEquipoPage';
import { EquiposAdminPage } from '@/pages/admin/EquiposAdminPage';
import { UsuariosPage } from '@/pages/admin/UsuariosPage';

// Placeholder para módulos de sprints futuros
const ComingSoonPage = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-64 gap-3">
    <p className="font-mono text-xs text-[var(--color-fg-faint)] uppercase tracking-widest">
      En construcción
    </p>
    <p className="text-2xl font-bold text-[var(--color-fg-secondary)]">{title}</p>
    <p className="text-sm text-[var(--color-fg-muted)]">Sprint siguiente</p>
  </div>
);

export const router = createBrowserRouter([
  // Raíz → redirige al dashboard
  { index: true, element: <Navigate to="/app/dashboard" replace /> },

  // Login (público)
  { path: 'login', element: <LoginPage /> },

  // App (protegido)
  {
    path: 'app',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'ot', element: <OTListPage /> },
      { path: 'ot/:id', element: <OTDetailPage /> },
      { path: 'ot/:workOrderId/assets/:assetId/form', element: <FormInstancePage /> },
      { path: 'equipos', element: <EquiposPage /> },
      { path: 'equipos/:tag', element: <EquipoDetallePage /> },
      { path: 'mp', element: <ComingSoonPage title="Mantenimiento Preventivo" /> },
      { path: 'tickets', element: <ComingSoonPage title="Tickets" /> },
      { path: 'inventario', element: <ComingSoonPage title="Inventario" /> },
      {
        path: 'admin',
        element: (
          <ProtectedRoute roles={['programador', 'administrador']}>
            <Outlet />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate to="zonas" replace /> },
          { path: 'zonas', element: <ZonasPage /> },
          { path: 'tipos', element: <TiposEquipoPage /> },
          { path: 'equipos', element: <EquiposAdminPage /> },
          { path: 'usuarios', element: <UsuariosPage /> },
        ],
      },
    ],
  },

  // 404
  { path: '*', element: <NotFoundPage /> },
]);
