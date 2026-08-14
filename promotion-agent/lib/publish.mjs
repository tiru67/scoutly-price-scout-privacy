import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { approvalsDir, outputDir } from './paths.mjs';
import { getApprovalState, assertPublishAllowed, approveCampaign } from './approval.mjs';
import { loadConfig } from './config.mjs';
import { recordMetrics } from './metrics.mjs';
import { getXCredentialStatus, postTweet } from './x-api.mjs';

const publishLog = join(approvalsDir, '..', 'published', 'log.jsonl');
const limitsFile = join(approvalsDir, '..', 'published', 'daily-limits.json');
const ACTIVE_PLATFORM = 'x';

const LAUNCH_DAY = {
  'boat-audio-deals-under-1100': { platform: 'x', postIndex: 0 },
  'ambrane-charge-r65': { platform: 'x', postIndex: 0 }
};

const PLATFORM_POSTS = {
  'boat-audio-deals-under-1100': {
    shortvideo: [
      `Hook: "Three boAt deals under ₹1,100 — but only one fits your routine."
Beat 1: Airdopes Alpha ₹799 — wireless, best value
Beat 2: Rockerz 255 Pro+ ₹1,099 — neckband, longer battery
Beat 3: BassHeads 104 ₹349 — wired, cheapest
CTA: "Match the exact variant, then recheck the live price."
https://scoutly-price-scout.vercel.app/guides/boat-audio-deals-under-1100-india.html?utm_source=shortvideo&utm_medium=video&utm_campaign=boat-audio-deals-under-1100
Disclosure: the linked Scoutly guide contains EarnKaro affiliate links.`
    ],
    community: [
      `Under ₹1,100, Scoutly's checked shortlist is Airdopes Alpha (₹799 wireless), Rockerz 255 Pro+ (₹1,099 neckband) and BassHeads 104 (₹349 wired). Pick based on fit, battery and whether you need a headphone jack. Prices were checked on the official store — recheck before checkout. https://scoutly-price-scout.vercel.app/guides/boat-audio-deals-under-1100-india.html?utm_source=community&utm_medium=referral&utm_campaign=boat-audio-deals-under-1100 Disclosure: the linked Scoutly guide contains EarnKaro affiliate links.`
    ],
    x: [
      `boAt Airdopes Alpha at ₹799 is Scoutly's best-value wireless pick under ₹1,100 — but only if you want true wireless. Full comparison: https://scoutly-price-scout.vercel.app/guides/boat-audio-deals-under-1100-india.html?utm_source=x&utm_medium=social&utm_campaign=boat-audio-deals-under-1100`,
      `Need longer battery and a secure fit? Rockerz 255 Pro+ was ₹1,099 when checked. Compare all three boAt picks: https://scoutly-price-scout.vercel.app/guides/boat-audio-deals-under-1100-india.html?utm_source=x&utm_medium=social&utm_campaign=boat-audio-deals-under-1100`
    ],
    linkedin: [
      `Three boAt audio options under ₹1,100 — but the right pick depends on how you listen.

• Airdopes Alpha (₹799 checked) — best-value wireless for most shoppers
• Rockerz 255 Pro+ (₹1,099 checked) — longer playback, neckband
• BassHeads 104 (₹349 checked) — wired, lowest cost

Scoutly compared exact variants and checked prices on the official store: https://scoutly-price-scout.vercel.app/guides/boat-audio-deals-under-1100-india.html?utm_source=linkedin&utm_medium=social&utm_campaign=boat-audio-deals-under-1100

Disclosure: the linked Scoutly guide contains EarnKaro affiliate links.`
    ]
  },
  'ambrane-charge-r65': {
    community: [
      `If your laptop accepts USB-C Power Delivery at 65W or less, a 65W charger can be enough. Check the wattage printed on your original adapter and whether the laptop charges over USB-C at all. For the Ambrane Charge R65 specifically, also confirm model ACHA-07 on the listing and remember that using two outputs changes the allocation. I documented the manual's split and a buying checklist here: https://scoutly-price-scout.vercel.app/guides/ambrane-charge-r65-65w-gan-charger-india.html?utm_source=community&utm_medium=referral&utm_campaign=ambrane-charge-r65 Disclosure: the linked Scoutly guide contains an Amazon affiliate link.`
    ],
    shortvideo: [
      `Hook: "This charger says 65W — but that is not what your laptop gets when your phone is plugged in too."
Beat 1: Show the Charge R65 label and model ACHA-07.
Beat 2: Overlay the 20W + 45W row from the official manual.
Beat 3: CTA — "Match the exact model, then check the current Amazon.in price."
Link in description: https://scoutly-price-scout.vercel.app/guides/ambrane-charge-r65-65w-gan-charger-india.html?utm_source=shortvideo&utm_medium=video&utm_campaign=ambrane-charge-r65
Disclosure: the linked Scoutly guide contains an Amazon affiliate link.`
    ],
    x: [
      `A "65W" label is only the start. Check USB-C PD compatibility, exact model ACHA-07, port allocation, warranty, and the delivered total before buying. https://scoutly-price-scout.vercel.app/guides/ambrane-charge-r65-65w-gan-charger-india.html?utm_source=x&utm_medium=social&utm_campaign=ambrane-charge-r65`,
      `One charger for laptop + phone? Confirm what happens when both ports are used. Total output is shared on many GaN chargers. https://scoutly-price-scout.vercel.app/guides/ambrane-charge-r65-65w-gan-charger-india.html?utm_source=x&utm_medium=social&utm_campaign=ambrane-charge-r65`
    ],
    linkedin: [
      `Most charger recommendations compare wattage. The more useful question is whether the exact charger matches your laptop, phone, and multi-device setup.

For the Ambrane Charge R65 (model ACHA-07), check USB-C PD support, whether 65W is enough, what happens when two USB-C outputs are used together, and the delivered total.

Scoutly's evidence-first breakdown: https://scoutly-price-scout.vercel.app/guides/ambrane-charge-r65-65w-gan-charger-india.html?utm_source=linkedin&utm_medium=social&utm_campaign=ambrane-charge-r65

Disclosure: the linked Scoutly guide contains an Amazon affiliate link.`
    ]
  }
};

