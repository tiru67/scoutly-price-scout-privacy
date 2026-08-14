#!/usr/bin/env node

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const agentDir = resolve(root, 'promotion-agent');
const outputDir = resolve(agentDir, 'output');

function usage() {
  console.log(`Scoutly promotion agent

Commands:
  generate --input <article.html|article.md> [--slug <campaign>] [--url <destination>]
  review --input <metrics.json>

Examples:
  node promotion-agent/cli.mjs generate --input docs/guides/ambrane-charge-r65-65w-gan-charger-india.html
  node promotion-agent/cli.mjs scan
  node promotion-agent/cli.mjs x-check
  node promotion-agent/cli.mjs x-post --text "Your post" [--send]
  node promotion-agent/cli.mjs review --input promotion-agent/metrics.example.json`);
}

async function loadConfig() {
  for (const file of [resolve(agentDir, 'config.json'), resolve(agentDir, 'config.example.json')]) {
    try { return JSON.parse(await readFile(file, 'utf8')); } catch { /* try next */ }
  }
  throw new Error('No promotion-agent config found. Copy config.example.json to config.json.');
}

function clean(value = '') {
  return value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}

function firstMatch(source, pattern) {
  const match = source.match(pattern);
  return match ? clean(match[1]) : '';
}

function extractArticle(source, file) {
  const html = /\.html?$/.test(extname(file));
  const title = html
    ? (firstMatch(source, /<h1[^>]*>([\s\S]*?)<\/h1>/i) || firstMatch(source, /<title[^>]*>([\s\S]*?)<\/title>/i))
    : firstMatch(source, /^#\s+(.+)$/m);
  const description = html
    ? firstMatch(source, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)
    : firstMatch(source, /^>\s*(.+)$/m);
  const canonical = html ? firstMatch(source, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i) : '';
  const headings = [...source.matchAll(html ? /<h2[^>]*>([\s\S]*?)<\/h2>/gi : /^##\s+(.+)$/gmi)]
    .map(match => clean(match[1])).filter(Boolean).slice(0, 8);
  const paragraphs = [...source.matchAll(html ? /<p[^>]*>([\s\S]*?)<\/p>/gi : /^(?!#|>).+$/gm)]
    .map(match => clean(match[1])).filter(text => text.length > 45 && !/disclosure|copyright/i.test(text)).slice(0, 4);
  return { title: title || basename(file, extname(file)), description, canonical, headings, paragraphs };
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
}

function trackedUrl(destination, source, medium, campaign) {
  const url = new URL(destination);
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', medium);
  url.searchParams.set('utm_campaign', campaign);
  return url.toString();
}

function section(title, body) { return `## ${title}\n\n${body.trim()}\n`; }

function generateCampaign(article, config, { slug, destination }) {
  const audience = config.brand.audience;
  const disclosure = config.brand.affiliateDisclosure;
  const keyPoint = article.description || article.paragraphs[0] || 'A practical, evidence-first buying guide.';
  const headings = article.headings.length ? article.headings : ['What to check before buying', 'Who it suits', 'Common mistakes'];
  const urlFor = (source, medium) => trackedUrl(destination, source, medium, slug);
  const linkedIn = [
    `A useful buying decision is rarely just about the headline specification.\n\n${keyPoint}\n\nI broke down the checks that matter for ${article.title}: ${urlFor('linkedin', 'social')}`,
    `Before recommending ${article.title}, I would verify:\n\n- ${headings[0]}\n- ${headings[1] || 'exact model and compatibility'}\n- seller, warranty, and final delivered price\n\nEvidence-first guide: ${urlFor('linkedin', 'social')}`,
    `The best buying guide answers “who should skip this?” as clearly as “who should buy it?”\n\n${article.title} — practical decision guide: ${urlFor('linkedin', 'social')}`
  ];
  const shortPosts = [
    `${article.title}: the headline spec is only the starting point. Check compatibility, exact identity, seller, warranty, and final price. ${urlFor('x', 'social')}`,
    `A buying guide should tell you when to skip a product—not just list features. ${urlFor('x', 'social')}`,
    `${headings[0]} matters more than a generic product score. Here is the evidence-first breakdown: ${urlFor('x', 'social')}`,
    `Before you buy: match the exact model, verify the use case, and check the delivered total. ${urlFor('x', 'social')}`,
    `New Scoutly guide for ${audience.toLowerCase()}: ${urlFor('x', 'social')}`
  ];
  const community = [
    `Answer the reader’s specific question about ${headings[0].toLowerCase()} with the complete explanation first. Add the guide only if the community permits links.`,
    `Explain the trade-off in plain language: who benefits, who should skip, and what must be verified on the live listing.`,
    `Share one concrete checklist from the article, then disclose the affiliate relationship if the destination contains an affiliate CTA.`
  ];
  return `# Campaign: ${article.title}\n\nStatus: Drafts ready for approval  \nCampaign slug: \`${slug}\`  \nAudience: ${audience}  \nPrimary KPI: qualified visits, engaged sessions, and attributable conversions\n\n${section('Source analysis', `**Summary:** ${keyPoint}\n\n**Key sections:** ${headings.map(item => `\`${item}\``).join(', ')}\n\n**Destination:** ${destination}`)}${section('LinkedIn drafts', linkedIn.map((item, index) => `### Draft ${index + 1}\n\n${item}`).join('\n\n'))}${section('Short-post drafts', shortPosts.map((item, index) => `${index + 1}. ${item}`).join('\n'))}${section('Community angles', community.map((item, index) => `${index + 1}. ${item}`).join('\n'))}${section('Newsletter draft', `**Subject:** A clearer way to decide on ${article.title}\n\n${keyPoint}\n\nThis guide covers ${headings.slice(0, 3).join(', ')}. Read the full breakdown: ${urlFor('newsletter', 'email')}\n\n${disclosure}`)}${section('Seven-day schedule', `| Day | Action |\n|---|---|\n| 1 | Publish the article and LinkedIn Draft 1 |\n| 2 | Publish short post 1 |\n| 3 | Make one permitted community contribution |\n| 4 | Publish LinkedIn Draft 2 |\n| 5 | Publish short post 2 and newsletter if approved |\n| 6 | Publish short post 3 or a short-video script |\n| 7 | Review analytics and choose one experiment |`)}${section('Experiment', `Test the strongest problem/compatibility hook against the checklist hook. Success threshold: 20% improvement in engaged sessions per impression after at least ${config.analytics.minimumExperimentWindowDays} days.`)}${section('Guardrails', `- Approval required before publishing: **${config.guardrails.requireApprovalBeforePublish ? 'yes' : 'no'}**\n- Maximum posts per platform per day: **${config.guardrails.maxPostsPerPlatformPerDay}**\n- Never invent live prices: **${config.guardrails.neverInventLivePrices ? 'yes' : 'no'}**\n- Never create artificial engagement: **${config.guardrails.neverCreateArtificialEngagement ? 'yes' : 'no'}**\n- Affiliate disclosure: ${disclosure}`)}${section('Approval checklist', `- [ ] Verify claims against current primary sources\n- [ ] Confirm destination disclosure and CTA\n- [ ] Review all drafts for platform fit\n- [ ] Approve the schedule\n- [ ] Confirm analytics attribution\n- [ ] Publish manually or through an explicitly configured integration`)}\n`;
}

async function generate(args) {
  if (!args.input) throw new Error('--input is required');
  const input = resolve(process.cwd(), args.input);
  const source = await readFile(input, 'utf8');
  const config = await loadConfig();
  const article = extractArticle(source, input);
  const slug = args.slug || slugify(article.title);
  const destination = args.url || article.canonical || `${config.brand.site.replace(/\/$/, '')}/${args.input.replace(/^docs\//, '').replace(/\.html?$/, '.html')}`;
  const campaign = generateCampaign(article, config, { slug, destination });
  await mkdir(outputDir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const output = resolve(outputDir, `${date}-${slug}.md`);
  await writeFile(output, campaign);
  console.log(`Campaign created: ${output}`);
  console.log('Publishing is disabled. Review the campaign before taking external action.');
}

async function articleFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await articleFiles(full));
    else if (/\.(html?|md)$/i.test(entry.name) && !/^index\./i.test(entry.name)) files.push(full);
  }
  return files;
}

async function scan() {
  const files = [...await articleFiles(resolve(root, 'docs/posts')), ...await articleFiles(resolve(root, 'docs/guides'))];
  let outputFiles = [];
  try { outputFiles = await readdir(outputDir); } catch { /* output directory may not exist yet */ }
  const campaignTexts = await Promise.all(outputFiles.filter(file => /\.md$/i.test(file)).map(file => readFile(resolve(outputDir, file), 'utf8')));
  const rows = [];
  for (const file of files) {
    const article = extractArticle(await readFile(file, 'utf8'), file);
    const slug = slugify(article.title);
    const titleWords = slug.split('-').filter(word => word.length > 2).slice(0, 3);
    const campaignExists = campaignTexts.some(text => titleWords.length >= 2 && titleWords.every(word => slugify(text).includes(word)));
    rows.push({ file: file.replace(`${root}/`, ''), title: article.title, slug, campaignExists });
  }
  rows.sort((a, b) => Number(a.campaignExists) - Number(b.campaignExists) || a.file.localeCompare(b.file));
  console.log(JSON.stringify({ totalArticles: rows.length, newCandidates: rows.filter(row => !row.campaignExists).length, articles: rows }, null, 2));
}

async function review(args) {
  if (!args.input) throw new Error('--input is required');
  const metrics = JSON.parse(await readFile(resolve(process.cwd(), args.input), 'utf8'));
  const periods = Array.isArray(metrics) ? metrics : [metrics];
  const totals = periods.reduce((out, row) => {
    for (const key of ['qualified_visits', 'engaged_sessions', 'affiliate_clicks', 'email_signups', 'conversions']) out[key] += Number(row[key] || 0);
    return out;
  }, { qualified_visits: 0, engaged_sessions: 0, affiliate_clicks: 0, email_signups: 0, conversions: 0 });
  const engagementRate = totals.qualified_visits ? (totals.engaged_sessions / totals.qualified_visits * 100).toFixed(1) : '0.0';
  const clickRate = totals.qualified_visits ? (totals.affiliate_clicks / totals.qualified_visits * 100).toFixed(1) : '0.0';
  console.log(JSON.stringify({ periods: periods.length, totals, engagementRate: `${engagementRate}%`, affiliateClickRate: `${clickRate}%`, recommendation: totals.conversions > 0 ? 'Increase the best-performing channel gradually.' : 'Keep drafting and improve the destination or hook before increasing volume.' }, null, 2));
}

async function xCheck() {
  const { getCurrentUser } = await import('./x.mjs');
  console.log(JSON.stringify(await getCurrentUser(), null, 2));
}

async function xPost(args) {
  if (!args.text) throw new Error('--text is required');
  if (!args.send) {
    console.log(JSON.stringify({ dryRun: true, text: args.text, length: args.text.length, message: 'Nothing was posted. Add --send only when this exact text is approved for publication.' }, null, 2));
    return;
  }
  const { postTweet } = await import('./x.mjs');
  console.log(JSON.stringify({ posted: true, ...await postTweet(args.text) }, null, 2));
}

const { positionals, values } = parseArgs({ allowPositionals: true, options: { input: { type: 'string' }, slug: { type: 'string' }, url: { type: 'string' }, text: { type: 'string' }, send: { type: 'boolean' }, help: { type: 'boolean', short: 'h' } } });
if (values.help || !positionals[0]) { usage(); process.exit(0); }
try {
  if (positionals[0] === 'generate') await generate(values);
  else if (positionals[0] === 'scan') await scan();
  else if (positionals[0] === 'x-check') await xCheck();
  else if (positionals[0] === 'x-post') await xPost(values);
  else if (positionals[0] === 'review') await review(values);
  else throw new Error(`Unknown command: ${positionals[0]}`);
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}
