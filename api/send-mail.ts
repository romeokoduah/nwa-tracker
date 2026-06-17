/**
 * POST /api/send-mail  body { recipientIds: string[], subject, body, actorId? }
 *   -> { sent: number, skipped: string[] }
 *
 * Free-form admin broadcast: send a branded email to selected team members.
 * Not a state mutation — it only sends mail (gated by the notifications switch).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { waitUntil } from '@vercel/functions';
import { del } from '@vercel/blob';
import { ensureSchema, readState } from './_db.js';
import { preflight, parseBody, fail } from './_http.js';
import { composeEmail, type EmailAttachment } from '../src/lib/notifications.js';
import { sendEmails } from './_mailer.js';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 12;

interface IncomingImage {
  url: string;
  filename: string;
  contentType: string;
  disposition: 'inline' | 'attachment';
}

function parseImages(raw: unknown): IncomingImage[] {
  if (!Array.isArray(raw)) return [];
  const out: IncomingImage[] = [];
  for (const it of raw) {
    if (!it || typeof it !== 'object') continue;
    const o = it as Record<string, unknown>;
    const url = typeof o.url === 'string' ? o.url : '';
    // Only accept URLs from our Blob store to avoid the server fetching arbitrary hosts.
    if (!/^https:\/\/[a-z0-9.-]*\.(?:public\.)?blob\.vercel-storage\.com\//i.test(url)) continue;
    const filename = typeof o.filename === 'string' && o.filename ? o.filename : 'image';
    const contentType =
      typeof o.contentType === 'string' && o.contentType ? o.contentType : 'application/octet-stream';
    const disposition = o.disposition === 'attachment' ? 'attachment' : 'inline';
    out.push({ url, filename, contentType, disposition });
    if (out.length >= MAX_IMAGES) break;
  }
  return out;
}

/** Fetch the uploaded images and turn them into nodemailer attachments. */
async function buildAttachments(images: IncomingImage[]): Promise<EmailAttachment[]> {
  const atts: EmailAttachment[] = [];
  for (let i = 0; i < images.length; i++) {
    const im = images[i];
    try {
      const resp = await fetch(im.url);
      if (!resp.ok) continue;
      const buf = new Uint8Array(await resp.arrayBuffer());
      if (buf.byteLength > MAX_IMAGE_BYTES) continue;
      atts.push({
        filename: im.filename,
        content: buf,
        contentType: im.contentType,
        contentDisposition: im.disposition,
        ...(im.disposition === 'inline' ? { cid: `img${i}@nwa-tracker` } : {}),
      });
    } catch {
      // skip an image that fails to download; the rest of the email still sends
    }
  }
  return atts;
}

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
      images?: unknown;
    }>(req);

    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const messageBody = typeof body.body === 'string' ? body.body.trim() : '';
    const recipientIds = Array.isArray(body.recipientIds)
      ? body.recipientIds.filter((x): x is string => typeof x === 'string')
      : [];
    const actorId = typeof body.actorId === 'string' ? body.actorId : null;
    const images = parseImages(body.images);

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

    const attachments = images.length ? await buildAttachments(images) : [];

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
      msgs.push(
        composeEmail({
          to: m.email,
          subject: fullSubject,
          lines,
          appBaseUrl,
          replyTo,
          ...(attachments.length ? { attachments } : {}),
        }),
      );
    }

    // Send, then remove the uploaded blobs (the bytes are now embedded in the mail).
    const urls = images.map((i) => i.url);
    if (msgs.length) {
      waitUntil(
        sendEmails(msgs).finally(() =>
          urls.length ? del(urls).catch(() => {}) : undefined,
        ),
      );
    } else if (urls.length) {
      waitUntil(del(urls).catch(() => {}));
    }
    res.status(200).json({ sent: msgs.length, skipped });
  } catch (err) {
    fail(res, err);
  }
}
