/**
 * Sync controller: bootstraps the store from the server, keeps it live by
 * polling a cheap version endpoint (~3s) and pulling fresh state when it
 * changes, and ships local mutations to the server with resilient retry.
 *
 * The store does not import this module (no circular import): at startup we
 * inject the dispatchers into the store via `_bindSync`.
 */
import { useNwaStore } from './useNwaStore';
import { useAuthStore } from './useAuthStore';
import { seedData } from '@/lib/seed';
import { ApiError, getState, getVersion, postMutation, putState } from '@/lib/api';
import type { Mutation } from '@/lib/mutations';
import type { AppState } from '@/lib/types';

const POLL_MS = 3000;

let pollTimer: ReturnType<typeof setInterval> | null = null;
let started = false;
let queue: { m: Mutation; actorId: string | null }[] = [];
let processing = false;

function store() {
  return useNwaStore.getState();
}

function setSync(status: 'connecting' | 'live' | 'error', error?: string) {
  store()._setSync(status, error);
}

/** Replace the whole store from an authoritative server snapshot. */
function applyRemote(data: AppState, version: number) {
  store()._applyRemote(data, version);
}

async function bootstrap() {
  setSync('connecting');
  try {
    const res = await getState();
    if (res.data == null) {
      // First ever run: publish the built-in seed as version 1.
      const { version } = await putState(seedData);
      applyRemote(seedData, version);
    } else {
      applyRemote(res.data, res.version);
    }
    setSync('live');
  } catch (err) {
    setSync('error', err instanceof Error ? err.message : 'Connection failed');
  }
}

/** Pull authoritative state and replace the store. */
async function resync() {
  try {
    const res = await getState();
    if (res.data != null) applyRemote(res.data, res.version);
    setSync('live');
  } catch (err) {
    setSync('error', err instanceof Error ? err.message : 'Connection failed');
  }
}

async function processQueue() {
  if (processing) return;
  processing = true;
  try {
    while (queue.length > 0) {
      const item = queue[0];
      try {
        const { version } = await postMutation(item.m, item.actorId);
        queue.shift();
        // Adopt the server version. If others also wrote, the next poll pulls
        // their changes in (server already has ours merged on top).
        store()._setVersion(version);
        setSync('live');
      } catch (err) {
        if (err instanceof ApiError && err.code === 'not_seeded') {
          // Race on first run — publish current state then retry this mutation.
          try {
            await putState(store()._snapshot());
            continue;
          } catch {
            /* fall through to error handling below */
          }
        }
        const status = err instanceof ApiError ? err.status : 0;
        const transient = status === 0 || status >= 500;
        if (transient) {
          // Keep the mutation queued; surface offline and retry shortly.
          setSync('error', 'Offline — changes will sync when reconnected');
          processing = false;
          setTimeout(() => void processQueue(), POLL_MS);
          return;
        }
        // Permanent failure (bad request / unresolvable conflict): drop the
        // optimistic change by snapping back to authoritative server state.
        queue.shift();
        setSync('error', err instanceof Error ? err.message : 'Sync error');
        await resync();
      }
    }
  } finally {
    processing = false;
  }
}

/** Called by store mutating actions, after the optimistic local apply. */
export function enqueueMutation(m: Mutation) {
  const actorId = useAuthStore.getState().currentUser?.id ?? null;
  queue.push({ m, actorId });
  void processQueue();
}

/** Called by store import/reset, after the optimistic local apply. */
export async function replaceRemote(state: AppState) {
  try {
    const { version } = await putState(state);
    store()._setVersion(version);
    setSync('live');
  } catch (err) {
    setSync('error', err instanceof Error ? err.message : 'Sync error');
    await resync();
  }
}

async function pollTick() {
  if (typeof document !== 'undefined' && document.hidden) return;
  if (processing || queue.length > 0) return; // don't clobber in-flight edits
  try {
    const { version } = await getVersion();
    if (version !== store().version) {
      await resync();
    } else {
      setSync('live');
    }
  } catch (err) {
    setSync('error', err instanceof Error ? err.message : 'Connection lost');
  }
}

export function startSync() {
  if (started) return;
  started = true;

  store()._bindSync({ send: enqueueMutation, replace: replaceRemote });

  void bootstrap();

  pollTimer = setInterval(() => void pollTick(), POLL_MS);

  const wake = () => void pollTick();
  window.addEventListener('focus', wake);
  window.addEventListener('online', wake);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) wake();
  });
}

export function stopSync() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  started = false;
  queue = [];
  processing = false;
}
