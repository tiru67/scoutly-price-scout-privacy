# Scoutly Price Scout

Chrome extension MVP for identifying a product on the current page and ranking current, source-backed price candidates.

## Load locally

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked** and select this directory.
4. Open a product page, then click the Scoutly icon.

The extension sends the detected product title and available identifiers to the configured comparison backend. The backend only returns source-backed listings from connected retailer APIs. This release connects eBay Browse API when configured; it does not claim to cover every retailer or guarantee the lowest market price.

Amazon.in support is implemented through the official Creators API adapter in `amazon-creators.mjs`, but remains disabled until Amazon Associates/Creators API access is approved and credentials are configured on the backend.

## Store submission checklist

- Replace the placeholder description and add final screenshots.
- Add a public privacy policy URL explaining the limited product-page data use.
- Register affiliate relationships and disclose them clearly in the UI.
- Connect verified retailer feeds before marketing automated price alerts.
- Run a privacy review before requesting broader host permissions.
