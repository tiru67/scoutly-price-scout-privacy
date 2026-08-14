import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { metricsDir } from './paths.mjs';

const metricsFile = join(metricsDir, 'campaigns.json');

const emptyMetrics = () => ({
  qualified_visits: 0,
  engaged_sessions: 0,
  affiliate_clicks: 0,
  email_signups: 0,
  conversions: 0,
  impressions: 0,
  comments: 0,
  saves: 0
});

async function readStore() {
  try {
    const raw = await readFile(metricsFile, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { campaigns: {}, reviewPeriods: [] };
  }
}

async function writeStore(store) {
  await mkdir(metricsDir, { recursive: true });
  await writeFile(metricsFile, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}

export async function ensureCampaignMetrics(slug, analysis) {
  const store = await readStore();
  if (!store.campaigns[slug]) {
    store.campaigns[slug] = {
      slug,
      title: analysis.title,
      createdAt: new Date().toISOString().slice(0, 10),
      status: 'draft',
      publishApproved: false,
      primaryKpi: analysis.primaryKpi,
      periods: [],
      channels: {},
      totals: emptyMetrics()
    };
    await writeStore(store);
  }
  return store.campaigns[slug];
}

export async function recordMetrics(slug, payload) {
  const store = await readStore();
  const campaign = store.campaigns[slug];
  if (!campaign) throw new Error(`Unknown campaign metrics slug: ${slug}`);

  const period = {
    recordedAt: new Date().toISOString(),
    ...emptyMetrics(),
    ...payload
  };
  campaign.periods.push(period);
  for (const key of Object.keys(emptyMetrics())) {
    campaign.totals[key] = (campaign.totals[key] || 0) + (period[key] || 0);
  }
  if (payload.channels) {
    for (const [channel, stats] of Object.entries(payload.channels)) {
      campaign.channels[channel] = { ...(campaign.channels[channel] || {}), ...stats };
    }
  }
  await writeStore(store);
  return { campaign, period };
}

export async function getCampaignMetrics(slug) {
  const store = await readStore();
  return store.campaigns[slug] || null;
}

export function comparePeriods(campaign, minimumWindowDays = 7) {
  const periods = campaign?.periods || [];
  if (periods.length < 2) {
    return {
      ready: false,
      reason: 'Need at least two review periods before comparing results.'
    };
  }
  const latest = periods.at(-1);
  const previous = periods.at(-2);
  const delta = {};
  for (const key of Object.keys(emptyMetrics())) {
    delta[key] = (latest[key] || 0) - (previous[key] || 0);
  }
  const engagementRate =
    latest.impressions > 0 ? (latest.engaged_sessions || 0) / latest.impressions : null;
  return {
    ready: true,
    minimumWindowDays,
    latest,
    previous,
    delta,
    engagementRate
  };
}
