/**
 * POST /api/send-mail  body { recipientIds: string[], subject, body, actorId? }
 *   -> { sent: number, skipped: string[] }
 *
 * Free-form admin broadcast: send a branded email to selected team members.
 * Not a state mutation — it only sends mail (gated by the notifications switch).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { waitUntil } from '@vercel/functions';
import { ensureSchema, readState } from './_db.js';
import { preflight, parseBody, fail } from './_http.js';
import { composeEmail } from '../src/lib/notifications.js';
import { sendEmails } from './_mailer.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (preflight(req, res)) return;
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method_not_allowed' });
      return;
    }
    await ensureSchema();

    const body = parseBody<{
      recipientIds?: unknown;
      subject?: unknown;
      body?: unknown;
      actorId?: unknown;
    }>(req);

    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const messageBody = typeof body.body === 'string' ? body.body.trim() : '';
    const recipientIds = Array.isArray(body.recipientIds)
      ? body.recipientIds.filter((x): x is string => typeof x === 'string')
      : [];
    const actorId = typeof body.actorId === 'string' ? body.actorId : null;

    if (!subject || !messageBody || recipientIds.length === 0) {
      res.status(400).json({
        error: 'bad_request',
        message: 'subject, body and at least one recipientId are required',
      });
      return;
    }

    const row = await readState();
    if (!row) {
      res.status(409).json({ error: 'not_seeded', message: 'State not initialised' });
      return;
    }
    const state = row.data;

    const enabled =
      process.env.NOTIFICATIONS_ENABLED === 'true' &&
      state.settings?.notificationsEnabled !== false;
    if (!enabled) {
      res.status(200).json({ sent: 0, skipped: [], disabled: true });
      return;
    }

    const appBaseUrl = (process.env.APP_BASE_URL ?? '').replace(/\/$/, '');
    const actor = actorId ? state.team.find((t) => t.id === actorId) : undefined;
    const replyTo = actor?.email ?? undefined;
    const fullSubject = subject.startsWith('[NWA Tracker]') ? subject : `[NWA Tracker] ${subject}`;
    const lines = messageBody.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);

    const seen = new Set<string>();
    const msgs = [];
    const skipped: string[] = [];
    for (const id of recipientIds) {
      const m = state.team.find((t) => t.id === id);
      if (!m || !m.active || !m.email) {
        skipped.push(id);
        continue;
      }
      const key = m.email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      msgs.push(composeEmail({ to: m.email, subject: fullSubject, lines, appBaseUrl, replyTo }));
    }

    if (msgs.length) waitUntil(sendEmails(msgs));
    res.status(200).json({ sent: msgs.length, skipped });
  } catch (err) {
    fail(res, err);
  }
}
