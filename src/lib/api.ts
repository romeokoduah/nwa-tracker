/**
 * Thin client for the Neon-backed API. Same-origin in production (frontend +
 * functions deploy together on Vercel); set VITE_API_BASE to a deployed URL
 * when running the Vite dev server standalone.
 */
import type { AppState } from './types';
import type { Mutation } from './mutations';

const BASE = ((import.meta.env.VITE_API_BASE as string | undefined) ?? '').replace(
  /\/$/,
  '',
);

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, 'network_error', 'Could not reach the server');
  }
  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : {};
  if (!res.ok) {
    const e = json as { error?: string; message?: string };
    throw new ApiError(res.status, e.error ?? 'error', e.message ?? res.statusText);
  }
  return json as T;
}

export interface StateResponse {
  data: AppState | null;
  version: number;
}

export function getState(): Promise<StateResponse> {
  return request<StateResponse>('/api/state');
}

export function getVersion(): Promise<{ version: number }> {
  return request<{ version: number }>('/api/version');
}

export function postMutation(
  mutation: Mutation,
  actorId: string | null = null,
): Promise<{ version: number }> {
  return request<{ version: number }>('/api/mutate', {
    method: 'POST',
    body: JSON.stringify({ mutation, actorId }),
  });
}

export function putState(data: AppState): Promise<{ version: number }> {
  return request<{ version: number }>('/api/state', {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
}

export interface SendMailResult {
  sent: number;
  skipped: string[];
  disabled?: boolean;
}

/** An uploaded image referenced by an outgoing email. */
export interface MailImage {
  /** Public Vercel Blob URL the server fetches the bytes from. */
  url: string;
  filename: string;
  contentType: string;
  /** 'inline' embeds it in the body; 'attachment' adds it as a file. */
  disposition: 'inline' | 'attachment';
}

export function postSendMail(input: {
  recipientIds: string[];
  subject: string;
  body: string;
  actorId: string | null;
  images?: MailImage[];
}): Promise<SendMailResult> {
  return request<SendMailResult>('/api/send-mail', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Best-effort delete of an uploaded blob (when the user removes an image before sending). */
export function deleteBlob(url: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/api/blob-delete', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}
