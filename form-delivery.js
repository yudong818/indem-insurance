// Provider-issued public form alias; the receiving mailbox stays server-side.
export const ENDPOINT = 'https://formsubmit.co/ajax/eb72c0395cf3ebe18bb2f8a3e9ce7c81';
export const KINDS = {
  consultation: 'Physical AI consultation',
  rental: 'Rental fleet inquiry'
};

export function deliveryMode(source) {
  const url = new URL(source);
  if (['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) return 'test';
  if (url.protocol === 'https:' && ['indeminsure.com', 'www.indeminsure.com'].includes(url.hostname) && !url.port) return 'production';
  throw new Error('This form is not enabled on this website. Call (607) 229-9686.');
}

export function createPayload(entries, kind, source, id = crypto.randomUUID()) {
  if (!KINDS[kind]) throw new Error('Unknown inquiry type');
  const url = new URL(source);
  const mode = deliveryMode(source);
  const data = new FormData();
  for (const [key, value] of entries) {
    if (key === '_honey' && value) throw new Error('Submission blocked.');
    // Provider controls cannot be supplied by form fields or URL parameters.
    if (key.startsWith('_')) continue;
    if (typeof value !== 'string') throw new Error('File uploads are not supported.');
    if (key.length > 100 || value.length > 3000) throw new Error('Please shorten your response. Do not include confidential records.');
    if (value.trim()) data.set(key, value.trim());
  }
  if (!data.get('email') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.get('email'))) {
    throw new Error('Enter a valid email address.');
  }
  if (data.get('Contact consent') !== 'Yes') throw new Error('Please confirm that Indem may contact you about this inquiry.');
  data.set('_subject', `${mode === 'test' ? '[INDEM TEST]' : '[Indem inquiry]'} ${KINDS[kind]} | ${id}`);
  data.set('_template', 'table');
  data.set('_url', url.origin + url.pathname);
  data.set('_honey', '');
  data.delete('Test notice');
  if (mode === 'test') data.set('Test notice', 'INTERNAL DELIVERY TEST. Not a customer lead or insurance application.');
  data.set('Environment', mode);
  data.set('Submission ID', id);
  data.set('Form', KINDS[kind]);
  data.set('Source URL', url.origin + url.pathname + url.hash);
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    if (url.searchParams.get(key)) data.set(key, url.searchParams.get(key).slice(0, 200));
  }
  return data;
}

export async function sendInquiry(data, request = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await request(ENDPOINT, {
      method: 'POST', headers: {Accept: 'application/json'}, body: data,
      signal: controller.signal, credentials: 'omit', redirect: 'error'
    });
    if (!response.ok) throw new Error('Delivery service returned HTTP ' + response.status);
    const result = await response.json();
    if (result.success !== true && result.success !== 'true') {
      throw new Error(result.message || 'Delivery service did not accept the submission');
    }
    return {id: data.get('Submission ID'), mode: data.get('Environment'), message: String(result.message || '')};
  } finally {
    clearTimeout(timeout);
  }
}

export function acceptedMessage(result) {
  if (/activat|confirm your email/i.test(result.message)) {
    if (result.mode === 'production') return `Your inquiry is not yet confirmed. Please call (607) 229-9686 and mention reference ${result.id}.`;
    return `Email activation is required. Check the receiving inbox before submitting again. Reference: ${result.id}`;
  }
  if (result.mode === 'production') return `Your inquiry has been submitted for delivery to Indem. Our team will review it and contact you. Reference: ${result.id}`;
  return `Accepted by the email delivery service. Confirm receipt in the inbox. Reference: ${result.id}`;
}

export function pendingMessage(error, id, mode = 'test') {
  if (mode === 'production') return `We could not confirm delivery. To avoid a duplicate, please call (607) 229-9686 with reference ${id} before resubmitting.`;
  if (/activat|confirm your email/i.test(error?.message || '')) {
    return `Email activation is required. Check the receiving inbox for the activation message, then check whether this submission was released before trying again. Reference: ${id}`;
  }
  return `Delivery is not confirmed. Check the inbox and spam before retrying to avoid duplicates. Reference: ${id}`;
}
