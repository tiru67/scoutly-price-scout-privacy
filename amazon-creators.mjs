const apiBase = 'https://creatorsapi.amazon';
const marketplace = process.env.AMAZON_MARKETPLACE || 'www.amazon.in';
const partnerTag = process.env.AMAZON_IN_PARTNER_TAG;
const clientId = process.env.AMAZON_CREATOR_CLIENT_ID;
const clientSecret = process.env.AMAZON_CREATOR_CLIENT_SECRET;
const tokenUrl = process.env.AMAZON_CREATOR_TOKEN_URL || 'https://api.amazon.co.uk/auth/o2/token';
let cachedToken = null;

export const amazonConnected = Boolean(clientId && clientSecret && partnerTag);

async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value;
  const response = await fetch(tokenUrl, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ grant_type:'client_credentials', client_id:clientId, client_secret:clientSecret, scope:'creatorsapi::default' }) });
  if (!response.ok) throw new Error(`Amazon Creators token request failed: ${response.status}`);
  const payload = await response.json();
  cachedToken = { value:payload.access_token, expiresAt:Date.now() + Number(payload.expires_in || 3600) * 1000 };
  return cachedToken.value;
}

function first(...values) { return values.find(value => value !== undefined && value !== null && value !== '') ?? null; }
function money(value) { return first(value?.amount, value?.displayAmount, value?.value, value); }

export async function searchAmazon({ title, brand, asin, variant }) {
  if (!amazonConnected) return { connected:false, source:'Amazon.in Creators API', items:[] };
  const token = await accessToken();
  const body = { marketplace, partnerTag, partnerType:'Associates', itemCount:10, resources:['images.primary.medium','itemInfo.title','itemInfo.byLineInfo','itemInfo.productInfo','offersV2.listings.price','offersV2.listings.merchantInfo','offersV2.listings.availability','offersV2.listings.condition'], ...(asin ? { itemIds:[asin], itemIdType:'ASIN' } : { keywords:title, ...(brand ? { brand } : {}) }) };
  const operation = asin ? 'getItems' : 'searchItems';
  const response = await fetch(`${apiBase}/catalog/v1/${operation}`, { method:'POST', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','x-marketplace':marketplace}, body:JSON.stringify(body) });
  if (!response.ok) throw new Error(`Amazon Creators ${operation} failed: ${response.status}`);
  const payload = await response.json();
  const rawItems = payload.items?.items || payload.items || payload.searchResult?.items || payload.getItemsResult?.items || [];
  const retrievedAt = new Date().toISOString();
  const items = rawItems.map(item => {
    const listing = item.offers?.listings?.[0] || item.offersV2?.listings?.[0] || {};
    const price = money(listing.price?.money || listing.price);
    const url = item.detailPageURL || item.detailPageUrl || item.links?.[0]?.url || null;
    return { id:item.asin || item.itemId || null, title:item.itemInfo?.title?.displayValue || item.title || '', price:price ? Number(String(price).replace(/[^0-9.]/g,'')) : null, currency:listing.price?.money?.currency || listing.price?.currency || 'INR', url, image:item.images?.primary?.medium?.url || null, seller:listing.merchantInfo?.name || null, availability:listing.availability?.message || null, condition:listing.condition?.value || null, source:'Amazon.in Creators API', retrievedAt, affiliate:true, variant:variant || null };
  }).filter(item => item.title && item.price !== null);
  return { connected:true, source:'Amazon.in Creators API', marketplace, retrievedAt, items };
}
