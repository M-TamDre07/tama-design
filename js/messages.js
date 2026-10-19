(function () {
  'use strict';
  var form = document.querySelector('[data-message-form]');
  if (!form) return;
  var status = document.getElementById('messageFormStatus');
  var submit = form.querySelector('button[type="submit"]');
  function say(message, isError) {
    if (!status) return;
    status.textContent = message;
    status.setAttribute('data-state', isError ? 'error' : 'success');
  }
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    var data = {};
    new FormData(form).forEach(function (value, key) { data[key] = String(value); });
    if (data._gotcha) {
      say('Pesan tidak dapat diproses.', true);
      return;
    }
    if (submit) {
      submit.disabled = true;
      submit.dataset.originalText = submit.textContent;
      submit.textContent = 'Mengirim laporan…';
    }
    say('Mengirim laporan…', false);
    try {
      var response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'same-origin'
      });
      var result = await response.json().catch(function () { return {}; });
      if (!response.ok || result.status !== 'ok') {
        throw new Error(result.message || 'Laporan belum dapat dikirim. Coba lagi beberapa saat.');
      }
      say(result.message || 'Laporan berhasil dikirim.', false);
      form.reset();
    } catch (error) {
      say(error.message || 'Koneksi bermasalah. Coba lagi beberapa saat.', true);
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = submit.dataset.originalText || 'Kirim laporan';
      }
    }
  });
})();
