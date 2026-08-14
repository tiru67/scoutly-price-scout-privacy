import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { auditAllPosts, aggregatePlatformPriority } from './review-posts.mjs';
import { metricsDir } from './paths.mjs';

async function readAllCampaigns() {
  try {
    const raw = await readFile(join(metricsDir, 'campaigns.json'), 'utf8');
    return JSON.parse(raw).campaigns || {};
  } catch {
    return {};
  }
}

export async function buildPlatformReview() {
  const audit = await auditAllPosts();
  const monetized = audit.filter((entry) => entry.revenueScore > 0);
  const campaigns = await readAllCampaigns();
  const platformRanking = aggregatePlatformPriority(audit, campaigns);
  return { audit, monetized, platformRanking, campaigns };
}

export function renderPlatformReviewMarkdown({ audit, monetized, platformRanking }) {
  const lines = [
    '# Scoutly platform revenue review',
    '',
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    '',
    '## Important caveat',
    '',
    'No live referral revenue has been attributed by platform yet. This review ranks posts by **monetization strength** and **content-platform fit** until channel metrics are recorded with `record --json \'{"channels":{"x":{"affiliate_clicks":3}}}\'`.',
    '',
    '## Portfolio platform priority',
    '',
    '| Rank | Platform | Weighted score | Recommendation |',
    '|---|---|---:|---|'
  ];

  platformRanking.forEach((row, index) => {
    const action = index === 0
      ? 'Lead the 7-day schedule'
      : index === 1
        ? 'Secondary channel'
        : 'Support only';
    lines.push(`| ${index + 1} | ${row.platform} | ${row.score.toFixed(1)} | ${action} |`);
  });

  lines.push('', '## Post ranking by referral potential', '', '| Rank | Post | Revenue score | Monetization | Top platforms |', '|---|---|---:|---|---|');
  monetized.forEach((entry, index) => {
    const platforms = entry.platformFit.slice(0, 3).map((p) => p.platform).join(', ');
    lines.push(`| ${index + 1} | ${entry.title} | ${entry.revenueScore} | ${entry.monetization.type} | ${platforms} |`);
  });

  lines.push('', '## Recommended focus', '');
  const topPost = monetized[0];
  const socialPlatforms = platformRanking.filter((row) => row.platform !== 'organic');
  const topPlatform = socialPlatforms[0]?.platform;
  if (topPost && topPlatform) {
    lines.push(`1. **Primary post:** ${topPost.title} (\`${topPost.path}\`)`);
    lines.push(`2. **Primary social platform:** ${topPlatform}`);
    lines.push('3. **Secondary social platform:** ' + (socialPlatforms[1]?.platform || 'community'));
    lines.push('4. **Organic/search** remains the long-term revenue driver but is excluded from the 7-day social schedule.');
    lines.push('5. Deprioritize LinkedIn and newsletter until referral clicks are measured per channel.');
  }

  lines.push('', '## Next measurement step', '', 'Record per-channel metrics weekly:', '', '```bash', 'node promotion-agent/run-campaign.mjs record --campaign boat-audio-deals-under-1100 --json \'{"channels":{"shortvideo":{"affiliate_clicks":0,"qualified_visits":0},"x":{"affiliate_clicks":0}}}\'', '```', '');
  return `${lines.join('\n')}\n`;
}
