/**
 * LoginPage — CMMS HVAC PRO
 *
 * Dos modos:
 *   - Email + contraseña (online)
 *   - PIN de 4 dígitos (offline, si el PIN fue configurado previamente)
 *
 * Diseño: industrial / técnico, funciona con los 3 temas.
 */

import { useState, useRef, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '@/context/AuthContext';

type Mode = 'password' | 'pin';

// ─── PIN Input ────────────────────────────────────────────────────────────────

function PinInput({ onComplete }: { onComplete: (pin: string) => void }) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 3) refs[i + 1].current?.focus();
    if (next.every(d => d !== '')) onComplete(next.join(''));
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs[i - 1].current?.focus();
  };

  return (
    <div className="flex gap-3 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          className={[
            'w-14 h-14 text-center text-2xl font-bold rounded-lg',
            'bg-[var(--color-card)] border-2 transition-all duration-150',
            'text-[var(--color-fg)] outline-none',
            d
              ? 'border-[var(--color-primary)] shadow-[0_0_12px_-2px_var(--color-primary)]'
              : 'border-[var(--color-border-strong)] focus:border-[var(--color-primary)]',
          ].join(' ')}
        />
      ))}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export function LoginPage() {
  const { login, loginWithPin, hasPinSetup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/app/dashboard';

  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      void navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handlePinComplete = async (pin: string) => {
    setError('');
    setLoading(true);
    try {
      await loginWithPin(pin);
      void navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PIN incorrecto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--color-base)] flex">
      {/* Panel izquierdo — marca / contexto (solo desktop) */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-10 border-r border-[var(--color-border)] relative overflow-hidden"
        style={{ background: 'var(--color-surface)' }}
      >
        {/* Patrón de fondo técnico */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg,transparent,transparent 39px,var(--color-fg) 39px,var(--color-fg) 40px),' +
              'repeating-linear-gradient(90deg,transparent,transparent 39px,var(--color-fg) 39px,var(--color-fg) 40px)',
          }}
        />

        <div className="relative z-10">
          {/* Logo */}
          <div className="mb-12">
            <div className="font-sans font-bold text-4xl tracking-[0.2em] uppercase text-[var(--color-primary)]">
              CMMS
            </div>
            <div className="font-mono text-sm text-[var(--color-fg-faint)] tracking-widest uppercase">
              HVAC PRO
            </div>
          </div>

          {/* Tagline */}
          <h1 className="font-sans font-bold text-3xl text-[var(--color-fg)] leading-tight mb-4">
            Gestión inteligente de mantenimiento
          </h1>
          <p className="text-[var(--color-fg-muted)] text-sm leading-relaxed">
            Órdenes de trabajo, checklists, activos y mantenimiento preventivo — offline-first, sin límites de señal.
          </p>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-3">
          {[
            ['◈', 'Multi-activo · Multi-zona'],
            ['◷', 'Mantenimiento preventivo automático'],
            ['▣', 'Checklists configurables por tipo de equipo'],
            ['⬡', '100% offline-first (PWA)'],
          ].map(([icon, text]) => (
            <div key={text} className="flex items-center gap-3">
              <span className="text-[var(--color-primary)] text-sm w-5 text-center">{icon}</span>
              <span className="text-xs text-[var(--color-fg-muted)] font-mono tracking-wide">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-10">
            <div className="font-bold text-3xl tracking-[0.2em] uppercase text-[var(--color-primary)]">CMMS</div>
            <div className="font-mono text-xs text-[var(--color-fg-faint)] tracking-widest uppercase">HVAC PRO</div>
          </div>

          {/* Selector modo */}
          {hasPinSetup && (
            <div className="flex mb-8 bg-[var(--color-card)] rounded-lg p-1 border border-[var(--color-border)]">
              {(['password', 'pin'] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(''); }}
                  className={[
                    'flex-1 py-2 text-xs font-semibold tracking-widest uppercase rounded-md transition-all',
                    mode === m
                      ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
                      : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]',
                  ].join(' ')}
                >
                  {m === 'password' ? 'Contraseña' : 'PIN offline'}
                </button>
              ))}
            </div>
          )}

          {/* Título del formulario */}
          <div className="mb-6">
            <h2 className="font-bold text-xl text-[var(--color-fg)] tracking-wide">
              {mode === 'password' ? 'Iniciar sesión' : 'Acceso offline'}
            </h2>
            <p className="text-xs text-[var(--color-fg-muted)] mt-1 font-mono">
              {mode === 'password'
                ? 'Ingresa tus credenciales'
                : 'Ingresa tu PIN de 4 dígitos'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-sm text-[var(--color-danger)]">
              {error}
            </div>
          )}

          {/* Formulario contraseña */}
          {mode === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="tecnico@empresa.cl"
                  className={[
                    'w-full px-4 py-3 rounded-lg text-sm font-mono',
                    'bg-[var(--color-card)] border border-[var(--color-border-strong)]',
                    'text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)]',
                    'focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30',
                    'transition-all duration-150',
                  ].join(' ')}
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-faint)] mb-1.5">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={[
                    'w-full px-4 py-3 rounded-lg text-sm font-mono',
                    'bg-[var(--color-card)] border border-[var(--color-border-strong)]',
                    'text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)]',
                    'focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30',
                    'transition-all duration-150',
                  ].join(' ')}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={[
                  'w-full py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase',
                  'bg-[var(--color-primary)] text-[var(--color-primary-fg)]',
                  'hover:opacity-90 active:opacity-80 transition-opacity',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'shadow-[var(--shadow-glow)]',
                ].join(' ')}
              >
                {loading ? 'Verificando…' : 'Ingresar'}
              </button>
            </form>
          )}

          {/* Formulario PIN */}
          {mode === 'pin' && (
            <div className="space-y-6">
              <PinInput onComplete={handlePinComplete} />
              {loading && (
                <p className="text-center font-mono text-xs text-[var(--color-fg-faint)] animate-pulse">
                  Verificando PIN…
                </p>
              )}
            </div>
          )}

          {/* Footer */}
          <p className="mt-8 text-center font-mono text-[10px] text-[var(--color-fg-faint)]">
            CMMS HVAC PRO · Versión 1.0
          </p>
        </div>
      </div>
    </div>
  );
}
