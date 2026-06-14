# Fase 0 — Reconciliación del Modelo · Entregables

**Estado:** scripts listos para aplicar en branch Neon `migration-v6`
**Origen:** entrevista de procesos 2026-06-12 + auditoría cruzada Reglas de Negocio v1.0 ↔ Spec Técnica v6.0

## Orden de aplicación (estricto)

| # | Archivo | Contenido |
|---|---|---|
| 1 | `001_fase0_correcciones_ddl.sql` | Correcciones F1–F9 + `codigo_num` en sucursales/tipos |
| 2 | `002_fase0_tablas_nuevas.sql` | 8 tablas nuevas + migración `asset_id` → `work_order_assets` + índices |
| 3 | `003_fase0_funciones_triggers.sql` | Triggers de RN-ACT-07, RN-OT-10/11, RN-FORM-08/09, RN-INV-04 |

```bash
# Con Neon CLI sobre el branch de migración:
neonctl branches create --name migration-v6 --parent main
psql $DATABASE_URL_MIGRATION -f 001_fase0_correcciones_ddl.sql
psql $DATABASE_URL_MIGRATION -f 002_fase0_tablas_nuevas.sql
psql $DATABASE_URL_MIGRATION -f 003_fase0_funciones_triggers.sql
```

## Entregables de cliente

| Archivo | Contenido |
|---|---|
| `src/db/schema.v16.ts` | Schema Dexie v16 (18 tablas) + función de upgrade v15→v16 |
| `shared/contracts/sync.ts` | Contrato zod actualizado: 15 entidades sync, esquemas RN-FORM, web push |

## Decisiones selladas que estos scripts implementan

- **OT multi-tag:** `work_orders.asset_id` eliminado → `work_order_assets` (RN-OT-09)
- **Cierre de OT:** trigger valida todos los tags `completado`/`omitido` (RN-OT-10)
- **Folio informe:** `INF-{cod_sucursal}.{cod_tipo}-{tag_correlativo}-{folio}` por secuencia (sucursal × tipo), no reinicia entre OTs (RN-FORM-09)
- **form_categories:** tabla extensible, admin agrega categorías sin DDL
- **Web push v1:** `users.push_subscription` + `notifications.push_enviado_at`
- **Tipos de OT:** 7 valores; `predictivo` reservado sin funcionalidad (roadmap v2)
- **Tag canónico:** sellado por servidor desde `asset_tag_sequences`; requiere `codigo_num` en sucursal y tipo (RN-ACT-06/07)

## Gap nuevo detectado al escribir los scripts

`sucursales.codigo_num` y `catalog_asset_types.codigo_num` no existían en ningún documento, pero RN-ACT-06 los requiere para componer el tag `0000012.0003.007`. Se agregaron en `001`. **Pendiente:** definir en la UI de admin quién asigna estos números (correlativo automático al crear sucursal/tipo, o manual).

## Checklist DoD Fase 0

- [ ] Branch `migration-v6` creado en Neon
- [ ] Scripts 001–003 aplicados sin errores
- [ ] Smoke test: crear cliente → sucursal (con codigo_num) → tipo (con codigo_num) → activo con tag `PEND.X` → verificar tag sellado
- [ ] Smoke test: crear OT + 2 work_order_assets + 2 form_instances → completar 1 → intentar cerrar OT → debe fallar con `CHECKLIST_INCOMPLETE`
- [ ] Smoke test: completar el 2.º informe → cerrar OT → OK → firmar → verificar informes en `firmado` e inmutables
- [ ] Smoke test: folio INF generado con formato correcto
- [ ] `schema.v16.ts` integrado en `dexie.ts` del frontend
- [ ] `shared/contracts/sync.ts` compilando en cliente y API
- [ ] Reglas RN-OT-09/10/11 y RN-FORM-09 incorporadas al documento de Reglas de Negocio (→ v1.1)

## Pendientes que NO son de Fase 0 (no bloquear por esto)

- Variables de entorno VAPID (Fase 3 — backend push service)
- Service Worker evento `push` (Fase 2)
- Vista `vw_checklist_<categoria>` para reportería (Fase 3)
- Roadmap v2: funcionalidad `predictivo`, categorías de `catalog_asset_types` extensibles, email/SMS
