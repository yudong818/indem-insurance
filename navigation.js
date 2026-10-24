// Preserve historic rental acquisition links when the company homepage changes.
const legacyRentalHashes = new Set(['#apply', '#quote', '#rental-quote', '#perspective', '#approach', '#workflow', '#data-advantage', '#fleet-records', '#account-continuity', '#coverage', '#market', '#fit']);
function routeLegacyRental() {
  const home = ['/', '/index.html'].includes(location.pathname);
  if (home && location.hash === '#people') {
    location.replace('/' + location.search + '#contact');
    return;
  }
  if (!home || !legacyRentalHashes.has(location.hash)) return;
  const hash = ['#quote', '#rental-quote'].includes(location.hash) ? '#apply' : location.hash;
  location.replace('/rental-fleet/' + location.search + hash);
}
routeLegacyRental();
window.addEventListener('hashchange', routeLegacyRental);
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
