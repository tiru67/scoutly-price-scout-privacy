export function recommendExperiment({ analysis, comparison, campaign }) {
  const hooks = [
    {
      name: 'compatibility-checklist',
      hypothesis: 'A laptop-compatibility checklist hook will drive more qualified guide visits than a generic 65W hook.'
    },
    {
      name: 'multi-device-allocation',
      hypothesis: 'Explaining the 20W + 45W split will earn more saves and comments from multi-device buyers.'
    }
  ];

  const baselineEngagement = comparison?.engagementRate;
  const successThreshold =
  baselineEngagement == null
    ? 'At least 20% more engaged sessions per 100 impressions than the weaker hook after a 7-day window, with no policy warnings.'
    : `Beat the prior period engagement rate (${(baselineEngagement * 100).toFixed(1)}%) by at least 20% over 7 days.`;

  const totals = campaign?.totals || {};
  const weakPeriods =
    (totals.qualified_visits || 0) > 0 &&
    (totals.engaged_sessions || 0) / Math.max(totals.qualified_visits, 1) < 0.25;

  return {
    selected: hooks[0],
    alternatives: hooks.slice(1),
    successThreshold,
    pauseRecommendation: weakPeriods
      ? 'Pause channels that produce clicks without engaged sessions for two consecutive review periods.'
      : 'Continue draft-only promotion. No channel pause recommended yet because baseline metrics are still being collected.',
    nextActions: [
      'Publish LinkedIn draft A and short-post 1 in separate review periods to isolate hook performance.',
      'Record UTM source in analytics before approving any external post.',
      'Re-verify Amazon listing identity and price band before the first affiliate CTA goes live.'
    ]
  };
}
