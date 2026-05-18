/**
 * POST /api/mutate  body { mutation: Mutation } -> { version }
 *
 * Authoritative apply. Reads the latest state, applies the SAME pure reducer
 * the browser used optimistically, then compare-and-swaps on the version. If a
 * concurrent writer bumped the version in between, we re-read and retry — so no
 * edit is ever lost even with the open "anyone can edit" access model.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyMutation, isMutation } from '../src/lib/mutations';
import { ensureSchema, readState, casState } from './_db';
import { preflight, parseBody, fail } from './_http';

const MAX_RETRIES = 6;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (preflight(req, res)) return;
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method_not_allowed' });
      return;
    }
    await ensureSchema();

    const body = parseBody<{ mutation?: unknown }>(req);
    if (!isMutation(body.mutation)) {
      res.status(400).json({ error: 'bad_request', message: 'Missing/invalid `mutation`' });
      return;
    }
    const mutation = body.mutation;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const row = await readState();
      if (!row) {
        // Store not seeded yet — the client bootstrap is responsible for the
        // initial POST /api/state. Tell it to resync rather than guessing.
        res.status(409).json({ error: 'not_seeded', message: 'State not initialised' });
        return;
      }
      const next = applyMutation(row.data, mutation);
      const newVersion = await casState(row.version, next);
      if (newVersion !== null) {
        res.status(200).json({ version: newVersion });
        return;
      }
      // Lost the race; brief jittered backoff then retry against fresh state.
      await new Promise((r) => setTimeout(r, 15 + Math.random() * 40));
    }

    res.status(409).json({
      error: 'write_conflict',
      message: 'Could not apply mutation after retries; client should resync.',
    });
  } catch (err) {
    fail(res, err);
  }
}
