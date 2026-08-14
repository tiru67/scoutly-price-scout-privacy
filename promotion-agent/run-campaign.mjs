#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { detectPosts, resolvePostInput } from './lib/detect-post.mjs';
import { analyzePost } from './lib/analyze-post.mjs';
import { createCampaignPackage, renderCampaignMarkdown } from './lib/generate-campaign.mjs';
import { ensureCampaignMetrics, recordMetrics, getCampaignMetrics, comparePeriods } from './lib/metrics.mjs';
import { saveApprovalDraft, getApprovalState, assertPublishAllowed } from './lib/approval.mjs';
import { recommendExperiment } from './lib/experiments.mjs';
import { outputDir } from './lib/paths.mjs';
import { loadConfig } from './lib/config.mjs';
import { auditAllPosts, choosePlatforms, findAuditEntry } from './lib/review-posts.mjs';
import { buildPlatformReview, renderPlatformReviewMarkdown } from './lib/platform-review.mjs';
import { approveCampaign } from './lib/approval.mjs';
import { publishLaunchDay, publishToPlatform } from './lib/publish.mjs';
import { checkXConnection, getXCredentialStatus } from './lib/x-api.mjs';

function usage() {
  console.log(`Scoutly promotion agent

Commands:
  detect [--all]                 List detected posts and new-campaign candidates
  review                         Audit posts and rank platforms by revenue potential
  run [--post <path>] [--campaign <slug>]
                                 Analyze source, generate drafts, save campaign output
  status --campaign <slug>       Show metrics, approval, and experiment status
  record --campaign <slug> [--json '<metrics>']
                                 Append a review-period metrics snapshot
  publish [--campaign <slug>] [--platform x] [--index <n>] [--manual]
                                 Approve and post/queue X campaign content
  publish-launch                 Approve both campaigns and queue day-1 X posts
  x-check                        Verify X API credentials and account access
  approve --campaign <slug>      Mark campaign approved for X publishing
  publish-check --campaign <slug> --platform <name>
                                 Verify approval before any external publish attempt

Publishing remains disabled until you explicitly approve a campaign.`);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i += 1;
      }
    } else {
      args._.push(token);
    }
  }
  return args;
}

async function cmdDetect(args) {
  const { candidates, unseen, existing } = await detectPosts({ includeExisting: Boolean(args.all) });
  console.log(JSON.stringify({ existingCampaigns: existing, candidates, recommended: unseen[0] || null }, null, 2));
}

async function cmdRun(args) {
  const config = await loadConfig();
  if (!config.guardrails.requireApprovalBeforePublish) {
    console.warn('Warning: requireApprovalBeforePublish is false in config.json');
  }

  const audit = await auditAllPosts();
  const post = await resolvePostInput(args.post || args.campaign || null);
  const auditEntry = findAuditEntry(audit, post);
  const platformChoice = choosePlatforms({ analysis: {}, metrics: null, auditEntry });
  const analysis = analyzePost(post, { auditEntry, platformChoice });
  if (!analysis.guideUrl) throw new Error('Could not determine guide URL for campaign.');

  const approval = await saveApprovalDraft(analysis.slug, analysis);
  const campaignMetrics = await ensureCampaignMetrics(analysis.slug, analysis);
  const refreshedChoice = choosePlatforms({ analysis, metrics: campaignMetrics, auditEntry });
  const campaignPackage = createCampaignPackage({ ...analysis, platformChoice: refreshedChoice });
  const comparison = comparePeriods(campaignMetrics);
  const experiment = recommendExperiment({ analysis, comparison, campaign: campaignMetrics });
  const markdown = renderCampaignMarkdown({
    analysis: { ...analysis, platformChoice: refreshedChoice },
    links: campaignPackage.links,
    drafts: campaignPackage.drafts,
    schedule: campaignPackage.schedule,
    measurement: campaignPackage.measurement,
    experiment,
    approval,
    metrics: campaignMetrics
  });

  await mkdir(outputDir, { recursive: true });
  const dated = `${new Date().toISOString().slice(0, 10)}-${analysis.slug}.md`;
  const outputPath = join(outputDir, dated);
  await writeFile(outputPath, markdown, 'utf8');

  console.log(JSON.stringify({
    ok: true,
    outputPath,
    slug: analysis.slug,
    publishApproved: approval.publishApproved,
    primaryKpi: analysis.primaryKpi,
    platformPriority: refreshedChoice,
    links: campaignPackage.links,
    scheduleDays: campaignPackage.schedule.length
  }, null, 2));
}

