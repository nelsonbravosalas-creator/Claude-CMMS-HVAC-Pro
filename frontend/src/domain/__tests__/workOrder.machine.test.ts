import { describe, it, expect } from 'vitest';
import { workOrderMachine, type WorkOrderContext } from '../workOrders/workOrder.machine';

const todoListo: WorkOrderContext = { totalAssets: 3, completedAssets: 3, allSigned: true };

describe('OT — máquina de estados', () => {
  it('supervisor puede abrir → en_progreso', () => {
    expect(workOrderMachine.can('abierto', 'en_progreso', 'supervisor', todoListo).ok).toBe(true);
  });

  it('técnico NO puede abrir → en_progreso', () => {
    const r = workOrderMachine.can('abierto', 'en_progreso', 'tecnico', todoListo);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('FORBIDDEN_ROLE');
  });

  it('no completa si quedan equipos pendientes', () => {
    const ctx: WorkOrderContext = { totalAssets: 3, completedAssets: 2, allSigned: true };
    const r = workOrderMachine.can('en_progreso', 'completado', 'tecnico', ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('OT_ASSETS_PENDIENTES');
  });

  it('no completa si hay informes sin firmar', () => {
    const ctx: WorkOrderContext = { totalAssets: 3, completedAssets: 3, allSigned: false };
    const r = workOrderMachine.can('en_progreso', 'completado', 'tecnico', ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('OT_INFORMES_SIN_FIRMAR');
  });

  it('completa cuando todo está listo y firmado', () => {
    expect(workOrderMachine.can('en_progreso', 'completado', 'tecnico', todoListo).ok).toBe(true);
  });

  it('transición inválida abierto → cerrado', () => {
    const r = workOrderMachine.can('abierto', 'cerrado', 'administrador', todoListo);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('INVALID_TRANSITION');
  });

  it('cerrado es terminal', () => {
    expect(workOrderMachine.isTerminal('cerrado')).toBe(true);
    expect(workOrderMachine.next('completado')).toEqual(['cerrado']);
  });
});
