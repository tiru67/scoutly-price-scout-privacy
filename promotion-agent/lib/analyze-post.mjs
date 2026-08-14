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

function detectMonetization(content) {
  const earnkaro = (content.match(/\/go\/boat-/gi) || []).length;
  const asin = firstMatch(ASIN_PATTERN, content);
  const search = (content.match(/amazon\.in\/s\?/gi) || []).length;
  if (earnkaro >= 1) return { type: 'earnkaro_brand_store', label: 'EarnKaro → official brand store' };
  if (asin) return { type: 'amazon_asin', label: 'Amazon direct ASIN', asin };
  if (search) return { type: 'amazon_search', label: 'Amazon search affiliate' };
  return { type: 'none', label: 'No affiliate path' };
}

function extractClaims(content, monetization) {
  const claims = [];
  if (/65W/i.test(content)) claims.push('Product supports up to 65W total output');
  if (/20W\s*\+\s*45W|45W\s*\+\s*20W/i.test(content)) {
    claims.push('Simultaneous dual USB-C use splits output (official manual allocation applies)');
  }
  if (/ACHA-07/i.test(content)) claims.push('Exact model identifier is ACHA-07');
  if (ASIN_PATTERN.test(content)) claims.push(`Amazon ASIN ${firstMatch(ASIN_PATTERN, content)}`);
  if (/Airdopes Alpha/i.test(content)) claims.push('boAt Airdopes Alpha price checked on official store — recheck before publish');
  if (/Rockerz 255/i.test(content)) claims.push('boAt Rockerz 255 Pro+ price checked on official store — recheck before publish');
  if (/BassHeads 104/i.test(content)) claims.push('boAt BassHeads 104 price checked on official store — recheck before publish');
  if (/₹2,499|2499/i.test(content) && /₹2,999|2999/i.test(content)) {
    claims.push('Editorial price band referenced as ₹2,499–₹2,999; live price must be rechecked');
  }
  if (/not physically tested|has not physically tested/i.test(content)) {
    claims.push('Scoutly has not physically tested the product');
  }
  if (/USB Power Delivery|USB-C PD|PD\/PPS/i.test(content)) {
    claims.push('Compatibility depends on device USB-C PD/PPS support');
  }
  if (monetization.type === 'earnkaro_brand_store') {
    claims.push('Marked links use EarnKaro Profit Links; Scoutly may earn commission on qualifying orders');
  }
  return unique(claims);
}

function inferAudience(content) {
  if (/ambrane|65W|GaN charger|USB-C laptop/i.test(content)) {
    return 'Indian professionals, students, and travellers with USB-C laptops and phones';
  }
  if (/boat|earbuds|audio|headphone/i.test(content)) {
    return 'Indian shoppers comparing affordable audio under ₹1,100–₹3,000';
  }
  return 'Indian shoppers researching electronics purchases with evidence-first criteria';
}

function inferIntent(content) {
  if (/deal|under ₹|verified/i.test(content)) return 'Deal comparison — pick the right product at a checked price';
  if (/should you buy|worth|verdict|buying guide/i.test(content)) {
    return 'Commercial investigation — decide whether a specific product fits the buyer setup';
  }
  if (/compare|versus|vs\b/i.test(content)) return 'Comparison — evaluate alternatives before purchase';
  return 'Informational — learn compatibility and price-check steps before buying';
}

function inferCta(content, guideUrl, monetization) {
  if (monetization.type === 'earnkaro_brand_store') {
    return {
      action: 'Open the checked official-store offer after verifying variant and live price',
      destination: guideUrl,
      type: 'affiliate_click'
    };
  }
  if (monetization.type === 'amazon_asin') {
    return {
      action: 'Check current Amazon.in price after verifying exact model and seller',
      destination: guideUrl,
      type: 'affiliate_click'
    };
  }
  return {
    action: 'Read the guide and verify retailer evidence before purchase',
    destination: guideUrl,
    type: 'qualified_visit'
  };
}

function inferGuideUrl(post) {
  if (post.guideUrl) return post.guideUrl;
  const slug = post.slug;
  const map = {
    'ambrane-charge-r65': 'https://scoutly-price-scout.vercel.app/guides/ambrane-charge-r65-65w-gan-charger-india.html',
    'ambrane-charge-r65-65w-gan-charger-india': 'https://scoutly-price-scout.vercel.app/guides/ambrane-charge-r65-65w-gan-charger-india.html',
    'boat-audio-deals-under-1100-india': 'https://scoutly-price-scout.vercel.app/guides/boat-audio-deals-under-1100-india.html'
  };
  if (map[slug]) return map[slug];
  if (post.kind === 'published-guide' || post.path?.includes('/guides/')) {
    return `https://scoutly-price-scout.vercel.app/guides/${slug}.html`;
  }
  return null;
}

function defaultVerification(monetization, content) {
  if (monetization.type === 'earnkaro_brand_store') {
    return [
      'Recheck live official-store prices and variant availability before any post goes live',
      'Keep EarnKaro/affiliate disclosure visible near every CTA',
      'Do not claim lowest market price unless verified at publish time'
    ];
  }
  if (monetization.type === 'amazon_asin') {
    return [
      'Recheck live Amazon.in price, seller, and stock before any post references a price threshold',
      'Confirm listing shows the exact model and ASIN referenced in the guide',
      'Do not claim lowest price unless a verified source supports it at publish time',
      'Keep affiliate disclosure visible wherever a CTA appears'
    ];
  }
  return ['Keep disclosures visible near any retailer CTA', 'Recheck live prices before publishing price references'];
}

function campaignSlugFromPost(post) {
  const slug = post.slug.replace(/-launch$/, '');
  if (slug.includes('boat-audio')) return 'boat-audio-deals-under-1100';
  if (slug.includes('ambrane-charge-r65')) return 'ambrane-charge-r65';
  return slug;
}

export function analyzePost(post, { auditEntry, platformChoice } = {}) {
  const content = post.content || '';
  const guideUrl = inferGuideUrl(post);
  const monetization = detectMonetization(content);
  const asin = monetization.asin || firstMatch(ASIN_PATTERN, content);
  const model = firstMatch(MODEL_PATTERN, content) || (content.includes('ACHA-07') ? 'ACHA-07' : null);
  const affiliateUrl = asin ? `https://www.amazon.in/dp/${asin}?tag=scoutlyprice2-21` : null;
  const campaignSlug = campaignSlugFromPost(post);

  return {
    title: post.title,
    slug: campaignSlug,
    sourcePath: post.path,
    sourceKind: post.kind,
    guideUrl,
    affiliateUrl,
    monetization,
    audience: inferAudience(content),
    searchIntent: inferIntent(content),
    primaryKpi: 'referral_clicks_and_conversions',
    claims: extractClaims(content, monetization),
    cta: inferCta(content, guideUrl, monetization),
    product: {
      name: /Ambrane Charge R65/i.test(content) ? 'Ambrane Charge R65'
        : /boat/i.test(content) ? 'boAt audio shortlist' : null,
      model,
      asin,
      priceBand: unique((content.match(PRICE_PATTERN) || []).slice(0, 3))
    },
    verificationRequired: defaultVerification(monetization, content),
    platformChoice: platformChoice || null,
    revenueScore: auditEntry?.revenueScore || 0
  };
}
