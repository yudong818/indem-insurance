// Keep acquisition links from older emails working after the redesign.
const legacyRentalHashes = new Set(['#apply', '#quote', '#rental-quote', '#perspective', '#approach', '#workflow', '#data-advantage', '#fleet-records', '#account-continuity', '#coverage', '#market', '#fit']);
function routeLegacyHash() {
  if (['/physical-ai/', '/physical-ai/index.html'].includes(location.pathname) && ['#pilot', '#contacts'].includes(location.hash)) {
    const query = new URLSearchParams(location.search);
    if (!query.has('area')) query.set('area', 'robotics');
    location.replace('/consult/?' + query);
    return;
  }
  if (!['/', '/index.html'].includes(location.pathname)) return;
  if (location.hash === '#people') {
    location.replace('/' + location.search + '#contact');
  } else if (location.hash === '#product') {
    location.replace('/risk-passport/' + location.search);
  } else if (legacyRentalHashes.has(location.hash)) {
    const hash = ['#quote', '#rental-quote'].includes(location.hash) ? '#apply' : location.hash;
    location.replace('/rental-fleet/' + location.search + hash);
  }
}
routeLegacyHash();
window.addEventListener('hashchange', routeLegacyHash);
const campaignKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'];
exportToLinks();
function exportToLinks() {
  const source = new URLSearchParams(location.search);
  document.querySelectorAll('a[href]').forEach(link => {
    const target = new URL(link.href, location.href);
    if (target.origin !== location.origin || !['/consult/', '/rental-fleet/', '/medical-robotics/', '/physical-ai/'].includes(target.pathname)) return;
    campaignKeys.forEach(key => { if (source.has(key) && !target.searchParams.has(key)) target.searchParams.set(key, source.get(key).slice(0,200)); });
    link.href = target.pathname + target.search + target.hash;
  });
}