async function cmdStatus(args) {
  const slug = args.campaign;
  if (!slug) throw new Error('status requires --campaign <slug>');
  const [metrics, approval] = await Promise.all([
    getCampaignMetrics(slug),
    getApprovalState(slug)
  ]);
  const comparison = comparePeriods(metrics);
  const experiment = recommendExperiment({ analysis: { slug }, comparison, campaign: metrics });
  console.log(JSON.stringify({ metrics, approval, comparison, experiment }, null, 2));
}

async function cmdRecord(args) {
  const slug = args.campaign;
  if (!slug) throw new Error('record requires --campaign <slug>');
  const payload = args.json ? JSON.parse(args.json) : {
    qualified_visits: Number(args.qualified_visits || 0),
    engaged_sessions: Number(args.engaged_sessions || 0),
    affiliate_clicks: Number(args.affiliate_clicks || 0),
    email_signups: Number(args.email_signups || 0),
    conversions: Number(args.conversions || 0),
    impressions: Number(args.impressions || 0)
  };
  const result = await recordMetrics(slug, payload);
  console.log(JSON.stringify({ ok: true, recorded: result.period, totals: result.campaign.totals }, null, 2));
}

async function cmdPublishCheck(args) {
  const slug = args.campaign;
  const platform = args.platform || 'external';
  if (!slug) throw new Error('publish-check requires --campaign <slug>');
  const approval = await getApprovalState(slug);
  assertPublishAllowed(approval, platform);
  console.log(JSON.stringify({ ok: true, slug, platform, message: 'Approval present. External publish may proceed manually.' }, null, 2));
}

async function cmdApprove(args) {
  const slug = args.campaign;
  if (!slug) throw new Error('approve requires --campaign <slug>');
  const platforms = args.platforms ? args.platforms.split(',') : undefined;
  const approval = await approveCampaign(slug, platforms);
  console.log(JSON.stringify({ ok: true, approval }, null, 2));
}

async function cmdPublish(args) {
  const slug = args.campaign;
  const platform = args.platform || 'x';
  const postIndex = Number(args.index || 0);
  if (!slug) throw new Error('publish requires --campaign <slug>');
  if (platform !== 'x') throw new Error('Only X publishing is enabled. Use --platform x.');
  await approveCampaign(slug, ['x']);
  const entry = await publishToPlatform({
    slug,
    platform,
    postIndex,
    mode: args.manual ? 'manual' : undefined
  });
  const message = entry.status === 'posted'
    ? `Posted to X as tweet ${entry.tweetId}.`
    : 'Content queued in promotion-agent/published/log.jsonl for manual X posting.';
  console.log(JSON.stringify({ ok: true, entry, xStatus: getXCredentialStatus(), message }, null, 2));
}

async function cmdPublishLaunch() {
  const { results, xStatus } = await publishLaunchDay();
  const posted = results.filter((entry) => entry.status === 'posted');
  const queued = results.filter((entry) => entry.status === 'ready_for_manual_post');
  console.log(JSON.stringify({
    ok: true,
    approved: ['boat-audio-deals-under-1100', 'ambrane-charge-r65'],
    platform: 'x',
    xStatus,
    posted,
    queued,
    results,
    note: xStatus.canPost
      ? 'OAuth user-context credentials detected. Posts attempt live X publishing.'
      : 'Bearer token present, but live posting needs OAuth user tokens (X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET). Queued posts are ready for manual copy-paste on X.'
  }, null, 2));
}

async function cmdXCheck() {
  const credentials = getXCredentialStatus();
  const connection = await checkXConnection();
  console.log(JSON.stringify({ ok: connection.connected, credentials, connection }, null, 2));
}

async function cmdReview() {
  const review = await buildPlatformReview();
  const markdown = renderPlatformReviewMarkdown(review);
  await mkdir(outputDir, { recursive: true });
  const outputPath = join(outputDir, `${new Date().toISOString().slice(0, 10)}-platform-revenue-review.md`);
  await writeFile(outputPath, markdown, 'utf8');
  console.log(JSON.stringify({
    ok: true,
    outputPath,
    topPost: review.monetized[0]?.title || null,
    topPlatform: review.platformRanking[0]?.platform || null,
    platformRanking: review.platformRanking
  }, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || 'run';
  try {
    if (command === 'detect') return cmdDetect(args);
    if (command === 'review') return cmdReview();
    if (command === 'run') return cmdRun(args);
    if (command === 'status') return cmdStatus(args);
    if (command === 'record') return cmdRecord(args);
    if (command === 'approve') return cmdApprove(args);
    if (command === 'publish') return cmdPublish(args);
    if (command === 'publish-launch') return cmdPublishLaunch();
    if (command === 'x-check') return cmdXCheck();
    if (command === 'publish-check') return cmdPublishCheck(args);
    if (command === 'help' || command === '--help') return usage();
    throw new Error(`Unknown command: ${command}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

main();
