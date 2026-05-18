/**
 * Neon (serverless Postgres) access for the API functions.
 *
 * Correctness model: there is no interactive transaction. All state lives in a
 * single JSONB row (`app_state` id=1). Writes use optimistic concurrency — a
 * compare-and-swap on `version` — so two simultaneous editors can never lose
 * each other's change (the loser retries against fresh state). This needs only
 * the HTTP `neon()` driver: no WebSocket, no `ws` dependency, no pooling.
 */
import { neon } from '@neondatabase/serverless';
import type { AppState } from '../src/lib/types';

const connectionString = process.env.DATABASE_URL;

export class DbNotConfiguredError extends Error {
  constructor() {
    super('DATABASE_URL is not set');
    this.name = 'DbNotConfiguredError';
  }
}

function client() {
  if (!connectionString) throw new DbNotConfiguredError();
  return neon(connectionString);
}

let schemaReady = false;

export async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  const sql = client();
  await sql`
    create table if not exists app_state (
      id         int primary key,
      data       jsonb       not null,
      version    bigint      not null default 1,
      updated_at timestamptz not null default now()
    )
  `;
  schemaReady = true;
}

export interface StateRow {
  data: AppState;
  version: number;
}

/** Current state, or null if the singleton row has never been written. */
export async function readState(): Promise<StateRow | null> {
  const sql = client();
  const rows = (await sql`
    select data, version from app_state where id = 1
  `) as { data: AppState; version: number | string }[];
  if (rows.length === 0) return null;
  return { data: rows[0].data, version: Number(rows[0].version) };
}

export async function readVersion(): Promise<number> {
  const sql = client();
  const rows = (await sql`
    select version from app_state where id = 1
  `) as { version: number | string }[];
  return rows.length === 0 ? 0 : Number(rows[0].version);
}

/** Full replace (seed-init / import / reset). Upsert + bump version. */
export async function writeState(data: AppState): Promise<number> {
  const sql = client();
  const json = JSON.stringify(data);
  const rows = (await sql`
    insert into app_state (id, data, version)
    values (1, ${json}::jsonb, 1)
    on conflict (id) do update
      set data = excluded.data,
          version = app_state.version + 1,
          updated_at = now()
    returning version
  `) as { version: number | string }[];
  return Number(rows[0].version);
}

/**
 * Compare-and-swap: write `data` only if the row is still at `expectedVersion`.
 * Returns the new version, or null if another writer won the race.
 */
export async function casState(
  expectedVersion: number,
  data: AppState,
): Promise<number | null> {
  const sql = client();
  const json = JSON.stringify(data);
  const rows = (await sql`
    update app_state
       set data = ${json}::jsonb,
           version = version + 1,
           updated_at = now()
     where id = 1 and version = ${expectedVersion}
    returning version
  `) as { version: number | string }[];
  return rows.length === 0 ? null : Number(rows[0].version);
}
