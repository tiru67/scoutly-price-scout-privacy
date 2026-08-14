# Launch manifest — 2026-08-14

**Status:** Approved and queued for manual publish (no social API connected).

Both campaigns were approved by explicit user request. Day-1 schedule items are logged in `log.jsonl`.

## boAt audio deals (`boat-audio-deals-under-1100`)

| Field | Value |
|---|---|
| Day | 1 |
| Channel | shortvideo |
| Asset | video-1 |
| Status | ready_for_manual_post |

**Script (Reels/Shorts):**

```
Hook: "Three boAt deals under ₹1,100 — but only one fits your routine."
Beat 1: Airdopes Alpha ₹799 — wireless, best value
Beat 2: Rockerz 255 Pro+ ₹1,099 — neckband, longer battery
Beat 3: BassHeads 104 ₹349 — wired, cheapest
CTA: "Match the exact variant, then recheck the live price."
https://scoutly-price-scout.vercel.app/guides/boat-audio-deals-under-1100-india.html?utm_source=shortvideo&utm_medium=video&utm_campaign=boat-audio-deals-under-1100
Disclosure: the linked Scoutly guide contains EarnKaro affiliate links.
```

**Action:** Record and upload to Instagram Reels or YouTube Shorts. Recheck official-store prices before filming CTA.

---

## Ambrane Charge R65 (`ambrane-charge-r65`)

| Field | Value |
|---|---|
| Day | 1 |
| Channel | community |
| Asset | community-1 |
| Status | ready_for_manual_post |

**Reply draft (use only on relevant threads; do not mass-post):**

```
If your laptop accepts USB-C Power Delivery at 65W or less, a 65W charger can be enough. Check the wattage printed on your original adapter and whether the laptop charges over USB-C at all. For the Ambrane Charge R65 specifically, also confirm model ACHA-07 on the listing and remember that using two outputs changes the allocation. I documented the manual's split and a buying checklist here: https://scoutly-price-scout.vercel.app/guides/ambrane-charge-r65-65w-gan-charger-india.html?utm_source=community&utm_medium=referral&utm_campaign=ambrane-charge-r65 Disclosure: the linked Scoutly guide contains an Amazon affiliate link.
```

**Suggested communities:** Reddit r/IndianGaming or r/developersIndia (charger/laptop threads), IndiaTech subreddits — only when someone asks about 65W chargers or laptop USB-C charging.

---

## Next scheduled posts (do not publish yet)

| Campaign | Day | Channel | Asset |
|---|---|---|---|
| boAt | 2 | x | x-1 |
| boAt | 3 | community | community-1 |
| Ambrane | 2 | shortvideo | video-1 |
| Ambrane | 3 | x | x-1 |

Run `node promotion-agent/run-campaign.mjs publish --campaign <slug> --platform <name>` when each day arrives.
