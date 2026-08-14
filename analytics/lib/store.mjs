import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const analyticsRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');
export const eventsFile = join(analyticsRoot, 'data', 'events.jsonl');
export const snapshotsDir = join(analyticsRoot, 'data', 'snapshots');

const FUNNEL_EVENTS = new Set([
  'page_view',
  'engaged',
  'cta_click',
  'affiliate_outbound',
  'watch_save'
]);

export function isFunnelEvent(name) {
  return FUNNEL_EVENTS.has(name);
}

export async function appendEvent(event) {
  const normalized = {
    id: event.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    at: event.at || new Date().toISOString(),
    name: event.name,
    path: event.path || '/',
    pageType: event.pageType || 'unknown',
    sessionId: event.sessionId || null,
    utm_source: event.utm_source || null,
    utm_medium: event.utm_medium || null,
    utm_campaign: event.utm_campaign || null,
    utm_content: event.utm_content || null,
    referrer: event.referrer || null,
    ctaId: event.ctaId || null,
    destination: event.destination || null,
    meta: event.meta || {}
  };
  await mkdir(join(analyticsRoot, 'data'), { recursive: true });
  await appendFile(eventsFile, `${JSON.stringify(normalized)}\n`, 'utf8');
  return normalized;
}

export async function appendEvents(events) {
  const results = [];
  for (const event of events) {
    results.push(await appendEvent(event));
  }
  return results;
}

export async function readEvents({ since, until, limit = 50000 } = {}) {
  let raw = '';
  try {
    raw = await readFile(eventsFile, 'utf8');
  } catch {
    return [];
  }
  const sinceMs = since ? Date.parse(since) : 0;
  const untilMs = until ? Date.parse(until) : Number.POSITIVE_INFINITY;
  const events = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      const atMs = Date.parse(event.at);
      if (Number.isFinite(sinceMs) && atMs < sinceMs) continue;
      if (Number.isFinite(untilMs) && atMs > untilMs) continue;
      events.push(event);
      if (events.length >= limit) break;
    } catch {
      // skip malformed lines
    }
  }
  return events;
}

export async function importEventsFromJson(payload) {
  const events = Array.isArray(payload) ? payload : payload.events || [];
  return appendEvents(events);
}

export async function saveSnapshot(label, data) {
  await mkdir(snapshotsDir, { recursive: true });
  const file = join(snapshotsDir, `${new Date().toISOString().slice(0, 10)}-${label}.json`);
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return file;
}
