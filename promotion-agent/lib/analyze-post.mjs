const PRICE_PATTERN = /₹[\d,]+(?:\s*[–-]\s*₹[\d,]+)?/g;
const ASIN_PATTERN = /\bB0[A-Z0-9]{8}\b/;
const MODEL_PATTERN = /\b[A-Z]{2,5}-\d{2,3}\b/;

function firstMatch(pattern, text) {
  const match = text.match(pattern);
  return match ? match[0] : null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function extractClaims(content) {
  const claims = [];
  if (/65W/i.test(content)) claims.push('Product supports up to 65W total output');
  if (/20W\s*\+\s*45W|45W\s*\+\s*20W/i.test(content)) {
    claims.push('Simultaneous dual USB-C use splits output (official manual allocation applies)');
  }
  if (/ACHA-07/i.test(content)) claims.push('Exact model identifier is ACHA-07');
  if (ASIN_PATTERN.test(content)) claims.push(`Amazon ASIN ${firstMatch(ASIN_PATTERN, content)}`);
  if (/₹2,499|2499/i.test(content) && /₹2,999|2999/i.test(content)) {
    claims.push('Editorial price band referenced as ₹2,499–₹2,999; live price must be rechecked');
  }
  if (/not physically tested|has not physically tested/i.test(content)) {
    claims.push('Scoutly has not physically tested the product');
  }
  if (/USB Power Delivery|USB-C PD|PD\/PPS/i.test(content)) {
    claims.push('Compatibility depends on device USB-C PD/PPS support');
  }
  return unique(claims);
}

function inferAudience(content) {
  if (/laptop|professional|student|travell/i.test(content)) {
    return 'Indian professionals, students, and travellers with USB-C laptops and phones';
  }
  return 'Indian shoppers researching electronics purchases with evidence-first criteria';
}

function inferIntent(content) {
  if (/should you buy|worth|verdict|buying guide/i.test(content)) {
    return 'Commercial investigation — decide whether a specific charger model fits the buyer setup';
  }
  if (/compare|versus|vs\b/i.test(content)) return 'Comparison — evaluate alternatives before purchase';
  return 'Informational — learn compatibility and price-check steps before buying';
}

function inferCta(content, guideUrl) {
  if (/amazon\.in/i.test(content)) {
    return {
      action: 'Check current Amazon.in price after verifying exact model and seller',
      destination: guideUrl || 'Guide page with disclosed affiliate CTA',
      type: 'affiliate_click'
    };
  }
  return {
    action: 'Read the guide and verify retailer evidence before purchase',
    destination: guideUrl || 'Guide page',
    type: 'qualified_visit'
  };
}

function inferGuideUrl(post) {
  if (post.guideUrl) return post.guideUrl;
  const slug = post.slug;
  if (slug.includes('ambrane-charge-r65')) {
    return 'https://scoutly-price-scout.vercel.app/guides/ambrane-charge-r65-65w-gan-charger-india.html';
  }
  return `${post.slug ? `https://scoutly-price-scout.vercel.app/guides/${slug}.html` : null}`;
}

export function analyzePost(post) {
  const content = post.content || '';
  const guideUrl = inferGuideUrl(post);
  const asin = firstMatch(ASIN_PATTERN, content);
  const model = firstMatch(MODEL_PATTERN, content) || (content.includes('ACHA-07') ? 'ACHA-07' : null);
  const affiliateUrl = asin
    ? `https://www.amazon.in/dp/${asin}?tag=scoutlyprice2-21`
    : null;

  return {
    title: post.title,
    slug: post.slug,
    sourcePath: post.path,
    sourceKind: post.kind,
    guideUrl,
    affiliateUrl,
    audience: inferAudience(content),
    searchIntent: inferIntent(content),
    primaryKpi: 'qualified_visits_and_affiliate_clicks',
    claims: extractClaims(content),
    cta: inferCta(content, guideUrl),
    product: {
      name: /Ambrane Charge R65/i.test(content) ? 'Ambrane Charge R65' : null,
      model,
      asin,
      priceBand: unique((content.match(PRICE_PATTERN) || []).slice(0, 3))
    },
    verificationRequired: [
      'Recheck live Amazon.in price, seller, and stock before any post references a price threshold',
      'Confirm listing shows Charge R65, model ACHA-07, and ASIN B0FLPYQJ57',
      'Do not claim lowest price unless a verified source supports it at publish time',
      'Keep affiliate disclosure visible wherever a CTA appears'
    ]
  };
}
