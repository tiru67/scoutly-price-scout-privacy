const STAGES = ['page_view', 'engaged', 'cta_click', 'affiliate_outbound'];

function sessionKey(event) {
  return event.sessionId || `anon:${event.path}:${event.at?.slice(0, 10)}`;
}

function groupKey(event, dimension) {
  if (dimension === 'page') return event.path || '/';
  if (dimension === 'campaign') return event.utm_campaign || '(direct)';
  if (dimension === 'source') return event.utm_source || '(direct)';
  if (dimension === 'medium') return event.utm_medium || '(none)';
  return 'all';
}

function initBucket(key) {
  return {
    key,
    sessions: new Set(),
    stages: Object.fromEntries(STAGES.map((stage) => [stage, new Set()])),
    watchSaves: 0
  };
}

function rate(numerator, denominator) {
  if (!denominator) return 0;
  return Number((numerator / denominator * 100).toFixed(1));
}

export function buildFunnel(events, { dimension = 'all', pagePrefix = null } = {}) {
  const filtered = events.filter((event) => {
    if (pagePrefix && !(event.path || '').startsWith(pagePrefix)) return false;
    return true;
  });

  const buckets = new Map();
  const allBucket = initBucket('all');
  for (const event of filtered) {
    const session = sessionKey(event);
    const keys = dimension === 'all' ? ['all'] : ['all', groupKey(event, dimension)];
    for (const key of keys) {
      const bucket = key === 'all' ? allBucket : (buckets.get(key) || initBucket(key));
      bucket.sessions.add(session);
      if (STAGES.includes(event.name)) {
        bucket.stages[event.name].add(session);
      }
      if (event.name === 'watch_save') bucket.watchSaves += 1;
      if (key !== 'all') buckets.set(key, bucket);
    }
  }
  buckets.set('all', allBucket);

  const rows = [...buckets.values()].map((bucket) => {
    const visits = bucket.sessions.size;
    const engaged = bucket.stages.engaged.size;
    const cta = bucket.stages.cta_click.size;
    const outbound = bucket.stages.affiliate_outbound.size;
    return {
      key: bucket.key,
      visits,
      engaged,
      cta_clicks: cta,
      affiliate_outbound: outbound,
      watch_saves: bucket.watchSaves,
      engagement_rate: rate(engaged, visits),
      cta_rate: rate(cta, visits),
      outbound_rate: rate(outbound, visits),
      visit_to_outbound: rate(outbound, visits)
    };
  });

  rows.sort((a, b) => b.visits - a.visits);
  const totals = rows.find((row) => row.key === 'all') || rows[0] || {
    visits: 0,
    engaged: 0,
    cta_clicks: 0,
    affiliate_outbound: 0,
    watch_saves: 0,
    engagement_rate: 0,
    cta_rate: 0,
    outbound_rate: 0,
    visit_to_outbound: 0
  };

  return { dimension, stages: STAGES, totals, rows };
}

export function compareFunnels(current, previous) {
  const prevByKey = new Map(previous.rows.map((row) => [row.key, row]));
  const deltas = current.rows.map((row) => {
    const prev = prevByKey.get(row.key) || {};
    return {
      key: row.key,
      visits_delta: row.visits - (prev.visits || 0),
      outbound_rate_delta: Number((row.outbound_rate - (prev.outbound_rate || 0)).toFixed(1)),
      cta_rate_delta: Number((row.cta_rate - (prev.cta_rate || 0)).toFixed(1))
    };
  });
  return {
    current: current.totals,
    previous: previous.totals,
    deltas,
    outbound_rate_delta: Number((current.totals.outbound_rate - (previous.totals?.outbound_rate || 0)).toFixed(1))
  };
}
