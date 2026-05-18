/**
 * Tiny shared helpers for the Vercel functions. Files prefixed with `_` are
 * excluded from Vercel's filesystem routing, so this is import-only.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DbNotConfiguredError } from './_db';

/**
 * Access model is intentionally open ("anyone with the link can edit"), so the
 * API is unauthenticated and CORS is permissive. This also lets a local
 * `vite` dev server (different origin) talk to a deployed API via VITE_API_BASE.
 */
export function cors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

/** Handles preflight + CORS. Returns true if the request is already finished. */
export function preflight(req: VercelRequest, res: VercelResponse): boolean {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

export function parseBody<T = unknown>(req: VercelRequest): T {
  const b = req.body;
  if (b == null) return {} as T;
  if (typeof b === 'string') return JSON.parse(b) as T;
  return b as T;
}

export function fail(res: VercelResponse, err: unknown): void {
  if (err instanceof DbNotConfiguredError) {
    res.status(503).json({
      error: 'database_not_configured',
      message:
        'DATABASE_URL is not set. Add your Neon connection string to the deployment environment.',
    });
    return;
  }
  const message = err instanceof Error ? err.message : 'Unexpected error';
  // eslint-disable-next-line no-console
  console.error('[api] error:', err);
  res.status(500).json({ error: 'internal_error', message });
}
