# Scoutly promotion agent

This folder is the operating layer for a Cursor Agent or Cursor Automation that promotes Scoutly articles while keeping campaigns evidence-first and draft-first.

## Run locally with Codex

The MVP is a dependency-free Node CLI. It analyzes an HTML or Markdown article and writes a reviewable campaign file with platform drafts, UTM links, a schedule, an experiment, and guardrails.

```bash
node promotion-agent/cli.mjs generate \
  --input docs/guides/ambrane-charge-r65-65w-gan-charger-india.html \
  --slug ambrane-charge-r65
```

Scan the existing blog and identify articles without a matching campaign:

```bash
node promotion-agent/cli.mjs scan
```

Review campaign results by placing exported metrics in the same shape as `metrics.example.json`:

```bash
node promotion-agent/cli.mjs review --input promotion-agent/metrics.example.json
```

The CLI never publishes externally. Publishing should be added only after the corresponding platform API/MCP integration, secret, rate limit, and approval rule are configured.

## Run repeatedly with Codex

Use [codex-automation-prompt.md](codex-automation-prompt.md) as the instruction for a recurring Codex task. The prompt makes each run idempotent at the campaign-output level, asks for metrics-based improvement, and keeps external publishing disabled until integrations and approval rules are ready.

If a live integration is blocked, follow [BLOCKERS.md](BLOCKERS.md) and provide only the specific account, schedule, or secret needed for that step.

## Start in Cursor

Open this repository in Cursor and ask Agent:

```text
Read .cursor/rules/blog-promotion-agent.mdc, promotion-agent/config.example.json,
TRAFFIC-PLAYBOOK.md, and the relevant file in marketing/.

Create the first seven-day promotion campaign for the strongest existing article.
Use the Ambrane Charge R65 campaign if it is still the current priority.
Write every draft and the schedule to promotion-agent/output/.
Do not publish or call an external messaging API. Report missing credentials and
the exact approval needed before any external action.
```

## What must be connected before publishing

- A supported social or email API/MCP integration
- Analytics access (GA4, Plausible, or equivalent)
- A destination URL and approved UTM naming convention
- A review/approval step
- Platform-specific daily limits

Keep tokens in Cursor's secret/environment-variable storage. Never commit them to this repository or put them in `config.example.json`.

## Campaign output

The agent should create one dated Markdown file per run in `promotion-agent/output/`, containing drafts, links, schedule, claims requiring verification, and measurement results.

## Recommended first campaign

Use `marketing/ambrane-charge-r65-launch.md`. The existing `TRAFFIC-PLAYBOOK.md` already contains disclosure, anti-spam, and price-claim rules that the agent must follow.
