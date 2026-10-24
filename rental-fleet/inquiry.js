import {createPayload, sendInquiry, acceptedMessage, pendingMessage, deliveryMode} from '../form-delivery.js';

const form = document.querySelector('#apply form');
const button = form.querySelector('button[type="submit"]');
const status = form.querySelector('.rental-form-feedback');
const mode = deliveryMode(location.href);
let attempted = false;

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (attempted || !form.reportValidity()) return;
  let data;
  try { data = createPayload(new FormData(form), 'rental', location.href); }
  catch (error) { status.hidden = false; status.textContent = error.message; return; }
  attempted = true;
  button.disabled = true;
  button.textContent = 'Sending...';
  form.setAttribute('aria-busy', 'true');
  status.hidden = false;
  status.textContent = 'Sending your inquiry...';
  try {
    const result = await sendInquiry(data);
    status.textContent = acceptedMessage(result);
    button.textContent = /activat|confirm your email/i.test(result.message) ? 'Contact Indem' : 'Inquiry submitted';
  } catch (error) {
    status.textContent = pendingMessage(error, data.get('Submission ID'), mode);
    button.textContent = 'Contact Indem to check delivery';
  } finally {
    form.setAttribute('aria-busy', 'false');
  }
});
button.disabled = false;
