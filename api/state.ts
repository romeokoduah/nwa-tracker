/**
 * GET  /api/state  -> { data: AppState | null, version: number }
 *                     (data is null when the store has never been seeded)
 * POST /api/state   body { data: AppState } -> { version }
 *                     full replace, used for seed-init / import / reset
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { AppState } from '../src/lib/types';
import { ensureSchema, readState, writeState } from './_db';
import { preflight, parseBody, fail } from './_http';

function looksLikeAppState(v: unknown): v is AppState {
  return (
    !!v &&
    typeof v === 'object' &&
    Array.isArray((v as AppState).countries) &&
    Array.isArray((v as AppState).team)
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (preflight(req, res)) return;
  try {
    await ensureSchema();

    if (req.method === 'GET') {
      const row = await readState();
      res.status(200).json(row ?? { data: null, version: 0 });
      return;
    }

    if (req.method === 'POST') {
      const body = parseBody<{ data?: unknown }>(req);
      if (!looksLikeAppState(body.data)) {
        res.status(400).json({ error: 'bad_request', message: 'Missing/invalid `data`' });
        return;
      }
      const version = await writeState(body.data);
      res.status(200).json({ version });
      return;
    }

    res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    fail(res, err);
  }
}
