import { buildCampaignLinks } from './utm.mjs';

function disclosure() {
  return 'Disclosure: the linked Scoutly guide contains an Amazon affiliate link.';
}

export function buildDrafts(analysis, links) {
  const guide = links.linkedin;
  const xLink = links.x;
  const newsletterLink = links.newsletter;
  const communityLink = links.community;
  const videoLink = links.shortvideo;

  return {
    linkedin: [
      {
        id: 'linkedin-a-compatibility',
        hook: 'compatibility-checklist',
        body: `Most charger recommendations compare wattage. The more useful question is whether the exact charger matches your laptop, phone, and multi-device setup.

For the Ambrane Charge R65 (model ACHA-07), check:
• USB-C PD support on your laptop
• whether 65W is enough for your device
• what happens when two USB-C outputs are used together
• exact model, seller, warranty, and delivered total

Scoutly’s evidence-first breakdown: ${guide}

${disclosure()}`
      },
      {
        id: 'linkedin-b-allocation',
        hook: 'multi-device-allocation',
        body: `"65W" on a charger label does not mean every connected device receives 65W at the same time.

On the Ambrane Charge R65, the official manual shows separate allocations when multiple outputs are used — for example 20W + 45W when both USB-C paths are active. That matters if you charge a laptop and phone together.

Read the allocation table and compatibility checks here: ${guide}

${disclosure()}`
      },
      {
        id: 'linkedin-c-checklist',
        hook: 'buying-checklist',
        body: `Before buying a 65W GaN charger in India, verify five things:

1. Laptop USB-C PD input and required wattage
2. PD/PPS support for your phone
3. Exact model number on the listing
4. Port allocation when more than one device is connected
5. Seller, warranty, and final delivered price

Scoutly applied that checklist to the Ambrane Charge R65: ${guide}

${disclosure()}`
      }
    ],
    shortPosts: [
      {
        id: 'x-1',
        body: `A "65W" label is only the start. Check USB-C PD compatibility, exact model ACHA-07, port allocation, warranty, and the delivered total before buying. ${xLink}`
      },
      {
        id: 'x-2',
        body: `One charger for laptop + phone? Confirm what happens when both ports are used. Total output is shared on many GaN chargers. ${xLink}`
      },
      {
        id: 'x-3',
        body: `The useful question is not "Is this charger 65W?" It is "Will it power my laptop in my actual setup?" ${xLink}`
      },
      {
        id: 'x-4',
        body: `Model numbers matter. Match Charge R65, ACHA-07, and ASIN B0FLPYQJ57 on the live listing — then check the current Amazon.in price. ${xLink}`
      },
      {
        id: 'x-5',
        body: `Scoutly’s charger checklist: laptop input, PD/PPS, simultaneous output, model identity, warranty, delivered price. ${xLink}`
      }
    ],
    threadOutline: {
      platform: 'x',
      title: 'Will a 65W GaN charger actually work for your laptop?',
      posts: [
        { n: 1, text: 'Thread: before buying a 65W USB-C charger, check compatibility — not just the headline wattage.' },
        { n: 2, text: 'Step 1: confirm your laptop charges over USB-C Power Delivery and note the wattage on the original adapter.' },
        { n: 3, text: 'Step 2: check what happens when a second device is connected. Shared output can drop laptop charging speed.' },
        { n: 4, text: 'Step 3: match the exact model on the listing. For Ambrane Charge R65 that means ACHA-07 / ASIN B0FLPYQJ57.' },
        { n: 5, text: 'Step 4: use the delivered total, seller, and warranty shown on the live page — not an old screenshot.' },
        { n: 6, text: `Full allocation table + checklist: ${xLink} ${disclosure()}` }
      ]
    },
    carouselOutline: {
      platform: 'linkedin',
      title: 'Charge R65 buying checklist (5 slides)',
      slides: [
        'Slide 1 — Hook: "65W" is not the whole story',
        'Slide 2 — Match exact identity: Charge R65, ACHA-07, B0FLPYQJ57',
        'Slide 3 — Single-device vs dual-device power allocation',
        'Slide 4 — Who it fits / who should skip it',
        'Slide 5 — CTA: verify live price + read full guide'
      ],
      ctaUrl: guide
    },
    newsletter: {
      subject: 'Will the Ambrane Charge R65 actually charge your laptop?',
      preheader: 'Exact model checks, port allocation, and when ₹2,499–₹2,999 is reasonable',
      body: `Hi,

If you are trying to carry one charger for a USB-C laptop and phone, the Ambrane Charge R65 is worth a careful look — but only after you check compatibility and the live offer.

What Scoutly verified in the guide:
• Exact product identity: Ambrane Charge R65, model ACHA-07, ASIN B0FLPYQJ57
• Official port allocation from the manufacturer manual
• Who it is likely to fit, who should skip it, and what to verify on Samsung/OnePlus phones
• An editorial price band of ₹2,499–₹2,999 — check the current Amazon.in price before buying

Read the full evidence-first guide: ${newsletterLink}

${disclosure()}

— Scoutly`
    },
    communityAngles: [
      {
        id: 'community-1',
        prompt: 'Is a 65W USB-C charger enough for my laptop?',
        angle: 'Answer with PD input requirements first. Mention that 65W can work for many ultrabooks, but high-power gaming laptops may need more. Link only if the community allows URLs.',
        draft: `If your laptop accepts USB-C Power Delivery at 65W or less, a 65W charger can be enough. Check the wattage printed on your original adapter and whether the laptop charges over USB-C at all. For the Ambrane Charge R65 specifically, also confirm model ACHA-07 on the listing and remember that using two outputs changes the allocation. I documented the manual’s split and a buying checklist here: ${communityLink} ${disclosure()}`
      },
      {
        id: 'community-2',
        prompt: 'Why does my laptop charge slower when my phone is also plugged in?',
        angle: 'Explain shared output allocation without blaming the cable blindly.',
        draft: `Many multi-port chargers share total output across active ports. On the Ambrane Charge R65, the official manual lists combinations such as 20W + 45W when both USB-C paths are used, so the laptop side may not keep the full 65W. That is normal for this class of charger — verify your exact model and the manual table before buying. ${communityLink} ${disclosure()}`
      },
      {
        id: 'community-3',
        prompt: 'What is the difference between PD and PPS for phone charging?',
        angle: 'Plain-language explainer; avoid claiming proprietary fast-charge maxima.',
        draft: `USB Power Delivery (PD) is the common standard for negotiating power over USB-C. PPS (Programmable Power Supply) lets devices request finer voltage/current steps, which some phones use for faster charging. A PD/PPS charger can still charge many phones well, but proprietary modes from some brands may not reach their absolute maximum on a third-party charger. Check the charging status after you connect. ${communityLink} ${disclosure()}`
      }
    ],
    shortVideos: [
      {
        id: 'video-1',
        title: '65W is not 65W for every port',
        hook: 'Show a two-device setup and explain shared allocation in 30 seconds.',
        script: `Hook: "This charger says 65W — but that is not what your laptop gets when your phone is plugged in too."
Beat 1: Show the Charge R65 label and model ACHA-07.
Beat 2: Overlay the 20W + 45W row from the official manual.
Beat 3: CTA — "Match the exact model, then check the current Amazon.in price."
Link in description: ${videoLink}
${disclosure()}`
      },
      {
        id: 'video-2',
        title: '3 checks before buying any GaN charger',
        hook: 'Checklist format for short-form video.',
        script: `1) Laptop USB-C PD input
2) Exact model + seller on the listing
3) Delivered total, not crossed-out MRP
Example product: Ambrane Charge R65 (ACHA-07)
Full guide: ${videoLink}
${disclosure()}`
      },
      {
        id: 'video-3',
        title: 'Who should skip a 65W charger',
        hook: 'Negative-fit angle to improve qualified traffic.',
        script: `Skip a 65W USB-C charger if your laptop needs more than 65W, you need full laptop speed while charging two devices, or you want three-device fast charging. For many ultrabooks it can still be a good one-bag option — if the price and seller check out. ${videoLink}
${disclosure()}`
      }
    ]
  };
}

