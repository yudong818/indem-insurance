/* Original Indem intake fields, destination and campaign metadata are retained. */
const PilotIntake = (() => {
  'use strict';
  const page = document.querySelector('.physical-ai-approved');
  if (!page) return;
  const recipient = String.fromCharCode(121,117,100,111,110,103,64,105,110,100,101,109,105,110,115,117,114,101,46,99,111,109);
  const endpoint = 'https://formsubmit.co/ajax/' + recipient;
  async function send(data, request = fetch, signal) {
    const response = await request(endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: data, signal });
    if (!response.ok) throw new Error('Submission failed');
    const result = await response.json();
    if (result.success !== true && result.success !== 'true') throw new Error('Submission not accepted');
    return result;
  }
  if (typeof document !== 'undefined') {
    const form = page.querySelector('#pilot-form');
    const success = page.querySelector('.pilotSuccess');
    if (form && success) {
      const button = form.querySelector('.submitButton');
      const error = form.querySelector('.formError');
      const label = button.innerHTML;
      let sending = false;
      const system = form.elements.namedItem('Physical AI system');
      const dataCenterFields = form.querySelector('.dataCenterFields');
      function syncProjectFields() {
        const isDataCenter = system.value === 'Data center / AI infrastructure';
        dataCenterFields.hidden = !isDataCenter;
        dataCenterFields.disabled = !isDataCenter;
      }
      system.addEventListener('change', syncProjectFields);
      form.addEventListener('reset', () => queueMicrotask(syncProjectFields));
      page.querySelectorAll('[data-pilot-system]').forEach(link => {
        link.addEventListener('click', () => {
          if (sending) return;
          form.hidden = false;
          success.hidden = true;
          system.value = link.dataset.pilotSystem;
          syncProjectFields();
        });
      });
      syncProjectFields();
      form.addEventListener('submit', async event => {
        event.preventDefault();
        if (sending || !form.reportValidity()) return;
        const data = new FormData(form);
        if (data.get('_honey')) return;
        data.set('Campaign', 'Indem Physical AI + AI infrastructure design-partner pilot');
        if (system.value === 'Data center / AI infrastructure') {
          data.set('_subject', 'New Indem data center pilot inquiry');
        }
        data.set('Source URL', window.location.href);
        data.set('Referrer', document.referrer || 'Direct');
        const params = new URLSearchParams(window.location.search);
        for (const key of ['utm_source','utm_medium','utm_campaign','utm_content']) if (params.get(key)) data.set(key, params.get(key));
        sending = true; button.disabled = true; button.textContent = 'Sending...';
        form.setAttribute('aria-busy', 'true'); error.hidden = true;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        try {
          await send(data, fetch, controller.signal);
          form.reset(); form.hidden = true; success.hidden = false; success.focus({ preventScroll: true });
        } catch {
          error.hidden = false;
        } finally {
          clearTimeout(timeout); sending = false; button.disabled = false;
          button.innerHTML = label; form.removeAttribute('aria-busy');
        }
      });
      success.querySelector('.sendAnother').addEventListener('click', () => {
        success.hidden = true; form.hidden = false;
        form.querySelector('input[name="Full name"]').focus({ preventScroll: true });
      });
    }
  }
  return { send, endpoint };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = PilotIntake;
