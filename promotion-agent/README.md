# Scoutly promotion agent

Evidence-first, draft-first campaign workflow for Scoutly blog and guide promotion.

## Quick start
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

```bash
# Detect new marketing briefs or published guides
node promotion-agent/run-campaign.mjs detect

# Run the first campaign from the Ambrane brief
node promotion-agent/run-campaign.mjs run --post marketing/ambrane-charge-r65-launch.md

# Review metrics and experiment recommendations
node promotion-agent/run-campaign.mjs status --campaign ambrane-charge-r65

# Append a weekly review snapshot
node promotion-agent/run-campaign.mjs record --campaign ambrane-charge-r65 --json '{"qualified_visits":12,"engaged_sessions":5,"affiliate_clicks":1,"impressions":40}'

# Publishing is blocked until you explicitly approve
node promotion-agent/run-campaign.mjs publish-check --campaign ambrane-charge-r65 --platform linkedin
```

## Operating rules

Read these before every run:

- `.cursor/rules/blog-promotion-agent.mdc`
- `TRAFFIC-PLAYBOOK.md`
- `promotion-agent/config.json`

## Workflow (9 steps)

1. **Detect or accept a post** — `detect` scans `marketing/` and `docs/guides/`; `run --post` accepts a specific brief or guide.
2. **Analyze audience, intent, claims, CTA** — extracted automatically into the campaign output.
3. **Generate platform drafts** — LinkedIn (3), X (5), newsletter, community (3), short-video (3), plus thread and carousel outlines.
4. **Add UTM links** — per-channel links with `utm_campaign=<slug>`.
5. **Save campaign** — dated Markdown file in `promotion-agent/output/`.
6. **Seven-day schedule** — included in each campaign file.
7. **Track results** — `promotion-agent/metrics/campaigns.json` via `record`.
8. **Recommend experiments** — `status` compares review periods and suggests the next hook test.
9. **Approval gate** — `promotion-agent/approvals/<slug>.json` keeps `publishApproved: false` until you explicitly approve.

## What must be connected before publishing

- A supported social or email API/MCP integration
- Analytics access (GA4, Plausible, Vercel Analytics, or equivalent)
- Amazon Associates reporting for `scoutlyprice2-21`
- Explicit human approval per campaign and platform

Keep tokens in Cursor secrets. Never commit credentials to this repository.

## Campaign output

Each run creates one dated file in `promotion-agent/output/` containing:

- Campaign summary and primary KPI
- Platform-specific drafts (not copy-pasted across channels)
- UTM links
- Seven-day schedule
- Measurement plan
- Experiment recommendation
- Risks, verification checklist, and stop/pause guidance

## Recommended first campaign

`marketing/ambrane-charge-r65-launch.md` → `promotion-agent/output/2026-08-14-ambrane-charge-r65.md`

## Safety defaults

- `requireApprovalBeforePublish: true`
- `autoPublish: false` on every channel
- No invented live prices
- No duplicate community replies
- No artificial engagement

## Start in Cursor Agent

```text
Read .cursor/rules/blog-promotion-agent.mdc, promotion-agent/config.json,
TRAFFIC-PLAYBOOK.md, and marketing/ambrane-charge-r65-launch.md.

Run node promotion-agent/run-campaign.mjs run --post marketing/ambrane-charge-r65-launch.md
Review the output in promotion-agent/output/ and wait for my approval before publishing.
```
