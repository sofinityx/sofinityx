(() => {
  const form = document.querySelector('form[name="project-inquiry"]');
  if (!form) return;
  const status = form.querySelector('.inquiry-status');
  const submit = form.querySelector('[type="submit"]');
  // Keep native validation as a fallback when JavaScript is unavailable.
  form.noValidate = true;
  const fields = [...form.querySelectorAll('.inquiry-fields input, .inquiry-fields textarea')];
  const errors = new Map();
  fields.forEach((field) => {
    const error = document.createElement('span');
    error.id = `${field.id}-error`;
    error.className = 'inquiry-field-error';
    error.hidden = true;
    field.after(error);
    field.setAttribute('aria-describedby', error.id);
    errors.set(field, error);
    field.addEventListener('input', () => {
      if (field.hasAttribute('aria-invalid')) validate(field);
      if (status.dataset.state === 'validation' && !fields.some((item) => item.hasAttribute('aria-invalid'))) {
        status.textContent = '';
      }
    });
    field.addEventListener('blur', () => {
      if (field.value || field.hasAttribute('aria-invalid')) validate(field);
    });
  });
  function validate(field) {
    let message = '';
    if (field.required && !field.value.trim()) {
      message = { name: 'Please tell me your name.', email: 'Add your email so I can reply.', project: 'Share a little about your project.' }[field.name];
    } else if (field.validity.typeMismatch) {
      message = 'Use a complete email address, like you@example.com.';
    } else if (!field.validity.valid) {
      message = 'Please check this field before sending.';
    }
    const error = errors.get(field);
    error.textContent = message || '';
    error.hidden = !message;
    if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
    return !message;
  }
  let sending = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending) return;
    const invalid = fields.filter((field) => !validate(field));
    if (invalid.length) {
      status.dataset.state = 'validation';
      status.textContent = 'Almost there—check the highlighted fields above.';
      invalid[0].focus();
      return;
    }
    status.dataset.state = 'error';
    if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) || location.protocol === 'file:') {
      status.textContent = 'Preview only: inquiries can be sent once this form is deployed to Netlify. Nothing has been sent.';
      return;
    }
    sending = true;
    submit.disabled = true;
    form.setAttribute('aria-busy', 'true');
    status.dataset.state = 'pending';
    status.textContent = 'Sending your inquiry…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString(),
        signal: controller.signal
      });
      if (!response.ok) throw new Error('Submission failed');
      form.reset();
      status.dataset.state = 'success';
      status.textContent = 'Thank you—your inquiry has been sent. I’ll reply by email to discuss the next step.';
    } catch (error) {
      status.dataset.state = 'error';
      status.textContent = 'I couldn’t confirm your inquiry was sent. Your details are still here. Please try again or email SofinityX@gmail.com.';
    } finally {
      clearTimeout(timeout);
      sending = false;
      submit.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });
})();
