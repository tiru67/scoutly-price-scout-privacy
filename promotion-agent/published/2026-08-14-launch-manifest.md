# Launch manifest — 2026-08-14 (X only)

**Status:** Approved. X is the only active publishing channel.

## Credential status

Run:

```bash
node promotion-agent/run-campaign.mjs x-check
```

Current setup:
- `X_API_BEARER_TOKEN` — present (valid format; API credits depleted on developer account)
- OAuth user tokens — not yet added (required for live posting)

## Day-1 X posts

### boAt audio deals (`boat-audio-deals-under-1100`)

```
boAt Airdopes Alpha at ₹799 is Scoutly's best-value wireless pick under ₹1,100 — but only if you want true wireless. Full comparison: https://scoutly-price-scout.vercel.app/guides/boat-audio-deals-under-1100-india.html?utm_source=x&utm_medium=social&utm_campaign=boat-audio-deals-under-1100
```

### Ambrane Charge R65 (`ambrane-charge-r65`)

```
A "65W" label is only the start. Check USB-C PD compatibility, exact model ACHA-07, port allocation, warranty, and the delivered total before buying. https://scoutly-price-scout.vercel.app/guides/ambrane-charge-r65-65w-gan-charger-india.html?utm_source=x&utm_medium=social&utm_campaign=ambrane-charge-r65
```

## Commands

```bash
# Queue or auto-post (when OAuth tokens are present)
node promotion-agent/run-campaign.mjs publish --campaign boat-audio-deals-under-1100 --platform x
node promotion-agent/run-campaign.mjs publish --campaign ambrane-charge-r65 --platform x --index 0

# Force manual queue only
node promotion-agent/run-campaign.mjs publish --campaign ambrane-charge-r65 --manual
```
