/**
 * AppLayout — Shell principal de la aplicación
 *
 * Desktop: sidebar fija (260px) + área de contenido
 * Mobile:  barra de navegación inferior + contenido a full ancho
 *
 * La navegación se filtra dinámicamente según el rol del usuario (RBAC).
 */

import { Outlet, NavLink, useNavigate } from 'react-router';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme, THEMES } from '@/components/ui/ThemeProvider';
import type { User } from '@/db/types';

// ─── Mapa de navegación ──────────────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  path: string;
  roles: User['rol'][];
  section?: 'main' | 'admin';
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    shortLabel: 'Home',
    icon: '⬡',
    path: '/app/dashboard',
    roles: ['programador', 'administrador', 'supervisor', 'tecnico', 'cliente'],
    section: 'main',
  },
  {
    id: 'ot',
    label: 'Órdenes de Trabajo',
    shortLabel: 'OT',
    icon: '◈',
    path: '/app/ot',
    roles: ['programador', 'administrador', 'supervisor', 'tecnico', 'cliente'],
    section: 'main',
  },
  {
    id: 'equipos',
    label: 'Equipos',
    shortLabel: 'Equipos',
    icon: '▣',
    path: '/app/equipos',
    roles: ['programador', 'administrador', 'supervisor', 'tecnico', 'cliente', 'proveedor'],
    section: 'main',
  },
  {
    id: 'mp',
    label: 'Mantención Preventiva',
    shortLabel: 'MP',
    icon: '◷',
    path: '/app/mp',
    roles: ['programador', 'administrador', 'supervisor', 'cliente'],
    section: 'main',
  },
  {
    id: 'tickets',
    label: 'Tickets',
    shortLabel: 'Tickets',
    icon: '◉',
    path: '/app/tickets',
    roles: ['programador', 'administrador', 'supervisor', 'cliente', 'proveedor'],
    section: 'main',
  },
  {
    id: 'inventario',
    label: 'Inventario',
    shortLabel: 'Stock',
    icon: '▤',
    path: '/app/inventario',
    roles: ['programador', 'administrador', 'supervisor', 'tecnico'],
    section: 'main',
  },
  // Sección admin — solo programador y administrador
  {
    id: 'admin-zonas',
    label: 'Zonas',
    shortLabel: 'Zonas',
    icon: '◻',
    path: '/app/admin/zonas',
    roles: ['programador', 'administrador'],
    section: 'admin',
  },
  {
    id: 'admin-tipos',
    label: 'Tipos de Equipo',
    shortLabel: 'Tipos',
    icon: '◱',
    path: '/app/admin/tipos',
    roles: ['programador', 'administrador'],
    section: 'admin',
  },
  {
    id: 'admin-equipos',
    label: 'Alta Equipos',
    shortLabel: 'Alta',
    icon: '⊞',
    path: '/app/admin/equipos',
    roles: ['programador', 'administrador'],
    section: 'admin',
  },
  {
    id: 'admin-usuarios',
    label: 'Usuarios',
    shortLabel: 'Usuarios',
    icon: '◎',
    path: '/app/admin/usuarios',
    roles: ['programador', 'administrador'],
    section: 'admin',
  },
];

// Badge de rol
const ROL_BADGE: Record<User['rol'], string> = {
  programador: 'PRG',
  administrador: 'ADM',
  supervisor: 'SUP',
  tecnico: 'TEC',
  cliente: 'CLI',
  proveedor: 'PRV',
};

// ─── Componentes internos ────────────────────────────────────────────────────

function SidebarNavLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold tracking-wide transition-all duration-150 group',
          isActive
            ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20'
            : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-white/5 border border-transparent',
        ].join(' ')
      }
    >
      <span className="text-base w-5 text-center flex-shrink-0 leading-none">
        {item.icon}
      </span>
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const mainItems = NAV_ITEMS.filter(
    i => i.section === 'main' && user && i.roles.includes(user.rol),
  );
  const adminItems = NAV_ITEMS.filter(
    i => i.section === 'admin' && user && i.roles.includes(user.rol),
  );

  const handleLogout = async () => {
    await logout();
    void navigate('/login');
  };

  const nextTheme = () => {
    const idx = THEMES.indexOf(theme);
    setTheme(THEMES[(idx + 1) % THEMES.length]);
  };

  return (
    <aside
      className="flex flex-col h-full bg-[var(--color-surface)] border-r border-[var(--color-border)]"
      style={{ width: 260 }}
    >
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[var(--color-border)] flex items-center justify-between">
        <div>
          <div
            className="font-sans font-bold text-lg tracking-widest uppercase text-[var(--color-primary)]"
            style={{ letterSpacing: '0.12em' }}
          >
            CMMS
          </div>
          <div
            className="font-mono text-[10px] text-[var(--color-fg-faint)] tracking-widest uppercase"
          >
            HVAC PRO
          </div>
        </div>
        {/* Botón cerrar en mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="text-[var(--color-fg-faint)] hover:text-[var(--color-fg)] transition-colors lg:hidden"
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        )}
      </div>

      {/* Nav principal */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {mainItems.map(item => (
          <SidebarNavLink key={item.id} item={item} />
        ))}

        {/* Sección admin */}
        {adminItems.length > 0 && (
          <>
            <div className="pt-4 pb-1 px-3">
              <span className="font-mono text-[10px] text-[var(--color-fg-faint)] uppercase tracking-[0.15em]">
                Administración
              </span>
            </div>
            {adminItems.map(item => (
              <SidebarNavLink key={item.id} item={item} />
            ))}
          </>
        )}
      </nav>

      {/* Footer: usuario + tema */}
      <div className="border-t border-[var(--color-border)] px-3 py-3 space-y-2">
        {/* Cambio de tema */}
        <button
          onClick={nextTheme}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-mono text-[var(--color-fg-faint)] hover:text-[var(--color-fg)] hover:bg-white/5 transition-colors"
        >
          <span>◑</span>
          <span className="uppercase tracking-widest">Tema: {theme}</span>
        </button>

        {/* Usuario */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-[var(--color-card)] border border-[var(--color-border)]">
          <div
            className="w-7 h-7 rounded-full bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 flex items-center justify-center font-mono text-[10px] font-bold text-[var(--color-primary)] flex-shrink-0"
          >
            {user ? ROL_BADGE[user.rol] : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-[var(--color-fg)] truncate">
              {user?.nombre ?? 'Usuario'}
            </div>
            <div className="font-mono text-[10px] text-[var(--color-fg-faint)] capitalize">
              {user?.rol ?? ''}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="text-[var(--color-fg-faint)] hover:text-[var(--color-danger)] transition-colors text-sm flex-shrink-0"
            aria-label="Cerrar sesión"
          >
            ⇥
          </button>
        </div>
      </div>
    </aside>
  );
}

// ─── Bottom nav (mobile) ─────────────────────────────────────────────────────

function BottomNav() {
  const { user } = useAuth();
  // Solo los 5 primeros módulos del rol del usuario
  const items = NAV_ITEMS.filter(
    i => i.section === 'main' && user && i.roles.includes(user.rol),
  ).slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex lg:hidden z-40">
      {items.map(item => (
        <NavLink
          key={item.id}
          to={item.path}
          className={({ isActive }) =>
            [
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-semibold tracking-wide transition-colors',
              isActive
                ? 'text-[var(--color-primary)]'
                : 'text-[var(--color-fg-faint)]',
            ].join(' ')
          }
        >
          <span className="text-lg leading-none">{item.icon}</span>
          <span>{item.shortLabel}</span>
        </NavLink>
      ))}
    </nav>
  );
}

// ─── AppLayout ────────────────────────────────────────────────────────────────

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-dvh bg-[var(--color-base)] overflow-hidden">
      {/* Sidebar desktop (permanente) */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Sidebar mobile (drawer) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer */}
          <div className="relative z-10 flex-shrink-0">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Área principal */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header mobile */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <span
            className="font-bold text-sm tracking-widest uppercase text-[var(--color-primary)]"
          >
            CMMS HVAC PRO
          </span>
        </header>

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav mobile */}
      <BottomNav />
    </div>
  );
}
