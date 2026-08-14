import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { guidesDir, repoRoot } from './paths.mjs';

const postsDir = join(repoRoot, 'docs', 'posts');

function titleFromHtml(content, fallback) {
  const match = content.match(/<title>([^<|]+)/i);
  return match ? match[1].replace(/\s*\|\s*Scoutly.*$/i, '').trim() : fallback;
}

function scoreMonetization(content) {
  const asinCount = (content.match(/amazon\.in\/dp\/B0[A-Z0-9]{8}/gi) || []).length;
  const earnkaroCount = (content.match(/\/go\/boat-/gi) || []).length;
  const searchAffiliate = (content.match(/amazon\.in\/s\?/gi) || []).length;
  const exactModel = /ACHA-07|Airdopes Alpha|Rockerz 255|BassHeads 104/i.test(content);
  const checkedPrice = /CHECKED PRICE|price-checked|checked price/i.test(content);
  const verdict = /verdict|should you buy|best-value/i.test(content);

  let score = 0;
  let type = 'none';
  if (earnkaroCount >= 2) {
    type = 'earnkaro_brand_store';
    score = 90 + earnkaroCount * 2 + (checkedPrice ? 5 : 0) + (verdict ? 5 : 0);
  } else if (asinCount >= 1) {
    type = 'amazon_asin';
    score = 80 + asinCount * 3 + (exactModel ? 5 : 0) + (verdict ? 5 : 0);
  } else if (searchAffiliate >= 1) {
    type = 'amazon_search';
    score = 45 + searchAffiliate * 5;
  }

  return { score, type, asinCount, earnkaroCount, searchAffiliate, exactModel, checkedPrice };
}

function platformFit(content, monetizationType) {
  const fits = {
    shortvideo: 0,
    x: 0,
    community: 0,
    linkedin: 0,
    newsletter: 0,
    organic: 0
  };

  if (/deal|under ₹|checked price|best-value/i.test(content)) {
    fits.shortvideo += 3;
    fits.x += 3;
  }
  if (/should you buy|compatibility|laptop|PD|PPS|allocation/i.test(content)) {
    fits.community += 3;
    fits.linkedin += 2;
    fits.newsletter += 2;
  }
  if (/compare|versus|shortlist|guide/i.test(content)) {
    fits.organic += 3;
    fits.newsletter += 1;
  }
  if (monetizationType === 'earnkaro_brand_store') {
    fits.shortvideo += 2;
    fits.x += 2;
  }
  if (monetizationType === 'amazon_asin') {
    fits.community += 2;
    fits.organic += 2;
  }
  if (monetizationType === 'amazon_search') {
    fits.organic += 2;
    fits.x += 1;
  }
  if (monetizationType === 'none') {
    fits.organic += 2;
    fits.newsletter += 1;
  }

  return Object.entries(fits)
    .sort((a, b) => b[1] - a[1])
    .map(([platform, score]) => ({ platform, score }));
}

async function readHtmlFiles(dir, kind) {
  const entries = [];
  try {
    const files = await readdir(dir);
    for (const file of files) {
      if (!file.endsWith('.html') || file === 'index.html') continue;
      const path = join(dir, file);
      const content = await readFile(path, 'utf8');
      const slug = basename(file, '.html');
      const monetization = scoreMonetization(content);
      entries.push({
        kind,
        path: path.replace(`${repoRoot}/`, ''),
        slug,
        title: titleFromHtml(content, slug),
        guideUrl: `https://scoutly-price-scout.vercel.app/${kind === 'guide' ? 'guides' : 'posts'}/${file}`,
        monetization,
        platformFit: platformFit(content, monetization.type),
        revenueScore: monetization.score
      });
    }
  } catch {
    /* ignore */
  }
  return entries;
}

export async function auditAllPosts() {
  const guides = await readHtmlFiles(guidesDir, 'guide');
  const posts = await readHtmlFiles(postsDir, 'post');
  const ranked = [...guides, ...posts].sort((a, b) => b.revenueScore - a.revenueScore);
  return ranked;
}

export function findAuditEntry(audit, post) {
  const needle = (post.slug || '').replace(/-launch$/, '');
  return audit.find((entry) => entry.path === post.path
    || entry.slug === post.slug
    || entry.slug.startsWith(needle)
    || needle.startsWith(entry.slug.split('-65w')[0])
    || (post.path && post.path.includes(entry.slug))) || null;
}

export function rankPlatformsFromMetrics(campaign) {
  const channels = campaign?.channels || {};
  const entries = Object.entries(channels).map(([platform, stats]) => {
    const clicks = stats.affiliate_clicks || 0;
    const conversions = stats.conversions || 0;
    const visits = stats.qualified_visits || 0;
    const revenue = stats.referral_revenue || 0;
    const score = revenue > 0
      ? revenue
      : conversions * 100 + clicks * 10 + visits * 1;
    return { platform, score, ...stats };
  });
  if (!entries.length) return null;
  return entries.sort((a, b) => b.score - a.score);
}

export function choosePlatforms({ analysis, metrics, auditEntry }) {
  const measured = rankPlatformsFromMetrics(metrics);
  if (measured?.length) {
    const social = measured.filter((row) => row.platform !== 'organic');
    const ranking = social.length ? social : measured;
    return {
      source: 'measured',
      primary: ranking[0].platform,
      secondary: ranking[1]?.platform || null,
      ranking,
      note: 'Using recorded channel metrics.'
    };
  }

  const fit = (auditEntry?.platformFit || []).filter((row) => row.platform !== 'organic');
  const ranked = fit.length ? fit : [
    { platform: 'community', score: 3 },
    { platform: 'x', score: 2 },
    { platform: 'shortvideo', score: 2 }
  ];
  return {
    source: 'content_fit',
    primary: ranked[0]?.platform || 'community',
    secondary: ranked[1]?.platform || 'x',
    ranking: ranked,
    note: 'No channel revenue data yet. Using content-fit scores from post audit (social channels only).'
  };
}

export function aggregatePlatformPriority(audit, campaigns = {}) {
  const totals = {};
  for (const entry of audit.filter((item) => item.revenueScore > 0)) {
    for (const { platform, score } of entry.platformFit) {
      totals[platform] = (totals[platform] || 0) + score * (entry.revenueScore / 100);
    }
  }

  for (const campaign of Object.values(campaigns)) {
    const measured = rankPlatformsFromMetrics(campaign);
    if (!measured) continue;
    for (const row of measured) {
      totals[row.platform] = (totals[row.platform] || 0) + row.score * 2;
    }
  }

  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([platform, score]) => ({ platform, score }));
}
