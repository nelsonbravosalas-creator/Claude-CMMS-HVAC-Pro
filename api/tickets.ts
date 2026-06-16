/**
 * GET   /api/tickets                          — Lista tickets (filtros: estado, tipo, prioridad, responsable_tecnico_id, tag)
 * GET   /api/tickets?id=:id                    — Detalle con comentarios
 * POST  /api/tickets                           — Crear ticket
 * PATCH /api/tickets?id=:id&action=transicionar — Cambiar estado (con evidencia si la transición lo exige)
 * PATCH /api/tickets?id=:id&action=comentar     — Agregar comentario sin cambiar estado
 * PATCH /api/tickets?id=:id&action=asignar      — Asignar responsable técnico y/o proveedor
 *
 * Reconciliación de esquema: ver db/migrations/005_sprint5_tickets.sql.
 * Las columnas legacy (reportado_por, asignado_a, contenido, adjunto_url) se
 * alias en los SELECT hacia los nombres del modelo TS (creador_user_id,
 * responsable_tecnico_user_id, texto, foto_url).
 *
 * La tabla de transiciones duplica a propósito
 * frontend/src/domain/tickets/ticket.machine.ts — es la fuente de verdad de
 * negocio, pero el backend no importa código del frontend (independencia de
 * bundle). Si cambian las reglas, actualizar ambos lados.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db';
import { verifyToken, extractBearer } from './_jwt';

type TicketState = 'abierto' | 'en_progreso' | 'observado' | 'resuelto' | 'cerrado';

const ESTADOS: readonly TicketState[] = ['abierto', 'en_progreso', 'observado', 'resuelto', 'cerrado'];
const TIPOS = ['correctivo', 'preventivo', 'consulta'] as const;
const PRIORIDADES = ['baja', 'media', 'alta', 'critica'] as const;

const MIN_TEXTO = 20;
const MAX_DEVUELTAS_POR_SEMANA = 5;

const cerrarRoles = ['administrador', 'supervisor', 'tecnico', 'cliente'] as const;
const asignarRoles = ['administrador', 'supervisor', 'cliente'] as const;
const crearRoles = ['administrador', 'supervisor', 'cliente'] as const;

interface TransitionRule {
  from: TicketState;
  to: TicketState;
  roles: readonly string[] | 'any';
  requiresEvidence: boolean;
}

// Espejo de ticket.machine.ts (RN-TICKET-01)
const TRANSITIONS: readonly TransitionRule[] = [
  { from: 'abierto',     to: 'en_progreso', roles: 'any',                        requiresEvidence: false },
  { from: 'en_progreso', to: 'resuelto',    roles: ['supervisor', 'cliente'],    requiresEvidence: true  },
  { from: 'en_progreso', to: 'observado',   roles: ['cliente'],                  requiresEvidence: true  },
  { from: 'resuelto',    to: 'observado',   roles: ['cliente'],                  requiresEvidence: true  },
  { from: 'resuelto',    to: 'cerrado',     roles: cerrarRoles,                  requiresEvidence: false },
  { from: 'observado',   to: 'en_progreso', roles: 'any',                        requiresEvidence: false },
  { from: 'observado',   to: 'resuelto',    roles: ['administrador', 'cliente'], requiresEvidence: true  },
  { from: 'observado',   to: 'cerrado',     roles: cerrarRoles,                  requiresEvidence: true  },
];

function hasRole(rol: string, roles: readonly string[] | 'any'): boolean {
  if (rol === 'programador') return true;
  return roles === 'any' || roles.includes(rol);
}

function tieneEvidencia(texto: string | undefined, fotoUrl: string | undefined): boolean {
  return (texto?.trim().length ?? 0) >= MIN_TEXTO || !!fotoUrl;
}

const TICKET_SELECT = sql`
  SELECT
    t.uuid_sync               AS ticket_id,
    t.cliente_id,
    t.sucursal_id,
    s.nombre                  AS sucursal_nombre,
    t.numero_correlativo,
    t.titulo,
    t.descripcion,
    t.tipo,
    t.prioridad,
    a.tag,
    a.nombre                  AS equipo_nombre,
    t.asignado_a               AS responsable_tecnico_user_id,
    ur.nombre                  AS responsable_tecnico_nombre,
    t.proveedor_asignado_id    AS proveedor_asignado_user_id,
    up.nombre                  AS proveedor_asignado_nombre,
    t.estado,
    t.reportado_por            AS creador_user_id,
    uc.nombre                  AS creador_nombre,
    t.created_at,
    t.updated_at,
    t.closed_at
  FROM tickets t
  LEFT JOIN sucursales s ON s.uuid_sync = t.sucursal_id
  LEFT JOIN assets     a ON a.uuid_sync = t.asset_id
  LEFT JOIN users      ur ON ur.uuid_sync = t.asignado_a
  LEFT JOIN users      up ON up.uuid_sync = t.proveedor_asignado_id
  LEFT JOIN users      uc ON uc.uuid_sync = t.reportado_por
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const rawToken = extractBearer(req.headers.authorization);
  if (!rawToken) return res.status(401).json({ message: 'No autenticado' });

  let payload;
  try {
    payload = await verifyToken(rawToken);
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }

  const { cliente_id, rol, user_id } = payload;
  const { id } = req.query;

  // ── Detalle ───────────────────────────────────────────────────────────────
  if (req.method === 'GET' && typeof id === 'string') {
    try {
      const [ticket] = await sql`
        ${TICKET_SELECT}
        WHERE t.uuid_sync = ${id} AND t.cliente_id = ${cliente_id} AND t.deleted_at IS NULL
      `;
      if (!ticket) return res.status(404).json({ message: 'Ticket no encontrado' });

      const comments = await sql`
        SELECT
          c.uuid_sync       AS ticket_comment_id,
          c.ticket_id,
          c.estado_anterior,
          c.estado_nuevo,
          c.contenido       AS texto,
          c.adjunto_url     AS foto_url,
          c.autor_id        AS creador_user_id,
          u.nombre          AS creador_nombre,
          c.created_at
        FROM ticket_comments c
        LEFT JOIN users u ON u.uuid_sync = c.autor_id
        WHERE c.ticket_id = ${id}
        ORDER BY c.created_at ASC
      `;

      return res.status(200).json({ ticket, comments });
    } catch (err) {
      console.error('[tickets/:id GET]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  // ── Lista ─────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { estado, tipo, prioridad, responsable_tecnico_id, tag } = req.query;

    try {
      const rows = await sql`
        ${TICKET_SELECT}
        WHERE t.cliente_id = ${cliente_id}
          AND t.deleted_at IS NULL
          ${estado                 ? sql`AND t.estado    = ${estado as string}`    : sql``}
          ${tipo                   ? sql`AND t.tipo      = ${tipo as string}`      : sql``}
          ${prioridad               ? sql`AND t.prioridad = ${prioridad as string}` : sql``}
          ${responsable_tecnico_id ? sql`AND t.asignado_a = ${responsable_tecnico_id as string}` : sql``}
          ${tag                    ? sql`AND a.tag = ${tag as string}` : sql``}
        ORDER BY t.updated_at DESC
        LIMIT 200
      `;
      return res.status(200).json({ tickets: rows });
    } catch (err) {
      console.error('[tickets GET]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  // ── Crear ─────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    if (!hasRole(rol, crearRoles)) {
      return res.status(403).json({ message: 'No tiene permiso para crear tickets' });
    }

    const body = req.body as {
      sucursal_id?: string;
      titulo?: string;
      descripcion?: string;
      tipo?: string;
      prioridad?: string;
      tag?: string;
      responsable_tecnico_id?: string;
    };

    if (!body.sucursal_id || !body.titulo || !body.descripcion) {
      return res.status(400).json({ message: 'sucursal_id, titulo y descripcion son requeridos' });
    }
    if (body.titulo.trim().length < 5) {
      return res.status(400).json({ message: 'titulo debe tener al menos 5 caracteres' });
    }
    if (body.descripcion.trim().length < 10) {
      return res.status(400).json({ message: 'descripcion debe tener al menos 10 caracteres' });
    }
    const tipo = body.tipo ?? 'correctivo';
    if (!TIPOS.includes(tipo as typeof TIPOS[number])) {
      return res.status(400).json({ message: `tipo inválido. Válidos: ${TIPOS.join(', ')}` });
    }
    const prioridad = body.prioridad ?? 'media';
    if (!PRIORIDADES.includes(prioridad as typeof PRIORIDADES[number])) {
      return res.status(400).json({ message: `prioridad inválida. Válidos: ${PRIORIDADES.join(', ')}` });
    }

    try {
      let assetId: string | null = null;
      if (body.tag) {
        const [asset] = await sql`
          SELECT uuid_sync FROM assets WHERE tag = ${body.tag} AND cliente_id = ${cliente_id} AND deleted_at IS NULL
        `;
        if (!asset) return res.status(400).json({ message: `Equipo con tag ${body.tag} no encontrado` });
        assetId = asset.uuid_sync as string;
      }

      const [created] = await sql`
        INSERT INTO tickets (
          cliente_id, sucursal_id, asset_id, titulo, descripcion,
          tipo, prioridad, asignado_a, reportado_por, estado
        ) VALUES (
          ${cliente_id},
          ${body.sucursal_id},
          ${assetId},
          ${body.titulo.trim()},
          ${body.descripcion.trim()},
          ${tipo},
          ${prioridad},
          ${body.responsable_tecnico_id ?? null},
          ${user_id},
          'abierto'
        )
        RETURNING
          uuid_sync AS ticket_id, numero_correlativo, titulo, estado,
          tipo, prioridad, created_at
      `;

      return res.status(201).json({ ticket: created });
    } catch (err) {
      console.error('[tickets POST]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  // ── Actualizar (transición / comentario / asignación) ──────────────────────
  if (req.method === 'PATCH') {
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'id de ticket requerido' });
    }
    const accion = req.query.action as string | undefined;

    try {
      const [ticket] = await sql`
        SELECT uuid_sync AS ticket_id, estado
        FROM tickets
        WHERE uuid_sync = ${id} AND cliente_id = ${cliente_id} AND deleted_at IS NULL
      `;
      if (!ticket) return res.status(404).json({ message: 'Ticket no encontrado' });

      // ── Transición de estado ────────────────────────────────────────────
      if (accion === 'transicionar') {
        const body = req.body as { to?: string; texto?: string; foto_url?: string };
        const from = ticket.estado as TicketState;
        const to = body.to as TicketState;

        if (!ESTADOS.includes(to)) {
          return res.status(400).json({ message: `estado destino inválido. Válidos: ${ESTADOS.join(', ')}` });
        }

        const rule = TRANSITIONS.find(t => t.from === from && t.to === to);
        if (!rule) {
          return res.status(409).json({ message: `Transición inválida: ${from} → ${to}` });
        }
        if (!hasRole(rol, rule.roles)) {
          return res.status(403).json({ message: `El rol "${rol}" no puede ${from} → ${to}` });
        }
        if (rule.requiresEvidence && !tieneEvidencia(body.texto, body.foto_url)) {
          return res.status(400).json({
            message: `Se requiere un comentario de al menos ${MIN_TEXTO} caracteres o una foto.`,
          });
        }

        // RN-VAL-TICKET-02: máximo de devueltas a "observado" por semana
        if (to === 'observado') {
          const [{ count }] = await sql`
            SELECT COUNT(*) AS count FROM ticket_comments
            WHERE ticket_id = ${id}
              AND estado_nuevo = 'observado'
              AND created_at > now() - interval '7 days'
          `;
          if (Number(count) >= MAX_DEVUELTAS_POR_SEMANA) {
            return res.status(409).json({
              message: `Máximo ${MAX_DEVUELTAS_POR_SEMANA} devueltas por semana. Escalar a Supervisor.`,
            });
          }
        }

        const [updated] = await sql`
          UPDATE tickets
          SET estado = ${to},
              closed_at = ${to === 'cerrado' ? sql`now()` : sql`closed_at`},
              updated_at = now()
          WHERE uuid_sync = ${id} AND cliente_id = ${cliente_id}
          RETURNING uuid_sync AS ticket_id, estado, updated_at, closed_at
        `;

        await sql`
          INSERT INTO ticket_comments (
            ticket_id, cliente_id, autor_id, contenido, adjunto_url, estado_anterior, estado_nuevo
          ) VALUES (
            ${id}, ${cliente_id}, ${user_id}, ${body.texto ?? null}, ${body.foto_url ?? null}, ${from}, ${to}
          )
        `;

        return res.status(200).json({ ticket: updated });
      }

      // ── Comentario libre (sin cambio de estado) ─────────────────────────
      if (accion === 'comentar') {
        const body = req.body as { texto?: string; foto_url?: string };
        if (!body.texto && !body.foto_url) {
          return res.status(400).json({ message: 'texto o foto_url son requeridos' });
        }

        const [comment] = await sql`
          INSERT INTO ticket_comments (ticket_id, cliente_id, autor_id, contenido, adjunto_url)
          VALUES (${id}, ${cliente_id}, ${user_id}, ${body.texto ?? null}, ${body.foto_url ?? null})
          RETURNING uuid_sync AS ticket_comment_id, ticket_id, contenido AS texto, adjunto_url AS foto_url, created_at
        `;
        await sql`UPDATE tickets SET updated_at = now() WHERE uuid_sync = ${id}`;

        return res.status(201).json({ comment });
      }

      // ── Asignación de responsable / proveedor ───────────────────────────
      if (accion === 'asignar') {
        if (!hasRole(rol, asignarRoles)) {
          return res.status(403).json({ message: 'No tiene permiso para asignar este ticket' });
        }
        const body = req.body as { responsable_tecnico_id?: string | null; proveedor_asignado_id?: string | null };

        const [updated] = await sql`
          UPDATE tickets
          SET asignado_a            = COALESCE(${body.responsable_tecnico_id}, asignado_a),
              proveedor_asignado_id = COALESCE(${body.proveedor_asignado_id}, proveedor_asignado_id),
              updated_at            = now()
          WHERE uuid_sync = ${id} AND cliente_id = ${cliente_id}
          RETURNING uuid_sync AS ticket_id, asignado_a AS responsable_tecnico_user_id,
                    proveedor_asignado_id AS proveedor_asignado_user_id, updated_at
        `;

        return res.status(200).json({ ticket: updated });
      }

      return res.status(400).json({ message: 'action inválido. Válidos: transicionar, comentar, asignar' });
    } catch (err) {
      console.error('[tickets PATCH]', err);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  return res.status(405).json({ message: 'Método no permitido' });
}
