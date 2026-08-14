# Scoutly analytics

Evidence-first funnel analytics and iteration loop for Scoutly guides.

## Funnel stages

1. `page_view` — visitor lands on a page
2. `engaged` — 20s dwell or 50% scroll depth
3. `cta_click` — affiliate CTA clicked
4. `affiliate_outbound` — user leaves to `/go/` or Amazon affiliate URL

Events are attributed with `utm_source`, `utm_medium`, and `utm_campaign` for the session.

## Collection

- **Client:** `docs/site.js` tracks funnel events (respects analytics opt-out)
- **API:** `POST /api/analytics/events` on `server.mjs` (`:4173`)
- **Offline queue:** if no API endpoint is configured, events queue in `localStorage` and can be imported

## Iteration loop

```bash
# 1. Review funnel
node promotion-agent/run-analytics.mjs funnel --days 7

# 2. Get experiment recommendations
node promotion-agent/run-analytics.mjs iterate --days 7

# 3. Save markdown report
node promotion-agent/run-analytics.mjs report --days 7

# 4. Sync totals into a campaign metrics file
node promotion-agent/run-analytics.mjs sync --campaign boat-audio-deals-under-1100 --days 7

# 5. Re-run promotion status / experiments
node promotion-agent/run-campaign.mjs status --campaign boat-audio-deals-under-1100
```

## Weekly loop

1. Collect traffic (automatic via site + API, or `import` exported events)
2. Run `iterate` to find the weakest funnel step
3. Apply one page or CTA experiment on the highest-traffic guide
4. `sync` metrics into the campaign record
5. Promote only the winning `utm_source` after two review periods
