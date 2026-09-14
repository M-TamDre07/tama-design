/* Tama Andrea Studio — order flow integration / frontend maintenance layer */
(function(){
  'use strict';
  var ORDER_FORM='#orderForm';
  var CURRENT={
    'Paket OS Basic':'Paket OS Basic - Rp90.000',
    'Paket OS + Office':'Paket OS + Office - Rp125.000',
    'Paket OS + Backup':'Paket OS + Backup - Rp135.000',
    'Paket OS + Office + Backup':'Paket OS + Office + Backup - Rp160.000',
    'Diagnosis PC / Laptop - Rp35.000':'Diagnosis PC / laptop - Rp35.000',
    'Cek Kesehatan SSD/HDD - Rp35.000':'Cek kesehatan SSD/HDD - Rp35.000',
    'Backup Data Sebelum Instal Ulang':'Backup data sebelum instal ulang - mulai Rp40.000',
    'Driver & Update Dasar':'Driver & update dasar - mulai Rp25.000',
    'Cek Kompatibilitas Komponen & Rekomendasi Upgrade':'Cek kompatibilitas komponen & rekomendasi upgrade',
    'Pasang / Upgrade RAM':'Pasang / Upgrade RAM - Rp50.000',
    'Pasang SSD / HDD':'Pasang SSD / HDD - Rp50.000',
    'Pasang CPU':'Pasang CPU - Rp60.000',
    'Pasang GPU':'Pasang GPU - Rp60.000',
    'Pasang PSU':'Pasang PSU - Rp60.000',
    'Pasang / Upgrade 2 Komponen':'Pasang / Upgrade 2 Komponen - Rp90.000',
    'Instal Microsoft Office':'Instal Microsoft Office - Rp35000',
    'Restore / Flash iPhone':'Restore / Flash iPhone - mulai Rp60.000',
    'Bantuan Find Hub Android':'Bantuan Find Hub Android - mulai Rp35.000',
    'Bantuan Find My / Lacak iPhone':'Bantuan Find My / Lacak iPhone - mulai Rp35.000'
  };
  function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true});else fn()}
  function syncCatalog(){
    var form=document.querySelector(ORDER_FORM);if(!form)return;
    form.querySelectorAll('input[name="Layanan Dipilih"]').forEach(function(input){
      var original=input.value.trim();
      if(/Android\s*-\s*Coming\s*Soon/i.test(original)){var label=input.closest('label');if(label)label.remove();return;}
      if(CURRENT[original])input.value=CURRENT[original];
    });
    var labels=form.querySelectorAll('input[name="Layanan Dipilih"]');
    labels.forEach(function(input){
      var b=input.closest('label')?.querySelector('b');
      if(!b)return;
      if(/Flash Android/i.test(b.textContent||'')){input.value='Flash Android - mulai Rp80.000';b.textContent='Flash Android · mulai Rp80.000';}
      if(/Restore iPhone/i.test(b.textContent||'')){input.value='Restore / Flash iPhone - mulai Rp60.000';b.textContent='Restore iPhone · mulai Rp60.000';}
    });
    var legal=form.querySelector('.legal-note');
    if(legal&&!legal.dataset.maintained){
      legal.dataset.maintained='1';
      legal.innerHTML='<strong>Privasi & kepemilikan:</strong> data order disimpan ke Google Sheets untuk pemrosesan layanan. Untuk perangkat hilang/flash/restore, pemilik wajib menunjukkan bukti kepemilikan saat penyerahan. Jangan kirim password, OTP, recovery code, token, atau kode verifikasi.';
    }
  }
  function successNotice(){
    var modal=document.querySelector('#success');if(!modal)return;
    var panel=modal.querySelector('.success-panel');if(!panel||panel.querySelector('.order-system-note'))return;
    var note=document.createElement('p');note.className='order-system-note';note.textContent='Order tersimpan di sistem. Notifikasi admin akan diteruskan ke grup Telegram setelah backend Telegram diaktifkan.';panel.insertBefore(note,panel.querySelector('.actions'));
  }
  function observe(){
    syncCatalog();successNotice();
    var root=document.querySelector('#success');if(root)new MutationObserver(successNotice).observe(root,{attributes:true,childList:true,subtree:true});
  }
  ready(observe);
})();
