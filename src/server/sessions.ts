import { createHash, randomBytes } from 'node:crypto';
import type { CookieOptions } from 'express';
import { config } from './config.js';

/** Token opaco aleatorio (256 bits). Solo viaja en la cookie; en la base se guarda su hash. */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Una cookie por sala: el mismo navegador puede estar en varias salas sin pisarse. */
export function cookieName(code: string): string {
  return `pp_${code.toUpperCase()}`;
}

export function cookieOptions(ttlDays: number): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    path: '/',
    maxAge: ttlDays * 24 * 60 * 60 * 1000,
  };
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function newRoomCode(length = 5): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}
