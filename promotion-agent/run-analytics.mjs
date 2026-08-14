#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readEvents, importEventsFromJson, saveSnapshot } from '../analytics/lib/store.mjs';
import { buildFunnel } from '../analytics/lib/funnel.mjs';
import { buildIterationPlan, renderIterationMarkdown } from '../analytics/lib/iterate.mjs';
import { recordMetrics } from './lib/metrics.mjs';

const analyticsRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'analytics');
const outputDir = join(analyticsRoot, 'output');
const apiBase = process.env.SCOUTLY_API_URL || 'http://127.0.0.1:4173';

function usage() {
  console.log(`Scoutly analytics iteration loop

Commands:
  funnel [--days <n>] [--dimension all|source|campaign|page]
  iterate [--days <n>]              Analyze funnel and recommend next experiments
  report [--days <n>]               Save markdown iteration report
  sync --campaign <slug> [--days <n>]
                                    Push funnel totals into promotion-agent metrics
  import --file <events.json>       Import exported client events
  collect [--days <n>]              Fetch funnel summary from running API`);
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

function daysAgo(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

async function loadWindow(days) {
  const current = await readEvents({ since: daysAgo(days) });
  const previous = await readEvents({ since: daysAgo(days * 2), until: daysAgo(days) });
  return { current, previous };
}

async function cmdFunnel(args) {
  const days = Number(args.days || 7);
  const dimension = args.dimension || 'all';
  const { current } = await loadWindow(days);
  const funnel = buildFunnel(current, { dimension });
  console.log(JSON.stringify({ ok: true, days, events: current.length, funnel }, null, 2));
}

async function cmdIterate(args) {
  const days = Number(args.days || 7);
  const { current, previous } = await loadWindow(days);
  const plan = buildIterationPlan({ events: current, previousEvents: previous });
  console.log(JSON.stringify({ ok: true, days, events: current.length, plan }, null, 2));
}

async function cmdReport(args) {
  const days = Number(args.days || 7);
  const { current, previous } = await loadWindow(days);
  const plan = buildIterationPlan({ events: current, previousEvents: previous });
  const markdown = renderIterationMarkdown(plan);
  await mkdir(outputDir, { recursive: true });
  const dated = `${new Date().toISOString().slice(0, 10)}-funnel-iteration-${days}d.md`;
  const outputPath = join(outputDir, dated);
  await writeFile(outputPath, markdown, 'utf8');
  await saveSnapshot(`cli-${days}d`, plan);
  console.log(JSON.stringify({ ok: true, outputPath, plan }, null, 2));
}

async function cmdSync(args) {
  const slug = args.campaign;
  if (!slug) throw new Error('sync requires --campaign <slug>');
  const days = Number(args.days || 7);
  const { current } = await loadWindow(days);
  const funnel = buildFunnel(current, { dimension: 'campaign' });
  const row = funnel.rows.find((item) => item.key === slug) || funnel.totals;
  const result = await recordMetrics(slug, {
    qualified_visits: row.visits,
    engaged_sessions: row.engaged,
    affiliate_clicks: row.affiliate_outbound,
    conversions: 0,
    impressions: row.visits,
    channels: {
      analytics: {
        cta_clicks: row.cta_clicks,
        outbound_rate: row.outbound_rate
      }
    }
  });
  console.log(JSON.stringify({ ok: true, slug, synced: row, recorded: result.period }, null, 2));
}

async function cmdImport(args) {
  const file = args.file;
  if (!file) throw new Error('import requires --file <events.json>');
  const payload = JSON.parse(await (await import('node:fs/promises')).readFile(file, 'utf8'));
  const stored = await importEventsFromJson(payload);
  console.log(JSON.stringify({ ok: true, stored: stored.length }, null, 2));
}

async function cmdCollect(args) {
  const days = Number(args.days || 7);
  const response = await fetch(`${apiBase}/api/analytics/funnel?days=${days}`);
  const payload = await response.json();
  console.log(JSON.stringify(payload, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || 'iterate';
  try {
    if (command === 'funnel') return cmdFunnel(args);
    if (command === 'iterate') return cmdIterate(args);
    if (command === 'report') return cmdReport(args);
    if (command === 'sync') return cmdSync(args);
    if (command === 'import') return cmdImport(args);
    if (command === 'collect') return cmdCollect(args);
    if (command === 'help' || command === '--help') return usage();
    throw new Error(`Unknown command: ${command}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

main();
