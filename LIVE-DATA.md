# Scoutly live-data setup

Scoutly is now evidence-only: it does not display seeded opportunities or calculate ROI from invented values.

## Start the live-only server

```sh
node server.mjs
```

Copy `.env.example` to `.env` and provide credentials through your shell or deployment secret manager. Do not commit credentials.

## What is verified

- eBay Browse API: listing title, current listing price, currency, URL, image, and retrieval timestamp.
- Google Trends API: search-interest data only after approved API access is configured.
- Supplier feed: unit cost and availability only if the feed is authenticated and returns current records.

Scoutly will not calculate ROI until both a current selling-price source and a current supplier-cost source are connected. Search interest is not treated as sales demand, and listing price is not treated as profit.

## Amazon.in comparison connector

The Amazon connector uses the official Amazon Creators API from the server. It is disabled unless all of these are configured:

```sh
AMAZON_CREATOR_CLIENT_ID=
AMAZON_CREATOR_CLIENT_SECRET=
AMAZON_IN_PARTNER_TAG=scoutlyprice2-21
AMAZON_MARKETPLACE=www.amazon.in
AMAZON_CREATOR_TOKEN_URL=https://api.amazon.co.uk/auth/o2/token
```

Amazon requires an approved Associates account and Creators API access. Never put these credentials in the extension or commit them to Git. Product results are withheld when the connector is not approved or connected.
