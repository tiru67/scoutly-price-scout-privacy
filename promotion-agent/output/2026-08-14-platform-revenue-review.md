# Scoutly platform revenue review

Generated: 2026-08-14

## Important caveat

No live referral revenue has been attributed by platform yet. This review ranks posts by **monetization strength** and **content-platform fit** until channel metrics are recorded with `record --json '{"channels":{"x":{"affiliate_clicks":3}}}'`.

## Portfolio platform priority

| Rank | Platform | Weighted score | Recommendation |
|---|---|---:|---|
| 1 | organic | 16.3 | Lead the 7-day schedule |
| 2 | x | 13.5 | Secondary channel |
| 3 | community | 13.1 | Support only |
| 4 | shortvideo | 11.9 | Support only |
| 5 | newsletter | 11.2 | Support only |
| 6 | linkedin | 7.5 | Support only |

## Post ranking by referral potential

| Rank | Post | Revenue score | Monetization | Top platforms |
|---|---|---:|---|---|
| 1 | 3 verified boAt audio deals under ₹1,100 in India | 118 | earnkaro_brand_store | shortvideo, x, community |
| 2 | Ambrane Charge R65: should you buy it in India? | 96 | amazon_asin | community, organic, shortvideo |
| 3 | Best power banks under ₹2,000 in India | 55 | amazon_search | organic, x, shortvideo |
| 4 | Best Wi-Fi routers for home in India | 55 | amazon_search | organic, community, newsletter |
| 5 | Best wireless headphones under ₹3,000 in India: how to choose | 50 | amazon_search | organic, x, shortvideo |

## Recommended focus

1. **Primary post:** 3 verified boAt audio deals under ₹1,100 in India (`docs/guides/boat-audio-deals-under-1100-india.html`)
2. **Primary social platform:** x
3. **Secondary social platform:** community
4. **Organic/search** remains the long-term revenue driver but is excluded from the 7-day social schedule.
5. Deprioritize LinkedIn and newsletter until referral clicks are measured per channel.

## Next measurement step

Record per-channel metrics weekly:

```bash
node promotion-agent/run-campaign.mjs record --campaign boat-audio-deals-under-1100 --json '{"channels":{"shortvideo":{"affiliate_clicks":0,"qualified_visits":0},"x":{"affiliate_clicks":0}}}'
```

