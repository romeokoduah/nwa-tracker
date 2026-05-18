/**
 * GET /api/version -> { version: number }
 *
 * Cheap endpoint the clients poll every few seconds. When it changes, a client
 * pulls the full /api/state and replaces its store — that's how one person's
 * edit becomes visible to everyone.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, readVersion } from './_db';
import { preflight, fail } from './_http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (preflight(req, res)) return;
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'method_not_allowed' });
      return;
    }
    await ensureSchema();
    const version = await readVersion();
    res.status(200).json({ version });
  } catch (err) {
    fail(res, err);
  }
}
