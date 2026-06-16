import { describe, it, expect } from 'vitest';
import { ticketMachine, transicionesDisponibles, type TicketContext } from '../tickets/ticket.machine';

const sinEvidencia: TicketContext = {};
const conTexto: TicketContext = { evidencia: { texto: 'Se reemplazó el capacitor del compresor.' } };
const conFoto: TicketContext = { evidencia: { foto: true } };

describe('Ticket — máquina de estados', () => {
  it('cualquiera avanza abierto → en_progreso', () => {
    expect(ticketMachine.can('abierto', 'en_progreso', 'tecnico', sinEvidencia).ok).toBe(true);
    expect(ticketMachine.can('abierto', 'en_progreso', 'cliente', sinEvidencia).ok).toBe(true);
  });

  it('resolver sin evidencia falla', () => {
    const r = ticketMachine.can('en_progreso', 'resuelto', 'supervisor', sinEvidencia);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('EVIDENCIA_REQUERIDA');
  });

  it('resolver con texto ≥ 20 chars funciona', () => {
    expect(ticketMachine.can('en_progreso', 'resuelto', 'supervisor', conTexto).ok).toBe(true);
  });

  it('técnico NO puede resolver', () => {
    const r = ticketMachine.can('en_progreso', 'resuelto', 'tecnico', conTexto);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('FORBIDDEN_ROLE');
  });

  it('cliente devuelve resuelto → observado con foto', () => {
    expect(ticketMachine.can('resuelto', 'observado', 'cliente', conFoto).ok).toBe(true);
  });

  it('técnico cierra resuelto → cerrado (evidencia opcional)', () => {
    expect(ticketMachine.can('resuelto', 'cerrado', 'tecnico', sinEvidencia).ok).toBe(true);
  });

  it('cerrado es terminal', () => {
    expect(ticketMachine.isTerminal('cerrado')).toBe(true);
  });
});

describe('Ticket — transicionesDisponibles (botones de acción)', () => {
  it('técnico solo ve en_progreso desde abierto (resuelto es de supervisor/cliente)', () => {
    expect(transicionesDisponibles('abierto', 'tecnico')).toEqual(['en_progreso']);
  });

  it('supervisor ve resuelto desde en_progreso (observado es solo de cliente)', () => {
    expect(transicionesDisponibles('en_progreso', 'supervisor')).toEqual(['resuelto']);
  });

  it('cliente ve resuelto y observado desde en_progreso', () => {
    expect(transicionesDisponibles('en_progreso', 'cliente')).toEqual(['resuelto', 'observado']);
  });

  it('cerrado no tiene transiciones disponibles para nadie', () => {
    expect(transicionesDisponibles('cerrado', 'administrador')).toEqual([]);
  });

  it('programador NO tiene corto-circuito a nivel de máquina de estados (solo en permissions.ts)', () => {
    expect(transicionesDisponibles('observado', 'programador')).toEqual(['en_progreso']);
  });
});
