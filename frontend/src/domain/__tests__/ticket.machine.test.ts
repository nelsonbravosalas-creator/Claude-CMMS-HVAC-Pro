import { describe, it, expect } from 'vitest';
import { ticketMachine, type TicketContext } from '../tickets/ticket.machine';

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
