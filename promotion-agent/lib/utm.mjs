export function buildUtmUrl(baseUrl, { source, medium, campaign, content }) {
  const url = new URL(baseUrl);
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', medium);
  url.searchParams.set('utm_campaign', campaign);
  if (content) url.searchParams.set('utm_content', content);
  return url.toString();
}

export function buildCampaignLinks({ guideUrl, campaign }) {
  const channels = [
    { key: 'linkedin', source: 'linkedin', medium: 'social' },
    { key: 'x', source: 'x', medium: 'social' },
    { key: 'newsletter', source: 'newsletter', medium: 'email' },
    { key: 'community', source: 'community', medium: 'referral' },
    { key: 'shortvideo', source: 'shortvideo', medium: 'video' }
  ];
  return Object.fromEntries(
    channels.map(({ key, source, medium }) => [
      key,
      buildUtmUrl(guideUrl, { source, medium, campaign })
    ])
  );
}
