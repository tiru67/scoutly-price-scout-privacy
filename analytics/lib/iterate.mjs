import { buildFunnel, compareFunnels } from './funnel.mjs';

function weakestStage(totals) {
  const steps = [
    { stage: 'visit → engaged', rate: totals.engagement_rate, action: 'Improve above-the-fold clarity and first-scroll proof (prices, model identity, disclosure).' },
    { stage: 'engaged → CTA click', rate: totals.cta_rate, action: 'Strengthen CTA copy, placement, and variant-specific buttons on the highest-traffic guide.' },
    { stage: 'CTA → affiliate outbound', rate: totals.outbound_rate, action: 'Reduce friction on /go/ redirects and verify retailer landing pages load quickly on mobile.' }
  ];
  return steps.sort((a, b) => a.rate - b.rate)[0];
}

function topOpportunity(rows, dimension) {
  const candidates = rows
    .filter((row) => row.key !== 'all' && row.visits >= 3)
    .sort((a, b) => b.visits - a.visits);
  if (!candidates.length) return null;
  const row = candidates[0];
  return {
    dimension,
    key: row.key,
    visits: row.visits,
    outbound_rate: row.outbound_rate,
    note: row.outbound_rate < 5
      ? 'High traffic but weak outbound conversion — prioritize CTA and proof updates before more promotion volume.'
      : 'Best current traffic pocket — keep promoting here while testing one hook change.'
  };
}

export function buildIterationPlan({ events, previousEvents = [], minimumVisits = 5 }) {
  const current = buildFunnel(events);
  const previous = previousEvents.length ? buildFunnel(previousEvents) : null;
  const comparison = previous ? compareFunnels(current, previous) : null;
  const bySource = buildFunnel(events, { dimension: 'source' });
  const byCampaign = buildFunnel(events, { dimension: 'campaign' });
  const byPage = buildFunnel(events, { dimension: 'page' });
  const guidePages = buildFunnel(events, { dimension: 'page', pagePrefix: '/guides/' });

  const bottleneck = weakestStage(current.totals);
  const opportunities = [
    topOpportunity(bySource.rows, 'source'),
    topOpportunity(byCampaign.rows, 'campaign'),
    topOpportunity(guidePages.rows, 'page')
  ].filter(Boolean);

  const experiments = [];
  if (current.totals.engagement_rate < 35) {
    experiments.push({
      name: 'proof-above-fold',
      hypothesis: 'Moving checked price + exact model identity above the first CTA will lift engaged sessions.',
      successThreshold: 'Engagement rate increases by at least 15% with no drop in outbound rate.'
    });
  }
  if (current.totals.cta_rate < 8) {
    experiments.push({
      name: 'cta-variant-copy',
      hypothesis: 'Variant-specific CTA text ("Check Airdopes Alpha price") will beat generic "Check current price".',
      successThreshold: 'CTA click rate improves by at least 20% on the test guide page.'
    });
  }
  if (current.totals.outbound_rate < 3) {
    experiments.push({
      name: 'go-redirect-trust',
      hypothesis: 'A shorter /go/ interstitial with retailer logo and disclosure will reduce abandonment before outbound.',
      successThreshold: 'Affiliate outbound rate improves by at least 25% from CTA clicks.'
    });
  }
  if (!experiments.length) {
    experiments.push({
      name: 'channel-scale',
      hypothesis: 'The current funnel is healthy enough to scale the best utm_source without changing the page.',
      successThreshold: 'Maintain outbound_rate while increasing qualified visits by 20%.'
    });
  }

  const pauseChannels = bySource.rows
    .filter((row) => row.visits >= minimumVisits && row.outbound_rate === 0)
    .map((row) => row.key);

  return {
    generatedAt: new Date().toISOString(),
    totals: current.totals,
    comparison,
    bottleneck,
    opportunities,
    experiments: experiments.slice(0, 2),
    pauseChannels,
    nextActions: [
      bottleneck.action,
      opportunities[0] ? `Focus iteration on ${opportunities[0].dimension}="${opportunities[0].key}" (${opportunities[0].visits} visits).` : 'Collect more traffic before channel-level optimization.',
      pauseChannels.length ? `Pause or deprioritize sources with zero outbound: ${pauseChannels.join(', ')}.` : 'No zero-conversion sources above minimum visit threshold.',
      'Re-run this loop after each 7-day review window or meaningful traffic change.'
    ],
    breakdowns: {
      source: bySource.rows.slice(0, 8),
      campaign: byCampaign.rows.slice(0, 8),
      page: byPage.rows.filter((row) => row.key.startsWith('/guides/')).slice(0, 8)
    }
  };
}

export function renderIterationMarkdown(plan) {
  const lines = [
    '# Scoutly funnel iteration report',
    '',
    `Generated: ${plan.generatedAt.slice(0, 10)}`,
    '',
    '## Funnel totals',
    '',
    '| Stage | Count | Rate |',
    '|---|---:|---:|',
    `| Visits | ${plan.totals.visits} | 100% |`,
    `| Engaged | ${plan.totals.engaged} | ${plan.totals.engagement_rate}% |`,
    `| CTA clicks | ${plan.totals.cta_clicks} | ${plan.totals.cta_rate}% |`,
    `| Affiliate outbound | ${plan.totals.affiliate_outbound} | ${plan.totals.outbound_rate}% |`,
    '',
    '## Bottleneck',
    '',
    `- **Weakest step:** ${plan.bottleneck.stage} (${plan.bottleneck.rate}%)`,
    `- **Action:** ${plan.bottleneck.action}`,
    ''
  ];

  if (plan.comparison) {
    lines.push(
      '## Period comparison',
      '',
      `- Outbound rate delta: ${plan.comparison.outbound_rate_delta} pp`,
      `- Visits: ${plan.comparison.current.visits} (was ${plan.comparison.previous.visits})`,
      ''
    );
  }

  lines.push('## Experiments', '');
  plan.experiments.forEach((exp, index) => {
    lines.push(`### ${index + 1}. ${exp.name}`, '', `**Hypothesis:** ${exp.hypothesis}`, `**Success threshold:** ${exp.successThreshold}`, '');
  });

  lines.push('## Next actions', '', ...plan.nextActions.map((item) => `- ${item}`), '');
  return `${lines.join('\n')}\n`;
}
