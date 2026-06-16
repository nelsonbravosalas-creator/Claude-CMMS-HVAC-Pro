import { useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema.v16';
import { useAuth } from '@/context/AuthContext';
import { useFormTemplate } from '@/hooks/useFormTemplates';
import { FieldRenderer } from '@/components/forms/FieldRenderer';
import { aplicarBinding } from '@/lib/binding/bindingEngine';
import {
  detectarHallazgo,
  todosRequeridosCompletos,
  contarHallazgos,
} from '@/lib/forms/hallazgoDetector';
import type { FormInstance, FormTemplateField } from '@/db/types';

// Debounce auto-save delay in ms
const AUTOSAVE_DELAY = 600;

export function FormInstancePage() {
  const { workOrderId, assetId } = useParams<{ workOrderId: string; assetId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load asset from Dexie
  const asset = useLiveQuery(
    () => (assetId ? db.work_order_assets.get(assetId) : undefined),
    [assetId],
  );

  // Load equipment for tipo_de_equipo_id
  const equipo = useLiveQuery(
    () => (asset?.tag ? db.equipos.get(asset.tag) : undefined),
    [asset?.tag],
  );

  // Load form template
  const { template, isLoading: templateLoading } = useFormTemplate(equipo?.tipo_de_equipo_id);

  // Load or create form instance
  const formInstance = useLiveQuery(async () => {
    if (!assetId || !workOrderId || !user?.cliente_id) return undefined;

    // Look for existing instance linked to this asset
    const existing = await db.form_instances
      .where('[work_order_id+work_order_asset_id]')
      .equals([workOrderId, assetId])
      .first();

    if (existing) return existing;

    // Create new instance
    if (!template) return undefined;

    const newInstance: FormInstance = {
      form_instance_id: crypto.randomUUID(),
      work_order_id: workOrderId,
      work_order_asset_id: assetId,
      cliente_id: user.cliente_id,
      tag: asset?.tag,
      form_template_id: template.form_template_id,
      datos: {},
      estado: 'en_progreso',
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db.form_instances.add(newInstance);

    // Mark asset as in_progress
    if (asset && asset.estado === 'pendiente') {
      await db.work_order_assets.update(assetId, {
        estado: 'en_progreso',
        updated_at: new Date(),
      });
    }

    return newInstance;
  }, [assetId, workOrderId, user?.cliente_id, template, asset]);

  const respuestas: Record<string, unknown> = (formInstance?.datos as Record<string, unknown>) ?? {};

  const handleFieldChange = useCallback((fieldId: string, value: unknown) => {
    if (!formInstance) return;
    if (formInstance.estado === 'firmado') return;

    // Optimistic local update (debounced write to Dexie)
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        const updatedDatos = { ...respuestas, [fieldId]: value };
        await db.form_instances.update(formInstance.form_instance_id, {
          datos: updatedDatos,
          estado: 'en_progreso',
          updated_at: new Date(),
        });
      } finally {
        setSaving(false);
      }
    }, AUTOSAVE_DELAY);
  }, [formInstance, respuestas]);

  const handleComplete = async () => {
    if (!formInstance || !template || !workOrderId || !assetId) return;
    setCompleting(true);
    setErrorMsg(null);
    try {
      // Run binding engine and update OT narratives
      const ot = await db.work_orders.get(workOrderId);
      if (ot) {
        const updates = aplicarBinding(template, respuestas, ot);
        if (Object.keys(updates).length > 0) {
          await db.work_orders.update(workOrderId, { ...updates, updated_at: new Date() });
        }
      }

      // Mark form instance as completed
      await db.form_instances.update(formInstance.form_instance_id, {
        estado: 'completado',
        updated_at: new Date(),
      });

      // Mark asset as completed
      await db.work_order_assets.update(assetId, {
        estado: 'completado',
        form_instance_id: formInstance.form_instance_id,
        updated_at: new Date(),
      });

      navigate(`/app/ot/${workOrderId}`, { replace: true });
    } catch {
      setErrorMsg('Error al completar. Intente nuevamente.');
    } finally {
      setCompleting(false);
    }
  };

  // Loading states
  if (!asset || templateLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[var(--color-fg-muted)]">Cargando formulario...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 px-4">
        <p className="text-sm text-[var(--color-fg-muted)] text-center">
          No se encontró plantilla de formulario para este tipo de equipo.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-[var(--color-primary)] hover:underline"
        >
          Volver
        </button>
      </div>
    );
  }

  if (!formInstance) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isReadonly = formInstance.estado === 'firmado' || formInstance.estado === 'anulado';
  const camposOrdenados = [...template.campos].sort((a, b) => a.orden - b.orden);
  const firmaCampo = camposOrdenados.find(c => c.tipo === 'firma');
  const firmaValor = firmaCampo ? (respuestas[firmaCampo.id] as string) : undefined;

  const puedeCompletar = todosRequeridosCompletos(template.campos, respuestas, firmaValor);
  const totalCampos = template.campos.length;
  const camposLlenos = template.campos.filter((c: FormTemplateField) => {
    const v = respuestas[c.id];
    return v !== undefined && v !== '' && v !== null;
  }).length;
  const hallazgos = contarHallazgos(template.campos, respuestas);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/app/ot/${workOrderId}`)}
            className="p-1.5 rounded-lg hover:bg-[var(--color-hover)] transition-colors"
            aria-label="Volver"
          >
            <svg className="w-5 h-5 text-[var(--color-fg-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[var(--color-fg-muted)] font-mono truncate">
              {asset.tag}
            </p>
            <h1 className="text-sm font-semibold text-[var(--color-fg)] truncate">
              {template.nombre}
            </h1>
          </div>
          {saving && (
            <span className="text-[10px] font-mono text-[var(--color-fg-faint)]">guardando…</span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-3 space-y-1">
          <div className="h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
              style={{ width: `${totalCampos > 0 ? (camposLlenos / totalCampos) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-[var(--color-fg-faint)] font-mono">
              {camposLlenos}/{totalCampos} campos
            </span>
            {hallazgos > 0 && (
              <span className="text-[10px] font-mono text-[var(--color-error)] font-bold">
                ⚠ {hallazgos} hallazgo{hallazgos !== 1 ? 's' : ''}
              </span>
            )}
            <span className={[
              'text-[10px] font-mono px-2 py-0.5 rounded-full',
              formInstance.estado === 'completado'
                ? 'bg-[var(--color-success)]/20 text-[var(--color-success)]'
                : formInstance.estado === 'firmado'
                  ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                  : 'bg-[var(--color-border)] text-[var(--color-fg-muted)]',
            ].join(' ')}>
              {formInstance.estado}
            </span>
          </div>
        </div>
      </header>

      {/* Form body */}
      <main className="flex-1 px-4 py-5 space-y-6 pb-32">
        {isReadonly && (
          <div className="rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 px-4 py-3 text-sm text-[var(--color-primary)]">
            Este formulario está {formInstance.estado} y no puede editarse.
          </div>
        )}

        {camposOrdenados.map(campo => {
          const valor = respuestas[campo.id];
          const esHallazgo = valor !== undefined && valor !== '' && valor !== null
            ? detectarHallazgo(campo, valor)
            : false;

          return (
            <div
              key={campo.id}
              className={[
                'rounded-xl border p-4 transition-colors',
                esHallazgo
                  ? 'border-[var(--color-error)]/40 bg-[var(--color-error)]/5'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)]',
              ].join(' ')}
            >
              <FieldRenderer
                field={campo}
                value={valor}
                onChange={v => handleFieldChange(campo.id, v)}
                disabled={isReadonly}
              />
            </div>
          );
        })}

        {errorMsg && (
          <p className="text-sm text-[var(--color-error)] text-center">{errorMsg}</p>
        )}
      </main>

      {/* Footer — sticky action */}
      {!isReadonly && (
        <footer className="fixed bottom-0 left-0 right-0 z-20 bg-[var(--color-surface)] border-t border-[var(--color-border)] px-4 py-4 safe-area-inset-bottom">
          {hallazgos > 0 && (
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 px-3 py-2">
              <span className="text-[var(--color-error)] text-sm">⚠</span>
              <p className="text-xs text-[var(--color-error)]">
                Se detectaron <strong>{hallazgos} hallazgo{hallazgos !== 1 ? 's' : ''}</strong>.
                Se registrarán automáticamente en la OT al completar.
              </p>
            </div>
          )}

          <button
            onClick={handleComplete}
            disabled={!puedeCompletar || completing}
            className={[
              'w-full py-3.5 rounded-xl text-sm font-semibold transition-all',
              puedeCompletar && !completing
                ? 'bg-[var(--color-primary)] text-white hover:opacity-90 active:scale-[0.98]'
                : 'bg-[var(--color-border)] text-[var(--color-fg-faint)] cursor-not-allowed',
            ].join(' ')}
          >
            {completing
              ? 'Completando...'
              : puedeCompletar
                ? 'Completar formulario'
                : `Faltan ${template.campos.filter((c: FormTemplateField) => c.requerido && (respuestas[c.id] === undefined || respuestas[c.id] === '' || respuestas[c.id] === null)).length} campos requeridos`
            }
          </button>
        </footer>
      )}
    </div>
  );
}
