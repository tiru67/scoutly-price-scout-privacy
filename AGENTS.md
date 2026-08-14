# Scoutly project instructions

When working on promotion tasks:

1. Read `.cursor/rules/blog-promotion-agent.mdc`, `TRAFFIC-PLAYBOOK.md`, and the relevant campaign file.
2. Use `node promotion-agent/cli.mjs generate` to create campaign drafts from a blog article.
3. Store generated campaigns in `promotion-agent/output/`.
4. Keep all publishing draft-only unless the user explicitly approves a configured integration.
5. Never invent live prices, product claims, testing results, rankings, or availability.
6. Keep affiliate disclosures close to affiliate links.
7. Use UTM links and review exported metrics with `node promotion-agent/cli.mjs review`.
8. Run the analytics iteration loop with `node promotion-agent/run-analytics.mjs iterate`.
9. Run `node --check promotion-agent/cli.mjs` and `git diff --check` after changes.

The primary objective is qualified traffic and attributable conversions, not maximum posting volume.
