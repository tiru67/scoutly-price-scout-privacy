const $ = selector => document.querySelector(selector);
const fallback = { title: '', price: '', currency: '', url: '', hostname: '' };
let current = fallback;
async function readActiveProduct() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https?:/.test(tab.url || '')) return fallback;
  const result = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => {
    const clean = value => (value || '').replace(/\s+/g, ' ').trim();
    const meta = name => document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.content;
    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(node => {
      try { const parsed = JSON.parse(node.textContent); return Array.isArray(parsed) ? parsed : [parsed]; } catch { return []; }
    });
    const product = jsonLd.find(item => item && (item['@type'] === 'Product' || item['@type']?.includes?.('Product')));
    const offer = Array.isArray(product?.offers) ? product.offers[0] : product?.offers;
    return { title: clean(product?.name || meta('og:title') || document.querySelector('h1')?.textContent || document.title).slice(0, 180), price: clean(offer?.price || meta('product:price:amount') || document.querySelector('[itemprop="price"]')?.content || '').slice(0, 40), currency: clean(offer?.priceCurrency || meta('product:price:currency') || ''), url: location.href, hostname: location.hostname };
  } });
  return result[0]?.result || fallback;
}
function searchUrl(engine) {
  const query = encodeURIComponent(current.title);
  return engine === 'google' ? `https://www.google.com/search?tbm=shop&q=${query}` : `https://www.bing.com/shop?q=${query}`;
}
function isWatched(watches) { return watches.some(item => item.url === current.url); }
async function init() {
  try { current = await readActiveProduct(); } catch { current = fallback; }
  if (!current.title) { $('#empty').classList.remove('hidden'); return; }
  $('#product').classList.remove('hidden');
  $('#title').textContent = current.title;
  $('#price').textContent = current.price ? `${current.currency || ''} ${current.price}`.trim() : 'Price not detected';
  $('#site').textContent = current.hostname || 'Current page';
  const { watches = [] } = await chrome.storage.local.get('watches');
  updateWatch(isWatched(watches));
}
function updateWatch(saved) { $('#watch').classList.toggle('saved', saved); $('#watch').textContent = saved ? '♥ Price watch saved' : '♡ Watch this price'; }
$('#google').addEventListener('click', () => chrome.tabs.create({ url: searchUrl('google') }));
$('#bing').addEventListener('click', () => chrome.tabs.create({ url: searchUrl('bing') }));
$('#watch').addEventListener('click', async () => {
  const { watches = [] } = await chrome.storage.local.get('watches');
  const next = isWatched(watches) ? watches.filter(item => item.url !== current.url) : [...watches, { ...current, createdAt: new Date().toISOString() }];
  await chrome.storage.local.set({ watches: next });
  updateWatch(isWatched(next));
  $('#watchStatus').textContent = isWatched(next) ? 'Saved locally. Live price alerts connect in the next release.' : 'Price watch removed.';
});
init();