export function buildSchedule(drafts) {
  return [
    { day: 1, channel: 'linkedin', asset: drafts.linkedin[0].id, kpi: 'engaged_sessions, guide clicks' },
    { day: 2, channel: 'x', asset: drafts.shortPosts[0].id, kpi: 'qualified_visits (utm_source=x)' },
    { day: 3, channel: 'community', asset: drafts.communityAngles[0].id, kpi: 'referral visits, helpful replies' },
    { day: 4, channel: 'linkedin', asset: drafts.linkedin[1].id, kpi: 'scroll depth, guide clicks' },
    { day: 5, channel: 'x', asset: drafts.shortPosts[1].id, kpi: 'affiliate_clicks' },
    { day: 6, channel: 'shortvideo', asset: drafts.shortVideos[0].id, kpi: 'saves, profile visits' },
    { day: 7, channel: 'review', asset: 'experiment-review', kpi: 'conversions, qualified visits, choose next hook' }
  ];
}

export function buildMeasurementPlan(analysis) {
  return {
    primaryKpi: analysis.primaryKpi,
    targets: {
      qualified_visits: 100,
      affiliate_clicks: 8,
      conversions: 1
    },
    tracking: [
      'Use UTM-tagged guide URLs per channel',
      'Segment GA4/Vercel Analytics by utm_campaign and utm_source',
      'Track Amazon Associates clicks for scoutlyprice2-21',
      'Record which community or post produced the first qualifying order'
    ],
    reviewCadence: 'weekly',
    stopRules: [
      'Pause a channel after two consecutive weak review periods',
      'Pause if policy warnings or repetitive-content complaints appear',
      'Do not scale on impressions alone'
    ]
  };
}