async function readDailyLimits() {
  try {
    return JSON.parse(await readFile(limitsFile, 'utf8'));
  } catch {
    return {};
  }
}

async function writeDailyLimits(limits) {
  await mkdir(join(approvalsDir, '..', 'published'), { recursive: true });
  await writeFile(limitsFile, `${JSON.stringify(limits, null, 2)}\n`, 'utf8');
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function getPublishCount(platform, date = todayKey()) {
  const limits = await readDailyLimits();
  return limits[date]?.[platform] || 0;
}

export async function canPublishPlatform(platform, date = todayKey()) {
  const config = await loadConfig();
  const max = config.guardrails.maxPostsPerPlatformPerDay || 2;
  const count = await getPublishCount(platform, date);
  return count < max;
}

export async function logPublish(entry) {
  await mkdir(join(approvalsDir, '..', 'published'), { recursive: true });
  const line = `${JSON.stringify({ ...entry, at: new Date().toISOString() })}\n`;
  await appendFile(publishLog, line, 'utf8');
  const limits = await readDailyLimits();
  const date = todayKey();
  limits[date] = limits[date] || {};
  limits[date][entry.platform] = (limits[date][entry.platform] || 0) + 1;
  await writeDailyLimits(limits);
}

function resolvePublishMode(platform, requestedMode) {
  if (platform !== 'x') return 'manual';
  if (requestedMode === 'manual' || requestedMode === 'auto') return requestedMode;
  return getXCredentialStatus().canPost ? 'auto' : 'manual';
}

export async function publishToPlatform({ slug, platform = ACTIVE_PLATFORM, postIndex = 0, mode } = {}) {
  const approval = await getApprovalState(slug);
  assertPublishAllowed(approval, platform);

  if (!(await canPublishPlatform(platform))) {
    throw new Error(`Daily limit reached for ${platform}. Max 2 posts per platform per day.`);
  }

  const posts = PLATFORM_POSTS[slug]?.[platform];
  if (!posts?.[postIndex]) {
    throw new Error(`No ${platform} draft #${postIndex} for campaign ${slug}`);
  }

  const body = posts[postIndex];
  const resolvedMode = resolvePublishMode(platform, mode);
  const entry = {
    slug,
    platform,
    postIndex,
    mode: resolvedMode,
    status: resolvedMode === 'manual' ? 'ready_for_manual_post' : 'posting',
    body
  };

  if (resolvedMode === 'auto' && platform === 'x') {
    try {
      const posted = await postTweet(body);
      entry.status = 'posted';
      entry.tweetId = posted.tweetId;
      entry.postedText = posted.text;
    } catch (error) {
      entry.status = 'post_failed';
      entry.error = error.message;
      entry.errorStatus = error.status || null;
      entry.errorPayload = error.payload || null;
      await logPublish(entry);
      throw error;
    }
  }

  await logPublish(entry);

  await recordMetrics(slug, {
    channels: {
      [platform]: { impressions: 1, qualified_visits: 0, affiliate_clicks: 0 }
    }
  }).catch(() => {});

  return entry;
}

export async function publishLaunchDay({ slugs = ['boat-audio-deals-under-1100', 'ambrane-charge-r65'] } = {}) {
  const results = [];
  const xStatus = getXCredentialStatus();
  for (const slug of slugs) {
    await approveCampaign(slug, ['x']);
    const dayOne = LAUNCH_DAY[slug];
    if (!dayOne) continue;
    if (await canPublishPlatform(dayOne.platform)) {
      results.push(await publishToPlatform({
        slug,
        platform: dayOne.platform,
        postIndex: dayOne.postIndex
      }));
    }
  }
  return { results, xStatus };
}
