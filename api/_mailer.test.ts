import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMail = vi.fn().mockResolvedValue({ messageId: 'x' });
vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail }) },
}));

import { sendEmails } from './_mailer';

describe('sendEmails', () => {
  beforeEach(() => {
    sendMail.mockClear();
    process.env.GMAIL_USER = 'romeo.tweneboahkoduah@gmail.com';
    process.env.GMAIL_APP_PASSWORD = 'app-pass';
  });

  it('sends one mail per message with From set and Reply-To defaulted', async () => {
    await sendEmails([
      { to: 'isuru@cgiar.org', subject: 'S1', text: 'T1', html: '<p>T1</p>' },
      { to: 'afua@cgiar.org', replyTo: 'naga@cgiar.org', subject: 'S2', text: 'T2', html: '<p>T2</p>' },
    ]);
    expect(sendMail).toHaveBeenCalledTimes(2);
    const first = sendMail.mock.calls[0][0];
    expect(first.from).toContain('romeo.tweneboahkoduah@gmail.com');
    expect(first.replyTo).toBe('romeo.tweneboahkoduah@gmail.com'); // defaulted
    const second = sendMail.mock.calls[1][0];
    expect(second.replyTo).toBe('naga@cgiar.org'); // explicit
  });

  it('never throws when a send fails', async () => {
    sendMail.mockRejectedValueOnce(new Error('smtp down'));
    await expect(
      sendEmails([{ to: 'x@cgiar.org', subject: 'S', text: 'T', html: '<p>T</p>' }]),
    ).resolves.toBeUndefined();
  });
});
