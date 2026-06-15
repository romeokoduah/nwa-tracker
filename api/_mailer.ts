/**
 * Gmail-SMTP transport for notification emails. Side-effect only: it sends what
 * it is given and swallows per-message failures (the originating write already
 * succeeded, so a mail error must never surface). Note the `_` prefix keeps this
 * out of Vercel's filesystem routing.
 */
import nodemailer from 'nodemailer';
import type { EmailMessage } from '../src/lib/notifications.js';

type Transporter = ReturnType<typeof nodemailer.createTransport>;
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

export async function sendEmails(messages: EmailMessage[]): Promise<void> {
  const user = process.env.GMAIL_USER ?? '';
  const from = `NWA Tracker <${user}>`;
  for (const m of messages) {
    try {
      await getTransporter().sendMail({
        from,
        to: m.to,
        replyTo: m.replyTo ?? user,
        subject: m.subject,
        text: m.text,
        html: m.html,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[notify] send failed:', m.to, m.subject, err);
    }
  }
}
