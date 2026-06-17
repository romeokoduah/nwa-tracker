/**
 * POST /api/blob-upload — mints a short-lived client token so the browser can
 * upload an image straight to Vercel Blob (bypassing the ~4.5MB serverless
 * request-body limit). Used by the mailing compose form. Requires the
 * BLOB_READ_WRITE_TOKEN env var (auto-injected when a Blob store is linked).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { preflight, fail } from './_http.js';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB per image
const ALLOWED = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (preflight(req, res)) return;
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method_not_allowed' });
      return;
    }
    const body = req.body as HandleUploadBody;
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED,
        maximumSizeInBytes: MAX_IMAGE_BYTES,
        addRandomSuffix: true,
      }),
      // No server-side bookkeeping needed; the browser keeps the returned URL.
      onUploadCompleted: async () => {},
    });
    res.status(200).json(result);
  } catch (err) {
    fail(res, err);
  }
}
