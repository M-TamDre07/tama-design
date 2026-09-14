/* Tama Andrea Studio — order flow integration / frontend maintenance layer */
(function(){
  'use strict';
  function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true});else fn()}
  function removeLegacyComingSoon(){
    var form=document.querySelector('#orderForm');if(!form)return;
    form.querySelectorAll('input[name="Layanan Dipilih"]').forEach(function(input){
      if(/Android\s*-\s*Coming\s*Soon/i.test(input.value||'')){var label=input.closest('label');if(label)label.remove();}
    });
  }
  function ownershipNote(){
    var form=document.querySelector('#orderForm');if(!form)return;
    var legal=form.querySelector('.legal-note');
    if(legal&&!legal.dataset.maintained){
      legal.dataset.maintained='1';
      legal.innerHTML='<strong>Privasi & kepemilikan:</strong> data order disimpan ke Google Sheets untuk pemrosesan layanan. Untuk perangkat hilang/flash/restore, pemilik wajib menunjukkan bukti kepemilikan saat penyerahan. Jangan kirim password, OTP, recovery code, token, atau kode verifikasi.';
    }
  }
  function successNotice(){
    var modal=document.querySelector('#success');if(!modal)return;
    var panel=modal.querySelector('.success-panel');if(!panel||panel.querySelector('.order-system-note'))return;
    var note=document.createElement('p');note.className='order-system-note';note.textContent='Order tersimpan di Google Sheets. Backend akan meneruskan notifikasi order ke grup Telegram admin setelah integrasi Telegram diaktifkan.';panel.insertBefore(note,panel.querySelector('.actions'));
  }
  function observe(){
    removeLegacyComingSoon();ownershipNote();successNotice();
    var root=document.querySelector('#success');if(root)new MutationObserver(successNotice).observe(root,{attributes:true,childList:true,subtree:true});
  }
  ready(observe);
})();
