import { appendEvents, importEventsFromJson, readEvents, saveSnapshot } from '../analytics/lib/store.mjs';
import { buildFunnel } from '../analytics/lib/funnel.mjs';
import { buildIterationPlan, renderIterationMarkdown } from '../analytics/lib/iterate.mjs';

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(text ? JSON.parse(text) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function daysAgo(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

export async function handleAnalyticsRoute(req, res, url, json) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return true;
  }

  if (url.pathname === '/api/analytics/events' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const events = Array.isArray(body) ? body : body.events ? body.events : [body];
      const stored = await appendEvents(events);
      return json(res, 202, { ok: true, stored: stored.length });
    } catch (error) {
      return json(res, 400, { error: 'INVALID_PAYLOAD', message: error.message });
    }
  }

  if (url.pathname === '/api/analytics/import' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const stored = await importEventsFromJson(body);
      return json(res, 202, { ok: true, stored: stored.length });
    } catch (error) {
      return json(res, 400, { error: 'INVALID_PAYLOAD', message: error.message });
    }
  }

  if (url.pathname === '/api/analytics/funnel' && req.method === 'GET') {
    const days = Number(url.searchParams.get('days') || 7);
    const dimension = url.searchParams.get('dimension') || 'all';
    const events = await readEvents({ since: daysAgo(days) });
    const funnel = buildFunnel(events, { dimension });
    return json(res, 200, { ok: true, days, funnel });
  }

  if (url.pathname === '/api/analytics/iterate' && req.method === 'GET') {
    const days = Number(url.searchParams.get('days') || 7);
    const current = await readEvents({ since: daysAgo(days) });
    const previous = await readEvents({ since: daysAgo(days * 2), until: daysAgo(days) });
    const plan = buildIterationPlan({ events: current, previousEvents: previous });
    return json(res, 200, { ok: true, plan });
  }

  if (url.pathname === '/api/analytics/report' && req.method === 'GET') {
    const days = Number(url.searchParams.get('days') || 7);
    const current = await readEvents({ since: daysAgo(days) });
    const previous = await readEvents({ since: daysAgo(days * 2), until: daysAgo(days) });
    const plan = buildIterationPlan({ events: current, previousEvents: previous });
    const markdown = renderIterationMarkdown(plan);
    const snapshotPath = await saveSnapshot(`funnel-${days}d`, plan);
    return json(res, 200, { ok: true, snapshotPath, plan, markdown });
  }

  return false;
}
