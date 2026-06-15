/**
 * AuthContext — CMMS HVAC PRO
 *
 * Maneja:
 * - JWT (almacenado en memoria, no localStorage)
 * - PIN offline hasheado en IndexedDB
 * - Sesión del usuario (rol, cliente_id, nombre)
 * - Login / Logout / refresh automático
 *
 * RN-SEG-04: Altas/ediciones de usuario son online-only.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { User } from '@/db/types';

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type AuthUser = Pick<
  User,
  'user_id' | 'cliente_id' | 'nombre' | 'email' | 'rol' | 'estado'
>;

interface AuthState {
  user: AuthUser | null;
  /** JWT en memoria (no persiste entre recargas; se refresca por cookie httpOnly) */
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  loginWithPin: (pin: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Persiste PIN hasheado en IndexedDB para uso offline */
  setupPin: (pin: string) => Promise<void>;
  hasPinSetup: boolean;
}

// ─── API base ────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'include', // para cookie httpOnly del JWT
    ...init,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── PIN helpers (PBKDF2 via Web Crypto) ─────────────────────────────────────

const PIN_IDB_KEY = 'cmms_pin_hash';
const PIN_SALT_KEY = 'cmms_pin_salt';

async function hashPin(pin: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    // new Uint8Array(salt) garantiza ArrayBuffer simple (fix TS 5.7 strict generics)
    { name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array(salt), iterations: 100_000 },
    keyMaterial, 256,
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

function saveToLocalStorage(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* storage full */ }
}
function loadFromLocalStorage(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

async function persistPin(pin: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await hashPin(pin, salt);
  saveToLocalStorage(PIN_SALT_KEY, btoa(String.fromCharCode(...salt)));
  saveToLocalStorage(PIN_IDB_KEY, hash);
}

async function verifyPin(pin: string): Promise<boolean> {
  const saltB64 = loadFromLocalStorage(PIN_SALT_KEY);
  const storedHash = loadFromLocalStorage(PIN_IDB_KEY);
  if (!saltB64 || !storedHash) return false;
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  const inputHash = await hashPin(pin, salt);
  return inputHash === storedHash;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const [hasPinSetup, setHasPinSetup] = useState(false);

  // Intenta restaurar sesión desde cookie httpOnly al montar
  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<{ user: AuthUser; token: string }>('/api/auth/me');
        setState({ user: data.user, token: data.token, isLoading: false, isAuthenticated: true });
      } catch {
        setState(s => ({ ...s, isLoading: false }));
      }
      setHasPinSetup(!!loadFromLocalStorage(PIN_IDB_KEY));
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{ user: AuthUser; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setState({ user: data.user, token: data.token, isLoading: false, isAuthenticated: true });
  }, []);

  const loginWithPin = useCallback(async (pin: string) => {
    const valid = await verifyPin(pin);
    if (!valid) throw new Error('PIN incorrecto');
    // Con PIN verificado, intentar refresh del JWT vía cookie
    const data = await apiFetch<{ user: AuthUser; token: string }>('/api/auth/refresh');
    setState({ user: data.user, token: data.token, isLoading: false, isAuthenticated: true });
  }, []);

  const logout = useCallback(async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
  }, []);

  const setupPin = useCallback(async (pin: string) => {
    await persistPin(pin);
    setHasPinSetup(true);
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, login, loginWithPin, logout, setupPin, hasPinSetup }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
