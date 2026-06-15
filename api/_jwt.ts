/**
 * _jwt.ts — Helpers JWT para Vercel Functions
 * Firma y verifica tokens usando JOSE (Edge-compatible)
 */
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-cambiar-en-produccion'
);

const EXPIRES_IN = '8h';

export interface TokenPayload extends JWTPayload {
  user_id: string;
  cliente_id: string;
  rol: string;
  nombre: string;
  email: string;
}

export async function signToken(payload: Omit<TokenPayload, keyof JWTPayload>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, SECRET);
  return payload as TokenPayload;
}

/** Extrae el Bearer token del header Authorization */
export function extractBearer(authHeader: string | null | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}
