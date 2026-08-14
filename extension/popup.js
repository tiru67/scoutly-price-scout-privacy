const $ = selector => document.querySelector(selector);
const fallback = { title: '', price: '', currency: '', url: '', hostname: '', brand: '', model: '', gtin: '', asin: '', variant: '' };
let current = fallback;
async function readActiveProduct() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https?:/.test(tab.url || '')) return fallback;
  const result = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => {
    const clean = value => (value || '').replace(/\s+/g, ' ').trim();
    const meta = name => document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.content;
    const textFrom = selectors => selectors.map(selector => document.querySelector(selector)?.textContent || document.querySelector(selector)?.content || '').map(clean).find(Boolean) || '';
    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(node => {
      try { const parsed = JSON.parse(node.textContent); return Array.isArray(parsed) ? parsed : [parsed]; } catch { return []; }
    });
    const product = jsonLd.find(item => item && (item['@type'] === 'Product' || item['@type']?.includes?.('Product')));
    const offer = Array.isArray(product?.offers) ? product.offers[0] : product?.offers;
    const amazon = /(^|\.)amazon\./i.test(location.hostname);
    const title = amazon ? textFrom(['#productTitle', '#title h1', 'h1[data-automation-id="product-title"]']) : '';
    const price = amazon ? textFrom(['#corePriceDisplay_desktop_feature_div .a-price .a-offscreen', '#corePrice_feature_div .a-price .a-offscreen', '#apex_desktop .a-price .a-offscreen', '#price_inside_buybox', '#priceblock_ourprice', '#priceblock_dealprice', '[data-a-color="price"] .a-offscreen']) : '';
    const fallbackTitle = textFrom(['[itemprop="name"]', 'h1']) || clean(product?.name || meta('og:title') || document.title);
    const fallbackPrice = textFrom(['[itemprop="price"]', 'meta[property="product:price:amount"]']) || clean(offer?.price || meta('product:price:amount') || '');
    const rawPrice = price || fallbackPrice;
    const detectedCurrency = clean(offer?.priceCurrency || meta('product:price:currency') || (rawPrice.match(/[₹$€£]|INR|USD|EUR|GBP/) || [''])[0]);
    const identifier = product?.gtin13 || product?.gtin12 || product?.gtin14 || product?.gtin || product?.mpn || meta('product:retailer_item_id') || '';
    const asin = amazon ? (location.pathname.match(/\/dp\/([A-Z0-9]{10})/i)?.[1] || document.querySelector('#ASIN')?.value || document.querySelector('input[name="ASIN"]')?.value || '') : '';
    const brand = typeof product?.brand === 'object' ? product.brand.name : product?.brand;
    const model = product?.model || product?.mpn || '';
    return { title: (title || fallbackTitle).slice(0, 180), price: rawPrice.slice(0, 40), currency: detectedCurrency, brand: clean(brand).slice(0,80), model: clean(model).slice(0,80), gtin: clean(identifier).slice(0,40), asin: clean(asin).slice(0,10), variant: clean(product?.color || product?.size || '').slice(0,80), url: location.href, hostname: location.hostname };
  } });
  return result[0]?.result || fallback;
}
function isWatched(watches) { return watches.some(item => item.url === current.url); }
async function init() {
  try { current = await readActiveProduct(); } catch { current = fallback; }
  if (!current.title) { $('#empty').classList.remove('hidden'); return; }
  $('#product').classList.remove('hidden');
  $('#title').textContent = current.title;
  $('#price').textContent = current.price ? `${current.currency || ''} ${current.price}`.trim() : 'Price not detected';
  $('#site').textContent = current.hostname || 'Current page';
  $('#identity').innerHTML = [current.brand && `Brand: ${current.brand}`, current.model && `Model: ${current.model}`, current.gtin && `ID: ${current.gtin}`, current.variant && `Variant: ${current.variant}`].filter(Boolean).map(value => `<span>${value}</span>`).join('');
  const { watches = [] } = await chrome.storage.local.get('watches');
  updateWatch(isWatched(watches));
}
function updateWatch(saved) { $('#watch').classList.toggle('saved', saved); $('#watch').textContent = saved ? '♥ Price watch saved' : '♡ Watch this price'; }
$('#compare').addEventListener('click', async () => {
  const button=$('#compare'), panel=$('#comparison'); button.disabled=true; button.textContent='Checking verified listings…'; panel.classList.remove('hidden'); panel.innerHTML='<p>Matching the product and checking current listings…</p>';
  try {
    const params=new URLSearchParams({q:current.title, brand:current.brand||'', model:current.model||'', gtin:current.gtin||'', asin:current.asin||'', variant:current.variant||''});
    const response=await fetch(`http://localhost:4173/api/compare?${params}`); const data=await response.json();
    if(!response.ok) throw new Error(data.message||'Comparison service unavailable');
    if(!data.best){ panel.innerHTML='<h2>No verified match yet</h2><p>We found no sufficiently similar listing in the connected source.</p>'; return; }
    panel.innerHTML=`<h2>Best verified delivered-price candidate</h2><div class="result"><strong>${data.best.currency||''} ${data.best.totalPrice ?? data.best.price}</strong><div class="muted">${data.best.matchScore}% match · ${data.best.source}${data.best.shipping != null ? ` · shipping ${data.best.currency||''} ${data.best.shipping}` : ''}</div><a href="${data.best.url}" target="_blank">Open listing ↗</a></div>${data.items.slice(1).map(item=>`<div class="result"><strong>${item.currency||''} ${item.totalPrice ?? item.price}</strong><div class="muted">${item.matchScore}% match · ${item.source}</div><a href="${item.url}" target="_blank">Open listing ↗</a></div>`).join('')}<p>Retrieved ${new Date(data.retrievedAt).toLocaleString()}. Taxes, condition, seller quality, warranty, and delivery date still need verification at checkout.</p>`;
  } catch(error) { panel.innerHTML=`<h2>Comparison service not connected</h2><p>${error.message}. Start the Scoutly comparison server and connect an approved retailer feed.</p>`; }
  finally { button.disabled=false; button.textContent='Find best verified price ↗'; }
});
$('#watch').addEventListener('click', async () => {
  const { watches = [] } = await chrome.storage.local.get('watches');
  const next = isWatched(watches) ? watches.filter(item => item.url !== current.url) : [...watches, { ...current, createdAt: new Date().toISOString() }];
  await chrome.storage.local.set({ watches: next });
  updateWatch(isWatched(next));
  $('#watchStatus').textContent = isWatched(next) ? 'Saved locally. Live price alerts connect in the next release.' : 'Price watch removed.';
});
init();
