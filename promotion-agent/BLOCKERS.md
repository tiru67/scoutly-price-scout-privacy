# Blocker instructions

The agent can generate and review campaigns locally. These steps are only needed when you want live analytics, scheduled runs, or external publishing.

## 1. Choose the destination and schedule

Decide:

- Blog production URL (the Vercel URL or GitHub Pages URL)
- Campaign schedule, for example daily at 09:00 Asia/Kolkata
- Whether publishing requires your approval every time

Tell Codex those three values in one message.

## 2. Add analytics

Choose one:

- Google Analytics 4: provide a read-only property/data-stream connection or export a CSV/JSON report into `promotion-agent/metrics/`.
- Plausible: provide the site domain and a read-only API token through the secret manager.

Never paste an API token into chat, Git, Markdown, or `config.example.json`.

The minimum fields needed are:

```json
{
  "period": "2026-08-14",
  "source": "linkedin",
  "qualified_visits": 0,
  "engaged_sessions": 0,
  "affiliate_clicks": 0,
  "email_signups": 0,
  "conversions": 0
}
```

## 3. Add the email provider

The daily automation is active, but it will remain report-only until Amazon SES is connected.

Then provide, through the secret manager only:

1. API key or SMTP credential.
2. Verified sender email/domain.
3. Audience/list identifier.
4. Bounce and unsubscribe webhook, if supported.
5. Daily and weekly send limits.

For SES specifically, create a contact list with a topic such as `Scoutly newsletter`,
verify the sending domain in the same AWS Region, request production access if the
account is still in the sandbox, and provide the SES Region plus the contact-list
name/ID. SES requires a verified identity before sending; sandbox accounts can send
only to verified recipients.

For the local Codex marketing agent, keep X credentials in `.env.local` on your
computer. That file is ignored by Git. Load it into the local automation process;
never commit it, paste it into chat, or expose it to browser/frontend code. The
required variable names are documented in `.env.example`.

The first email campaign should remain limited to one useful email per week until ROI, bounce rate, unsubscribe rate, and conversion attribution are verified.

## 4. Add publishing accounts one at a time

Start with the Amazon SES email channel. For each channel provide:

1. The official API/MCP integration name.
2. A secret stored in the platform's secret manager.
3. The account/page identity to use.
4. Daily and weekly limits.
5. Whether drafts may be sent automatically or must wait for approval. Your current policy is automatic sending after SES is configured.

Do not grant broad account access just to test draft generation. Draft generation works without publishing permissions.

## 5. Activate recurring runs

In Codex, create a recurring task using `promotion-agent/codex-automation-prompt.md`. Set the schedule and repository access, then keep the first runs in report-only mode.

Expected first-run report:

- New article detected
- Campaign output path
- Claims requiring verification
- Drafts and UTM links
- Metrics available or missing
- Exact approval needed

## 6. Move from drafts to publishing

Only after at least two reviewed campaigns:

- Connect one publishing channel.
- Keep the initial email limit at one campaign per week.
- Send one controlled campaign and verify attribution, bounces, and unsubscribes.
- Confirm the published URL and analytics attribution.
- Increase volume only when qualified traffic or conversions improve.
