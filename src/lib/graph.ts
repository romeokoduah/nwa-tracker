/**
 * Microsoft Graph + MSAL access for the shared SharePoint folder.
 *
 * Fully gated: when VITE_MSAL_CLIENT_ID is unset the app never loads MSAL and the
 * Documents page falls back to plain SharePoint links. Activation only needs an
 * Entra (Azure AD) app registration from CGIAR IT (client id + admin consent).
 */
import {
  PublicClientApplication,
  InteractionRequiredAuthError,
  type AccountInfo,
} from '@azure/msal-browser';

// CGIAR tenant (from the shared link); override with VITE_MSAL_TENANT_ID if needed.
const TENANT_ID =
  (import.meta.env.VITE_MSAL_TENANT_ID as string | undefined) ||
  '6afa0e00-fa14-40b7-8a2e-22a7f8c357d5';
const CLIENT_ID = (import.meta.env.VITE_MSAL_CLIENT_ID as string | undefined) || '';

// Where the folder lives in Graph terms.
const SITE_PATH = 'cgiar.sharepoint.com:/sites/IWMIDIWASAWAinterns';
const FOLDER_PATH = 'General/National Water Accounting Atlas';
const SCOPES = ['Sites.ReadWrite.All', 'User.Read'];
const GRAPH = 'https://graph.microsoft.com/v1.0';
/** Single-request upload ceiling; larger files must use SharePoint directly. */
export const UPLOAD_LIMIT_BYTES = 4 * 1024 * 1024;

export function isGraphConfigured(): boolean {
  return CLIENT_ID.length > 0;
}

export interface DriveItem {
  id: string;
  name: string;
  size: number;
  lastModified: string | null;
  webUrl: string;
  isFolder: boolean;
}

let pca: PublicClientApplication | null = null;
let initPromise: Promise<PublicClientApplication> | null = null;

async function getPca(): Promise<PublicClientApplication> {
  if (pca) return pca;
  if (!initPromise) {
    const app = new PublicClientApplication({
      auth: {
        clientId: CLIENT_ID,
        authority: `https://login.microsoftonline.com/${TENANT_ID}`,
        redirectUri: window.location.origin,
      },
      cache: { cacheLocation: 'localStorage' },
    });
    initPromise = app.initialize().then(() => {
      pca = app;
      return app;
    });
  }
  return initPromise;
}

export async function currentAccount(): Promise<AccountInfo | null> {
  const app = await getPca();
  return app.getAllAccounts()[0] ?? null;
}

export async function signIn(): Promise<AccountInfo> {
  const app = await getPca();
  const res = await app.loginPopup({ scopes: SCOPES });
  return res.account;
}

export async function signOut(): Promise<void> {
  const app = await getPca();
  const account = app.getAllAccounts()[0];
  await app.logoutPopup({ account });
}

async function token(): Promise<string> {
  const app = await getPca();
  const account = app.getAllAccounts()[0];
  if (!account) throw new Error('Not signed in');
  try {
    const r = await app.acquireTokenSilent({ account, scopes: SCOPES });
    return r.accessToken;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      const r = await app.acquireTokenPopup({ scopes: SCOPES });
      return r.accessToken;
    }
    throw e;
  }
}

async function graphFetch(path: string, init?: RequestInit): Promise<Response> {
  const tok = await token();
  const res = await fetch(`${GRAPH}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${tok}`, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let msg = `Graph ${res.status}`;
    try {
      const j = await res.json();
      msg = j?.error?.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res;
}

let cachedSiteId: string | null = null;
async function siteId(): Promise<string> {
  if (cachedSiteId) return cachedSiteId;
  const res = await graphFetch(`/sites/${SITE_PATH}?$select=id`);
  const j = await res.json();
  cachedSiteId = j.id as string;
  return cachedSiteId;
}

export async function listFolder(): Promise<DriveItem[]> {
  const sid = await siteId();
  const enc = encodeURI(FOLDER_PATH);
  const res = await graphFetch(
    `/sites/${sid}/drive/root:/${enc}:/children?$select=id,name,size,lastModifiedDateTime,webUrl,folder,file&$top=200&$orderby=name`,
  );
  const j = await res.json();
  return (j.value as Record<string, unknown>[]).map((it) => ({
    id: String(it.id),
    name: String(it.name),
    size: Number(it.size ?? 0),
    lastModified: (it.lastModifiedDateTime as string) ?? null,
    webUrl: String(it.webUrl ?? ''),
    isFolder: 'folder' in it,
  }));
}

export async function uploadFile(file: File): Promise<DriveItem> {
  if (file.size > UPLOAD_LIMIT_BYTES) {
    throw new Error(
      `${file.name} is larger than 4 MB — please upload it directly in SharePoint.`,
    );
  }
  const sid = await siteId();
  const enc = `${encodeURI(FOLDER_PATH)}/${encodeURIComponent(file.name)}`;
  const res = await graphFetch(`/sites/${sid}/drive/root:/${enc}:/content`, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  const it = await res.json();
  return {
    id: String(it.id),
    name: String(it.name),
    size: Number(it.size ?? 0),
    lastModified: (it.lastModifiedDateTime as string) ?? null,
    webUrl: String(it.webUrl ?? ''),
    isFolder: 'folder' in it,
  };
}
