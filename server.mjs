import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { amazonConnected, searchAmazon } from './amazon-creators.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4173);
const hasEbay = Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);

const sources = {
  ebay: { name: 'eBay Browse API', connected: hasEbay, description: 'Live catalog listings and prices from eBay’s official API.' },
  trends: { name: 'Google Trends API', connected: Boolean(process.env.GOOGLE_TRENDS_TOKEN), description: 'Search-interest trends with a retrieval timestamp.' },
  supplier: { name: 'Supplier cost feed', connected: Boolean(process.env.SUPPLIER_FEED_URL), description: 'Verified unit cost and availability from your configured supplier feed.' }
  ,amazon: { name: 'Amazon.in Creators API', connected: amazonConnected, description: 'Official Amazon.in catalog and offer data through the Associates Creators API.' }
};

function json(res, status, body) { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify(body)); }
const ebayBase = process.env.EBAY_API_BASE || 'https://api.sandbox.ebay.com';
const ebayMarketplace = process.env.EBAY_MARKETPLACE_ID || 'EBAY_IN';
async function ebayToken() {
  const auth = Buffer.from(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`${ebayBase}/identity/v1/oauth2/token`, { method:'POST', headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'}, body:'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope' });
  if (!response.ok) throw new Error(`eBay OAuth failed: ${response.status}`);
  return (await response.json()).access_token;
}
async function opportunities(url, res) {
  if (!hasEbay) return json(res, 503, { error:'LIVE_SOURCES_NOT_CONFIGURED', message:'No live source is configured. Product opportunities are intentionally withheld.', sources });
  try {
    const token = await ebayToken();
    const query = url.searchParams.get('q') || 'products';
    const response = await fetch(`${ebayBase}/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}&limit=20`, { headers:{Authorization:`Bearer ${token}`,'X-EBAY-C-MARKETPLACE-ID':ebayMarketplace} });
    if (!response.ok) throw new Error(`eBay Browse API failed: ${response.status}`);
    const payload = await response.json(); const retrievedAt = new Date().toISOString();
    const items = (payload.itemSummaries || []).map(item => ({ id:item.itemId, title:item.title, price:item.price?.value ?? null, currency:item.price?.currency ?? null, url:item.itemWebUrl ?? null, image:item.image?.imageUrl ?? null, source:'eBay Browse API', retrievedAt, verifiedFields:['title','price','currency','url'] }));
    return json(res, 200, { source:'eBay Browse API', retrievedAt, items, note:'Demand, supplier cost, landed cost, and ROI are withheld until their respective live sources are connected.' });
  } catch (error) { return json(res, 502, { error:'LIVE_SOURCE_ERROR', message:error.message, source:'eBay Browse API' }); }
}
function tokens(value) { return new Set((value.toLowerCase().match(/[a-z0-9]+/g) || []).filter(token => !['the','and','for','with','from','amazon','india','new','sale'].includes(token))); }
function matchScore(query, title, identity={}) { const wanted=tokens([query, identity.brand, identity.model, identity.gtin].filter(Boolean).join(' ')), found=tokens(title); if (!wanted.size || !found.size) return 0; let hits=0; wanted.forEach(token=>{ if(found.has(token) || [...found].some(candidate=>candidate.includes(token)||token.includes(candidate))) hits++; }); const exactId=identity.gtin && title.toLowerCase().includes(identity.gtin.toLowerCase()) ? 25 : 0; return Math.min(100, Math.round(hits/wanted.size*75)+exactId); }
async function compare(url, res) {
  const query = (url.searchParams.get('q') || '').trim();
  const identity = { brand:url.searchParams.get('brand') || '', model:url.searchParams.get('model') || '', gtin:url.searchParams.get('gtin') || '', asin:url.searchParams.get('asin') || '', variant:url.searchParams.get('variant') || '' };
  if (!query) return json(res, 400, { error:'MISSING_QUERY', message:'A product title is required.' });
  try {
    const retrievedAt = new Date().toISOString();
    const connectorResults = await Promise.allSettled([
      hasEbay ? (async () => { const token=await ebayToken(); const response=await fetch(`${ebayBase}/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}&limit=30`, { headers:{Authorization:`Bearer ${token}`,'X-EBAY-C-MARKETPLACE-ID':ebayMarketplace} }); if(!response.ok) throw new Error(`eBay Browse API failed: ${response.status}`); const payload=await response.json(); return (payload.itemSummaries||[]).map(item=>{const shipping=item.shippingOptions?.[0]?.shippingCost?.value??null;const price=item.price?.value??null;return {id:item.itemId,title:item.title,price,totalPrice:price!==null&&shipping!==null?Number(price)+Number(shipping):price,shipping,currency:item.price?.currency??null,url:item.itemWebUrl??null,image:item.image?.imageUrl??null,seller:item.seller?.username??null,sellerFeedback:item.seller?.feedbackPercentage??null,condition:item.condition??null,source:'eBay Browse API',retrievedAt,matchScore:matchScore(query,item.title,identity)}}) })() : Promise.resolve([]),
      amazonConnected ? searchAmazon({ title:query, brand:identity.brand, asin:identity.asin, variant:identity.variant }).then(result=>result.items.map(item=>({...item,totalPrice:item.price,matchScore:identity.asin && item.id===identity.asin ? 100 : matchScore(query,item.title,identity)}))) : Promise.resolve([])
    ]);
    const items=connectorResults.flatMap(result=>result.status==='fulfilled'?result.value:[]).filter(item=>item.price!==null&&item.matchScore>=35).sort((a,b)=>(a.totalPrice-b.totalPrice)||(b.matchScore-a.matchScore)).slice(0,5);
    if(!items.length) return json(res, 503, { error:'NO_VERIFIED_MATCH', message:'No connected retailer returned a sufficiently strong product match.', query, identity, sources });
    return json(res, 200, { query, identity, retrievedAt, best:items[0], items, sources, note:'Results are ranked only among connected, approved retailer feeds. Taxes, seller quality, warranty, condition, and delivery date still need buyer verification.' });
  } catch (error) { return json(res, 502, { error:'COMPARISON_SOURCE_ERROR', message:error.message, source:'eBay Browse API' }); }
}
async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api/status') return json(res, 200, { ready:Object.values(sources).every(source=>source.connected), sources });
  if (url.pathname === '/api/opportunities') return opportunities(url, res);
  if (url.pathname === '/api/compare') return compare(url, res);
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = join(root, requested);
  try { const body = await readFile(file); const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.mjs':'text/javascript'}; res.writeHead(200, {'Content-Type':types[extname(file)] || 'application/octet-stream'}); res.end(body); } catch { res.writeHead(404); res.end('Not found'); }
}
createServer(handler).listen(port, () => console.log(`Scoutly live-only server listening on http://localhost:${port}`));
