/**
 * POST /api/blob-delete  body { url } — removes an uploaded image from Vercel
 * Blob. Used when the user discards an image in the mailing compose form before
 * sending. Best-effort; only operates on this project's Blob store (token-scoped).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { del } from '@vercel/blob';
import { preflight, parseBody, fail } from './_http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (preflight(req, res)) return;
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method_not_allowed' });
      return;
    }
    const { url } = parseBody<{ url?: unknown }>(req);
    if (typeof url === 'string' && url) await del(url);
    res.status(200).json({ ok: true });
  } catch (err) {
    fail(res, err);
  }
}
