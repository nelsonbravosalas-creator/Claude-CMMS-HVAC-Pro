import { describe, it, expect } from 'vitest';
import { can, permissionsOf } from '../permissions/permissions';

describe('RBAC — permisos por rol', () => {
  it('programador puede todo', () => {
    expect(can('programador', 'cliente:crear')).toBe(true);
    expect(can('programador', 'reporte:exportar_json')).toBe(true);
    expect(can('programador', 'sync:resolver_conflictos')).toBe(true);
  });

  it('técnico crea equipos pero no clientes', () => {
    expect(can('tecnico', 'equipo:crear')).toBe(true);
    expect(can('tecnico', 'cliente:crear')).toBe(false);
  });

  it('cliente crea y cierra tickets', () => {
    expect(can('cliente', 'ticket:crear')).toBe(true);
    expect(can('cliente', 'ticket:cerrar')).toBe(true);
  });

  it('solo programador exporta JSON', () => {
    expect(can('administrador', 'reporte:exportar_json')).toBe(false);
    expect(can('supervisor', 'reporte:exportar_json')).toBe(false);
    expect(can('programador', 'reporte:exportar_json')).toBe(true);
  });

  it('supervisor NO ve logs (solo admin/programador)', () => {
    expect(can('supervisor', 'logs:ver')).toBe(false);
    expect(can('administrador', 'logs:ver')).toBe(true);
  });

  it('permissionsOf devuelve un set coherente', () => {
    expect(permissionsOf('proveedor')).toContain('equipo:ver_hoja_vida');
    expect(permissionsOf('proveedor')).not.toContain('equipo:crear');
  });
});
