import {createPayload, sendInquiry, acceptedMessage, pendingMessage, deliveryMode} from '../form-delivery.js?v=20261024-private';

const form = document.querySelector('#consult-form');
const submit = document.querySelector('#send-inquiry');
const status = document.querySelector('#delivery-status');
const done = document.querySelector('#complete');
const mode = deliveryMode(location.href);
const initialArea = new URLSearchParams(location.search).get('area');
const fields = [
  ['name', 'Name'], ['email', 'email'], ['company', 'Company'], ['phone', 'Phone'],
  ['area', 'System'], ['states', 'Locations'], ['timing', 'Timing'],
  ['referral', 'How did you hear about us?'], ['use', 'Intended use and help needed']
];
let attempted = false;

function restoreArea() {
  if ([...form.elements.area.options].some(option => option.value === initialArea)) {
    form.elements.area.value = initialArea;
  }
}
function inquiryEntries() {
  return fields.map(([name, label]) => {
    const field = form.elements[name];
    const value = field.tagName === 'SELECT'
      ? (field.value ? field.selectedOptions[0].textContent : '')
      : field.value.trim();
    return [label, value];
  });
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (attempted) return;
  for (const field of form.querySelectorAll('input[required]:not([type="checkbox"]), textarea[required]')) {
    field.value = field.value.trim();
  }
  if (!form.reportValidity()) return;
  const entries = inquiryEntries();
  entries.push(['Contact consent', form.elements.consent.checked ? 'Yes' : 'No']);
  entries.push(['_honey', form.elements._honey.value]);
  let data;
  try { data = createPayload(entries, 'consultation', location.href); }
  catch (error) { status.hidden = false; status.textContent = error.message; return; }
  attempted = true;
  submit.disabled = true;
  form.setAttribute('aria-busy', 'true');
  status.hidden = false;
  status.textContent = 'Sending your inquiry...';
  submit.textContent = 'Sending...';
  try {
    const result = await sendInquiry(data);
    form.hidden = true;
    document.querySelector('#delivery-result').textContent = acceptedMessage(result);
    done.hidden = false;
    done.focus();
  } catch (error) {
    status.textContent = pendingMessage(error, data.get('Submission ID'), mode);
    submit.textContent = 'Check delivery before retrying';
  } finally {
    form.setAttribute('aria-busy', 'false');
  }
});
document.querySelector('#restart').addEventListener('click', () => {
  done.hidden = true;
  form.hidden = false;
  form.reset();
  restoreArea();
  attempted = false;
  submit.disabled = false;
  submit.textContent = 'Send inquiry';
  status.hidden = true;
  status.textContent = '';
  form.elements.name.focus();
});
restoreArea();
submit.disabled = false;

