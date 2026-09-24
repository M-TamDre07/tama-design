/* Tama Andrea Studio — order flow integration + Pesan UI/UX maintenance layer */
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
      legal.innerHTML='<strong>Keamanan & kepemilikan:</strong> data order disimpan ke Google Sheets untuk pemrosesan layanan. Untuk pencarian perangkat dan flash/restore, pemilik login sendiri dan wajib menunjukkan bukti kepemilikan yang wajar seperti nota pembelian, kotak/label perangkat, atau bukti akun milik sendiri. Bukti ini diperlukan untuk membantu mencegah pemrosesan perangkat yang bukan milik pelanggan. Jangan kirim password, OTP, recovery code, token, atau kode verifikasi.';
    }
  }

  function successNotice(){
    var modal=document.querySelector('#success');if(!modal)return;
    var panel=modal.querySelector('.success-panel');if(!panel||panel.querySelector('.order-system-note'))return;
    var note=document.createElement('p');note.className='order-system-note';note.textContent='Order tersimpan di Google Sheets. Backend akan meneruskan notifikasi order ke grup Telegram admin setelah integrasi Telegram diaktifkan.';panel.insertBefore(note,panel.querySelector('.actions'));
  }

  function summary(){
    var form=document.querySelector('#orderForm'),list=document.querySelector('#orderSummaryList'),empty=document.querySelector('#orderSummaryEmpty'),count=document.querySelector('#orderSummaryCount');
    if(!form||!list||!empty||!count)return;
    var selected=[].slice.call(form.querySelectorAll('input[name="Layanan Dipilih"]:checked'));
    count.textContent=selected.length+' dipilih';
    list.innerHTML='';
    if(!selected.length){empty.hidden=false;return}
    empty.hidden=true;
    selected.forEach(function(input){
      var li=document.createElement('li');
      var label=input.closest('label');
      var title=label&&label.querySelector('b')?label.querySelector('b').textContent.trim():input.value;
      li.textContent=title;
      list.appendChild(li);
    });
  }

  function progress(){
    var form=document.querySelector('#orderForm');if(!form)return;
    var steps=[].slice.call(document.querySelectorAll('.order-progress-step'));if(steps.length<3)return;
    var identity=['#name','#email','#whatsapp','#service'].every(function(s){var el=form.querySelector(s);return el&&String(el.value||'').trim()});
    var service=form.querySelector('#service');
    var hasService=!!(service&&String(service.value||'').trim());
    var hasSelection=!!form.querySelector('input[name="Layanan Dipilih"]:checked');
    var detail=['#visit','#desc','#captcha'].every(function(s){var el=form.querySelector(s);return el&&String(el.value||'').trim()});
    steps.forEach(function(step){step.classList.remove('active','done')});
    if(identity&&hasSelection&&detail){steps.forEach(function(s){s.classList.add('done')});return}
    if(!identity){steps[0].classList.add('active');return}
    if(!hasService||!hasSelection){steps[0].classList.add('done');steps[1].classList.add('active');return}
    steps[0].classList.add('done');steps[1].classList.add('done');steps[2].classList.add('active');
  }

  function orderUX(){
    var form=document.querySelector('#orderForm');if(!form)return;
    summary();progress();
    form.addEventListener('input',function(){summary();progress()});
    form.addEventListener('change',function(){summary();progress()});
    form.addEventListener('reset',function(){setTimeout(function(){summary();progress()},20)});
    var category=form.querySelector('#service');
    if(category)category.addEventListener('change',function(){
      var value=String(category.value||'');
      if(!value)return;
      setTimeout(function(){
        var section=value==='Desain & Kreatif'?form.querySelectorAll('.order-check-section')[0]:form.querySelectorAll('.order-check-section')[1];
        if(section&&window.matchMedia('(max-width: 980px)').matches)section.scrollIntoView({behavior:'smooth',block:'start'});
      },80);
    });
  }

  function observe(){
    removeLegacyComingSoon();ownershipNote();successNotice();orderUX();
    var root=document.querySelector('#success');if(root)new MutationObserver(successNotice).observe(root,{attributes:true,childList:true,subtree:true});
  }
  ready(observe);
})();