export function renderCampaignMarkdown({ analysis, links, drafts, schedule, measurement, experiment, approval, metrics }) {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [];
  const push = (...parts) => lines.push(...parts);

  push(
    `# Campaign: ${analysis.title}`,
    '',
    `Status: **Draft — approval required before publishing**`,
    `Generated: ${today}`,
    `Campaign slug: \`${analysis.slug}\``,
    `Primary KPI: ${analysis.primaryKpi.replace(/_/g, ' ')}`,
    `Source: \`${analysis.sourcePath}\``,
    '',
    '## Campaign summary',
    '',
    `- **Audience:** ${analysis.audience}`,
    `- **Search intent:** ${analysis.searchIntent}`,
    `- **Primary CTA:** ${analysis.cta.action}`,
    `- **Guide URL:** ${analysis.guideUrl}`,
    analysis.affiliateUrl ? `- **Affiliate product URL:** ${analysis.affiliateUrl}` : '',
    `- **Publishing:** blocked until explicit approval (\`publishApproved: ${approval.publishApproved}\`)`,
    '',
    '## Analysis',
    '',
    '### Key claims (must remain accurate)',
    ...analysis.claims.map((claim) => `- ${claim}`),
    '',
    '### Claims requiring verification before publish',
    ...analysis.verificationRequired.map((item) => `- ${item}`),
    '',
    '## UTM links',
    '',
    ...Object.entries(links).map(([channel, url]) => `- **${channel}:** ${url}`),
    '',
    '## LinkedIn drafts',
    ''
  );

  drafts.linkedin.forEach((draft, index) => {
    push(`### ${String.fromCharCode(65 + index)} — ${draft.hook}`, '', '```text', draft.body, '```', '');
  });

  push('## Short-post drafts (X)', '');
  drafts.shortPosts.forEach((draft, index) => {
    push(`${index + 1}. ${draft.body}`, '');
  });

  push('## Thread outline', '', `**${drafts.threadOutline.title}**`, '');
  drafts.threadOutline.posts.forEach((post) => push(`${post.n}. ${post.text}`));
  push('', '## Carousel outline', '', `**${drafts.carouselOutline.title}**`, '');
  drafts.carouselOutline.slides.forEach((slide) => push(`- ${slide}`));
  push(`- CTA URL: ${drafts.carouselOutline.ctaUrl}`, '', '## Newsletter draft', '', `**Subject:** ${drafts.newsletter.subject}`, `**Preheader:** ${drafts.newsletter.preheader}`, '', '```text', drafts.newsletter.body, '```', '', '## Community-answer angles', '');

  drafts.communityAngles.forEach((entry, index) => {
    push(`### ${index + 1}. ${entry.prompt}`, '', `**Angle:** ${entry.angle}`, '', '```text', entry.draft, '```', '');
  });

  push('## Short-video drafts', '');
  drafts.shortVideos.forEach((video) => {
    push(`### ${video.id} — ${video.title}`, '', `**Hook:** ${video.hook}`, '', '```text', video.script, '```', '');
  });

  push('## Seven-day schedule', '', '| Day | Channel | Asset | Measure |', '|---|---|---|---|');
  schedule.forEach((row) => {
    push(`| ${row.day} | ${row.channel} | ${row.asset} | ${row.kpi} |`);
  });

  push('', '## Measurement plan', '', `**Primary KPI:** ${measurement.primaryKpi}`, '', '**Targets**', ...Object.entries(measurement.targets).map(([key, value]) => `- ${key}: ${value}`), '', '**Tracking**', ...measurement.tracking.map((item) => `- ${item}`), '', '**Stop rules**', ...measurement.stopRules.map((item) => `- ${item}`), '', '## Experiment', '', `**Hypothesis:** ${experiment.selected.hypothesis}`, `**Success threshold:** ${experiment.successThreshold}`, '', '**Alternatives**', ...experiment.alternatives.map((alt) => `- ${alt.name}: ${alt.hypothesis}`), '', '## Risks and stop/pause recommendation', '', `- ${experiment.pauseRecommendation}`, '- Never invent live prices, rankings, or hands-on testing claims.', '- Do not post duplicate replies across communities.', '- Keep affiliate disclosure adjacent to any CTA.', '', '## Approval checklist', '', '- [ ] User explicitly approves publishing', '- [ ] Live Amazon.in price and seller re-verified', '- [ ] Guide disclosure visible near affiliate CTA', '- [ ] Analytics can distinguish each UTM source', '- [ ] Platform/date/post limits confirmed', '', '## Results log', '');

  if (metrics?.periods?.length) {
    push('**Totals**', ...Object.entries(metrics.totals || {}).map(([key, value]) => `- ${key}: ${value}`), '', '**Latest period**', `- recordedAt: ${metrics.periods.at(-1).recordedAt}`, '');
  } else {
    push(`_No live metrics recorded yet. Use \`node promotion-agent/run-campaign.mjs record --campaign ${analysis.slug}\` after each review period._`, '');
  }

  return `${lines.filter((line) => line !== undefined).join('\n')}\n`;
}

export function createCampaignPackage(analysis) {
  const links = buildCampaignLinks({ guideUrl: analysis.guideUrl, campaign: analysis.slug });
  const drafts = buildDrafts(analysis, links);
  const schedule = buildSchedule(drafts);
  const measurement = buildMeasurementPlan(analysis);
  return { links, drafts, schedule, measurement };
}
