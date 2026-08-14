const SCHEDULE_TEMPLATES = {
  shortvideo: { channel: 'shortvideo', kpi: 'saves, profile visits, affiliate_clicks' },
  x: { channel: 'x', kpi: 'qualified_visits, affiliate_clicks (utm_source=x)' },
  community: { channel: 'community', kpi: 'referral visits, affiliate_clicks, helpful replies' },
  linkedin: { channel: 'linkedin', kpi: 'engaged_sessions, guide clicks' },
  newsletter: { channel: 'newsletter', kpi: 'email clicks, affiliate_clicks' },
  organic: { channel: 'organic', kpi: 'search visits, affiliate_clicks (not a social post)' }
};

function pickAsset(drafts, channel) {
  if (channel === 'linkedin') return drafts.linkedin?.[0]?.id;
  if (channel === 'x') return drafts.shortPosts?.[0]?.id;
  if (channel === 'community') return drafts.communityAngles?.[0]?.id;
  if (channel === 'shortvideo') return drafts.shortVideos?.[0]?.id;
  if (channel === 'newsletter') return 'newsletter-main';
  return 'review';
}

export function buildPrioritySchedule(drafts, platformChoice) {
  const order = [
    platformChoice.primary,
    platformChoice.secondary,
    'x',
    'community',
    'linkedin',
    'shortvideo',
    'newsletter'
  ].filter((value, index, array) => value && array.indexOf(value) === index);

  const social = order.filter((platform) => platform !== 'organic').slice(0, 6);
  const schedule = social.map((platform, index) => {
    const template = SCHEDULE_TEMPLATES[platform] || SCHEDULE_TEMPLATES.community;
    return {
      day: index + 1,
      channel: template.channel,
      asset: pickAsset(drafts, platform),
      kpi: template.kpi,
      priority: index === 0 ? 'primary' : index === 1 ? 'secondary' : 'support'
    };
  });

  schedule.push({
    day: 7,
    channel: 'review',
    asset: 'experiment-review',
    kpi: 'conversions, referral revenue by platform, choose next channel',
    priority: 'review'
  });

  return schedule;
}
