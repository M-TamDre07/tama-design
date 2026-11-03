(function(){
'use strict';
var client=null, challengeId='', currentOrders=[], currentCustomers=[], currentSchedule=[], currentAudit=[], currentMessages=[], currentNotifications=[], currentErrorLogs=[], currentStudioServices=[], currentStudioReviews=[];
var $=function(selector){return document.querySelector(selector);};
function escapeHtml(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function showStatus(element,message,type){element.textContent=message||'';element.className='status'+(type?' '+type:'');}
function showAuth(message,type){showStatus($('#authStatus'),message,type);}
function fmtDate(value){if(!value)return '—';var d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleString('id-ID',{dateStyle:'medium',timeStyle:value.indexOf('T')>=0?'short':undefined});}
function apiAdmin(action,body){
 return client.auth.getSession().then(function(result){
  var token=result.data&&result.data.session&&result.data.session.access_token;
  if(!token)throw new Error('Sesi admin berakhir. Silakan masuk kembali.');
  var options={method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'}};
  var url='/api/admin';
  if(body){options.headers['Content-Type']='application/json';options.body=JSON.stringify(body);}
  else url+='?action='+encodeURIComponent(action);
  return fetch(url,options).then(function(r){return r.json().then(function(data){if(!r.ok||data.status==='error')throw new Error(data.message||'Permintaan admin gagal.');return data;});});
 });
}
function adminToken(){return client.auth.getSession().then(function(r){var s=r.data&&r.data.session;return s?s.access_token:'';});}
function renderOrders(){
 var query=$('#orderFilter').value.toLowerCase().trim();
 var rows=currentOrders.filter(function(o){return [o.order_code,o.customer_name,o.customer_email,o.service,o.category].join(' ').toLowerCase().indexOf(query)>=0;});
 $('#ordersBody').innerHTML=rows.map(function(o){
  var status=['Baru','Dikonfirmasi','Sedang Dikerjakan','Menunggu Pembayaran','Selesai','Dibatalkan'].map(function(s){return '<option'+(o.status===s?' selected':'')+'>'+s+'</option>';}).join('');
  var payment=['Belum Dibayar','Menunggu Pembayaran','Dibayar','Refund'].map(function(s){return '<option'+((o.payment_status||'Belum Dibayar')===s?' selected':'')+'>'+s+'</option>';}).join('');
  return '<tr data-order="'+escapeHtml(o.order_code)+'"><td><strong>'+escapeHtml(o.order_code)+'</strong><small>'+escapeHtml(fmtDate(o.created_at))+'</small><small>'+escapeHtml(o.category||'')+' · '+escapeHtml(o.service||'')+'</small></td><td>'+escapeHtml(o.customer_name)+'<small>'+escapeHtml(o.customer_email)+' · '+escapeHtml(o.customer_whatsapp)+'</small></td><td><select class="order-status" aria-label="Status">'+status+'</select></td><td><select class="order-payment" aria-label="Pembayaran">'+payment+'</select></td><td><input class="order-amount" type="number" min="0" max="1000000000" step="1000" aria-label="Estimasi" value="'+(o.estimated_amount==null?'':escapeHtml(o.estimated_amount))+'"></td><td><div class="row-actions"><button class="btn primary save-order">Simpan</button><button class="btn archive-order">Arsip</button></div><small class="save-status"></small></td></tr>';
 }).join('')||'<tr><td colspan="6">Belum ada pesanan yang cocok.</td></tr>';
}
function renderCustomers(){
 $('#customersBody').innerHTML=currentCustomers.map(function(c){return '<tr><td>'+escapeHtml(c.customer_code||'—')+'</td><td>'+escapeHtml(c.name)+'</td><td>'+escapeHtml(c.email_normalized)+'</td><td>'+escapeHtml(c.whatsapp||'—')+'</td><td>'+escapeHtml(c.order_count||0)+'</td><td>'+escapeHtml(fmtDate(c.last_order_at))+'</td></tr>';}).join('')||'<tr><td colspan="6">Belum ada data pelanggan.</td></tr>';
}
function renderSchedule(){
 $('#scheduleBody').innerHTML=currentSchedule.map(function(s){return '<tr><td>'+escapeHtml(s.service_date)+'</td><td>'+escapeHtml(s.status==='open'?'Buka':'Tutup')+'</td><td>'+escapeHtml([s.start_time,s.end_time].filter(Boolean).map(function(t){return String(t).slice(0,5);}).join('–')||'—')+'</td><td>'+escapeHtml(s.note||'—')+'</td><td>'+escapeHtml(fmtDate(s.updated_at))+'</td></tr>';}).join('')||'<tr><td colspan="5">Belum ada pengecualian jadwal.</td></tr>';
}
function renderAudit(){
 $('#auditBody').innerHTML=currentAudit.map(function(a){return '<tr><td>'+escapeHtml(fmtDate(a.created_at))+'</td><td>'+escapeHtml(a.actor_email||'—')+'</td><td>'+escapeHtml(a.action)+'</td><td>'+escapeHtml(JSON.stringify(a.details||{}))+'</td></tr>';}).join('')||'<tr><td colspan="4">Belum ada aktivitas.</td></tr>';
}
function renderStudioServices(){
 $('#studioServicesBody').innerHTML=currentStudioServices.map(function(item){
  return '<tr data-studio-service="'+escapeHtml(item.id)+'"><td><strong>'+escapeHtml(item.name)+'</strong><small>/'+escapeHtml(item.slug)+'</small><small>'+escapeHtml(item.description||'')+'</small></td><td>'+escapeHtml(item.category||'Desain Grafis')+'</td><td>'+escapeHtml(item.price_label||'Konsultasi')+'</td><td>'+((item.active)?'Aktif':'Disembunyikan')+'</td><td><div class="row-actions"><button class="btn primary edit-studio-service">Edit</button><button class="btn toggle-studio-service">'+(item.active?'Arsip':'Aktifkan')+'</button></div></td></tr>';
 }).join('')||'<tr><td colspan="5">Belum ada layanan.</td></tr>';
}
function renderStudioReviews(){
 $('#studioReviewsBody').innerHTML=currentStudioReviews.map(function(item){
  var actions=item.status==='pending'?'<button class="btn primary publish-studio-review">Terbitkan</button><button class="btn reject-studio-review">Tolak</button>':item.status==='published'?'<button class="btn reject-studio-review">Tarik</button>':'<button class="btn primary publish-studio-review">Terbitkan</button>';
  return '<tr data-studio-review="'+escapeHtml(item.id)+'"><td>'+escapeHtml(fmtDate(item.created_at))+'</td><td><strong>'+escapeHtml(item.customer_name)+'</strong><small>'+escapeHtml(item.customer_role||'')+'</small></td><td>'+escapeHtml(item.rating)+'/5</td><td><div class="message-cell">'+escapeHtml(item.review_text)+'</div></td><td>'+escapeHtml(item.status)+'</td><td><div class="row-actions">'+actions+'</div></td></tr>';
 }).join('')||'<tr><td colspan="6">Belum ada ulasan.</td></tr>';
}
function resetStudioServiceForm(){
 var form=$('#studioServiceForm');form.reset();$('#studioServiceId').value='';$('#studioServiceCategory').value='Desain Grafis';$('#studioServiceSort').value='100';form.classList.add('hidden');
}
function fillStudioServiceForm(item){
 $('#studioServiceId').value=item.id||'';$('#studioServiceName').value=item.name||'';$('#studioServiceSlug').value=item.slug||'';
 $('#studioServiceCategory').value=item.category||'Desain Grafis';$('#studioServiceDescription').value=item.description||'';
 $('#studioServicePriceMin').value=item.price_min==null?'':item.price_min;$('#studioServicePriceMax').value=item.price_max==null?'':item.price_max;
 $('#studioServicePriceLabel').value=item.price_label||'';$('#studioServiceSort').value=item.sort_order||100;
 $('#studioServiceActive').checked=item.active!==false;$('#studioServiceFeatured').checked=item.featured===true;
 $('#studioServiceForm').classList.remove('hidden');
}
function renderWebsiteMessages(){
 $('#websiteMessagesBody').innerHTML=currentMessages.map(function(m){
  var current=String(m.status||'Baru');
  var options=['Baru','Diproses','Selesai'].map(function(s){return '<option value="'+s+'"'+(current===s?' selected':'')+'>'+s+'</option>';}).join('');
  return '<tr data-message="'+escapeHtml(m.id)+'"><td>'+escapeHtml(fmtDate(m.created_at))+'</td><td><strong>'+escapeHtml(m.sender_name)+'</strong><small>'+escapeHtml(m.sender_email)+'</small></td><td>'+escapeHtml(m.message_type)+'<small>Prioritas: '+escapeHtml(m.priority||'Normal')+'</small></td><td><div class="message-cell">'+escapeHtml(m.message)+'</div><small>'+escapeHtml(m.page_url||'')+'</small></td><td>'+escapeHtml(m.telegram_status||'not_configured')+'<small>'+escapeHtml(fmtDate(m.telegram_sent_at))+'</small></td><td>'+escapeHtml(m.formspree_status||'not_configured')+'<small>'+escapeHtml(fmtDate(m.formspree_sent_at))+'</small></td><td><select class="message-status" aria-label="Status penanganan">'+options+'</select></td><td><button class="btn primary save-message">Simpan</button><small class="message-save-status"></small></td></tr>';
 }).join('')||'<tr><td colspan="8">Belum ada laporan website.</td></tr>';
}
function renderNotifications(){
  $('#notificationsBody').innerHTML=currentNotifications.map(function(n){
   var retryable=n.event==='order_created'&&n.channel==='telegram'&&n.status!=='sent';
   var action=retryable?'<button class="btn table-action retry-notification">Kirim ulang</button><small class="retry-status"></small>':'—';
   return '<tr data-notification="'+escapeHtml(n.id)+'"><td>'+escapeHtml(fmtDate(n.created_at))+'</td><td>'+escapeHtml(n.event||'—')+'</td><td>'+escapeHtml(n.channel||'—')+'</td><td>'+escapeHtml(n.status||'—')+'</td><td>'+escapeHtml(fmtDate(n.sent_at))+'</td><td><div class="message-cell">'+escapeHtml(n.message||'')+'</div></td><td>'+action+'</td></tr>';
  }).join('')||'<tr><td colspan="7">Belum ada riwayat notifikasi.</td></tr>';
}
function renderErrors(){
  $('#errorLogsBody').innerHTML=currentErrorLogs.map(function(item){return '<tr><td>'+escapeHtml(fmtDate(item.created_at))+'</td><td>'+escapeHtml(item.handler||'—')+'</td><td>'+escapeHtml(item.error_code||'—')+'</td><td><div class="message-cell">'+escapeHtml(item.message||'')+'</div></td><td><div class="message-cell">'+escapeHtml(item.request_id||'—')+'</div></td></tr>';}).join('')||'<tr><td colspan="5">Belum ada error server yang tercatat.</td></tr>';
}
function loadDashboard(){
 showStatus($('#dashboardStatus'),'Memuat data operasional…');
 return apiAdmin('dashboard').then(function(d){
  currentOrders=d.orders||[];currentCustomers=d.customers||[];currentSchedule=d.serviceAvailability||[];currentAudit=d.auditLog||[];currentMessages=d.websiteMessages||[];currentNotifications=d.notifications||[];currentErrorLogs=d.errorLogs||[];currentStudioServices=d.studioServices||[];currentStudioReviews=d.studioReviews||[];
  $('#accountText').textContent='Masuk sebagai '+(d.account&&d.account.email||'admin')+'. Sesi dilindungi Supabase Auth + TOTP.';
  $('#orderCount').textContent=currentOrders.length;
  $('#completedCount').textContent=currentOrders.filter(function(o){return o.status==='Selesai';}).length;
  $('#customerCount').textContent=currentCustomers.length;
  $('#messageCount').textContent=currentMessages.length;
  $('#pendingNotificationCount').textContent=currentNotifications.filter(function(n){return n.status!=='sent';}).length;
  $('#errorCount').textContent=currentErrorLogs.length;
  var system=d.systemStatus||{};
  $('#systemStatus').textContent='Database: '+(system.database==='connected'?'terhubung':'belum terverifikasi')+' · Telegram: '+(system.telegramConfigured?'variabel tersedia':'belum dikonfigurasi')+' · Error server terbaru: '+currentErrorLogs.length+'.';
  renderOrders();renderCustomers();renderSchedule();renderAudit();renderWebsiteMessages();renderNotifications();renderErrors();renderStudioServices();renderStudioReviews();
  showStatus($('#dashboardStatus'),'Data berhasil dimuat. '+new Date().toLocaleTimeString('id-ID'), 'ok');
 });
}
function showDashboard(){ $('#authView').classList.add('hidden');$('#dashboardView').classList.remove('hidden');loadDashboard().catch(function(err){showStatus($('#dashboardStatus'),err.message,'error');});}
function adminOtpRequest(action,payload){
 return client.auth.getSession().then(function(r){
  var token=r.data&&r.data.session&&r.data.session.access_token;
  if(!token)throw new Error('Sesi login berakhir. Silakan masuk kembali.');
  return fetch('/api/admin-otp',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(Object.assign({action:action},payload||{}))})
   .then(function(response){return response.json().then(function(data){if(!response.ok||data.status==='error')throw new Error(data.message||'Verifikasi Telegram gagal.');return data;});});
 });
}
function requestTelegramOtp(){
 $('#mfaPanel').classList.remove('hidden');
 $('#mfaQr').classList.add('hidden');$('#mfaSecret').classList.add('hidden');
 $('#mfaCode').value='';$('#mfaCode').setAttribute('inputmode','numeric');$('#mfaCode').setAttribute('maxlength','6');
 $('#mfaTitle').textContent='Verifikasi melalui Telegram';
 $('#mfaText').textContent='Kode enam digit telah diminta ke grup Telegram privat admin. Kode berlaku selama lima menit.';
 showAuth('Mengirim kode verifikasi ke grup Telegram…');
 return adminOtpRequest('request').then(function(result){
  challengeId=result.challengeId;
  showAuth(result.message||'Kode OTP dikirim. Periksa grup Telegram admin.','ok');
 }).catch(function(err){showAuth(err.message||'Tidak dapat mengirim OTP Telegram.','error');throw err;});
}
$('#loginForm').addEventListener('submit',function(e){
 e.preventDefault();if(!client){showAuth('Konfigurasi Supabase belum siap.','error');return;}
 var button=$('#loginBtn');button.disabled=true;showAuth('Memeriksa akun admin…');
 client.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value}).then(function(r){
  if(r.error)throw r.error;
  return requestTelegramOtp();
 }).catch(function(err){showAuth(err.message||'Login gagal.','error');}).finally(function(){button.disabled=false;});
});
$('#verifyMfaBtn').addEventListener('click',function(){
 var code=$('#mfaCode').value.replace(/\s+/g,'');
 if(!/^\d{6}$/.test(code)||!challengeId){showAuth('Masukkan kode OTP enam digit dari grup Telegram.','error');return;}
 var button=$('#verifyMfaBtn');button.disabled=true;showAuth('Memverifikasi kode Telegram…');
 adminOtpRequest('verify',{challengeId:challengeId,code:code}).then(function(result){
  $('#mfaPanel').classList.add('hidden');challengeId='';showAuth(result.message||'Verifikasi berhasil.','ok');showDashboard();
 }).catch(function(err){showAuth(err.message||'Kode OTP tidak diterima.','error');}).finally(function(){button.disabled=false;});
});
$('#newStudioServiceBtn').addEventListener('click',function(){resetStudioServiceForm();$('#studioServiceForm').classList.remove('hidden');});
$('#cancelStudioServiceBtn').addEventListener('click',resetStudioServiceForm);
$('#studioServiceName').addEventListener('input',function(){if(!$('#studioServiceId').value)$('#studioServiceSlug').value=this.value.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');});
$('#studioServiceForm').addEventListener('submit',function(e){
 e.preventDefault();var button=e.submitter||e.target.querySelector('button[type="submit"]');button.disabled=true;
 apiAdmin('',{action:'saveStudioService',id:$('#studioServiceId').value||undefined,name:$('#studioServiceName').value,slug:$('#studioServiceSlug').value,category:$('#studioServiceCategory').value,description:$('#studioServiceDescription').value,priceMin:$('#studioServicePriceMin').value,priceMax:$('#studioServicePriceMax').value,priceLabel:$('#studioServicePriceLabel').value,sortOrder:Number($('#studioServiceSort').value),active:$('#studioServiceActive').checked,featured:$('#studioServiceFeatured').checked})
 .then(function(){showStatus($('#dashboardStatus'),'Layanan berhasil disimpan.','ok');resetStudioServiceForm();return loadDashboard();})
 .catch(function(err){showStatus($('#dashboardStatus'),err.message,'error');}).finally(function(){button.disabled=false;});
});
$('#studioServicesBody').addEventListener('click',function(e){
 var row=e.target.closest('tr[data-studio-service]');if(!row)return;var item=currentStudioServices.find(function(x){return x.id===row.dataset.studioService;});if(!item)return;
 if(e.target.closest('.edit-studio-service'))fillStudioServiceForm(item);
 if(e.target.closest('.toggle-studio-service'))apiAdmin('',{action:'setStudioServiceActive',id:item.id,active:!item.active}).then(loadDashboard).catch(function(err){showStatus($('#dashboardStatus'),err.message,'error');});
});
$('#studioReviewsBody').addEventListener('click',function(e){
 var row=e.target.closest('tr[data-studio-review]');if(!row)return;var id=row.dataset.studioReview;
 var status=e.target.closest('.publish-studio-review')?'published':e.target.closest('.reject-studio-review')?'rejected':'';
 if(!status)return;
 apiAdmin('',{action:'moderateStudioReview',id:id,status:status}).then(loadDashboard).catch(function(err){showStatus($('#dashboardStatus'),err.message,'error');});
});
$('#refreshReviewsBtn').addEventListener('click',function(){loadDashboard().catch(function(err){showStatus($('#dashboardStatus'),err.message,'error');});});
$('#ordersBody').addEventListener('click',function(e){
 var row=e.target.closest('tr[data-order]');if(!row)return;var orderCode=row.dataset.order;
 if(e.target.closest('.save-order')){
  var btn=e.target.closest('.save-order'),status=row.querySelector('.save-status');btn.disabled=true;status.textContent='Menyimpan…';
  apiAdmin('',{action:'updateOrder',orderCode:orderCode,data:{status:row.querySelector('.order-status').value,paymentStatus:row.querySelector('.order-payment').value,estimatedAmount:row.querySelector('.order-amount').value}}).then(function(){status.textContent='Tersimpan';return loadDashboard();}).catch(function(err){status.textContent=err.message;}).finally(function(){btn.disabled=false;});
 }
 if(e.target.closest('.archive-order')){
  if(!window.confirm('Arsipkan '+orderCode+'? Data tidak dihapus permanen.'))return;
  apiAdmin('',{action:'archiveOrder',orderCode:orderCode}).then(loadDashboard).catch(function(err){showStatus($('#dashboardStatus'),err.message,'error');});
 }
});
$('#websiteMessagesBody').addEventListener('click',function(e){
 var button=e.target.closest('.save-message');if(!button)return;
 var row=button.closest('tr[data-message]');if(!row)return;
 var status=row.querySelector('.message-save-status');button.disabled=true;status.textContent='Menyimpan…';
 apiAdmin('',{action:'updateWebsiteMessage',messageId:row.dataset.message,status:row.querySelector('.message-status').value}).then(function(){showStatus($('#dashboardStatus'),'Status laporan website diperbarui.','ok');return loadDashboard();}).catch(function(err){status.textContent=err.message;}).finally(function(){button.disabled=false;});
});
$('#refreshMessagesBtn').addEventListener('click',function(){loadDashboard().catch(function(err){showStatus($('#dashboardStatus'),err.message,'error');});});
$('#refreshNotificationsBtn').addEventListener('click',function(){loadDashboard().catch(function(err){showStatus($('#dashboardStatus'),err.message,'error');});});
$('#refreshErrorsBtn').addEventListener('click',function(){loadDashboard().catch(function(err){showStatus($('#dashboardStatus'),err.message,'error');});});
$('#testTelegramBtn').addEventListener('click',function(){
 var btn=$('#testTelegramBtn');btn.disabled=true;showStatus($('#dashboardStatus'),'Mengirim pesan tes Telegram…');
 apiAdmin('',{action:'testTelegram'}).then(function(result){return loadDashboard().then(function(){showStatus($('#dashboardStatus'),result.message,result.deliveryStatus==='sent'?'ok':'error');});}).catch(function(err){showStatus($('#dashboardStatus'),err.message,'error');}).finally(function(){btn.disabled=false;});
});
$('#notificationsBody').addEventListener('click',function(e){
 var btn=e.target.closest('.retry-notification');if(!btn)return;
 var row=btn.closest('tr[data-notification]');if(!row)return;
 var status=row.querySelector('.retry-status');btn.disabled=true;status.textContent='Mengirim…';
 apiAdmin('',{action:'retryNotification',notificationId:row.dataset.notification}).then(function(result){return loadDashboard().then(function(){showStatus($('#dashboardStatus'),result.message,result.deliveryStatus==='sent'?'ok':'error');});}).catch(function(err){status.textContent=err.message;}).finally(function(){btn.disabled=false;});
});
$('#orderFilter').addEventListener('input',renderOrders);
$('#refreshBtn').addEventListener('click',function(){loadDashboard().catch(function(err){showStatus($('#dashboardStatus'),err.message,'error');});});
document.querySelectorAll('[data-tab]').forEach(function(btn){btn.addEventListener('click',function(){
 document.querySelectorAll('[data-tab]').forEach(function(b){b.classList.toggle('active',b===btn);});
 ['orders','customers','schedule','messages','notifications','errors','audit'].forEach(function(name){$('#tab-'+name).classList.toggle('hidden',name!==btn.dataset.tab);});
});});
$('#toggleCustomerForm').addEventListener('click',function(){$('#customerForm').classList.toggle('hidden');});
$('#customerForm').addEventListener('submit',function(e){
 e.preventDefault();apiAdmin('',{action:'addCustomer',name:$('#customerName').value,email:$('#customerEmail').value,whatsapp:$('#customerWhatsapp').value}).then(function(){e.target.reset();e.target.classList.add('hidden');return loadDashboard();}).catch(function(err){showStatus($('#dashboardStatus'),err.message,'error');});
});
$('#availabilityForm').addEventListener('submit',function(e){
 e.preventDefault();apiAdmin('',{action:'setAvailability',serviceDate:$('#serviceDate').value,status:$('#serviceStatus').value,startTime:$('#startTime').value,endTime:$('#endTime').value,note:$('#availabilityNote').value}).then(function(){e.target.reset();$('#startTime').value='13:00';$('#endTime').value='16:00';return loadDashboard();}).catch(function(err){showStatus($('#dashboardStatus'),err.message,'error');});
});
$('#serviceStatus').addEventListener('change',function(){$('#startTime').disabled=$('#serviceStatus').value==='closed';$('#endTime').disabled=$('#serviceStatus').value==='closed';});
$('#logoutBtn').addEventListener('click',function(){client.auth.signOut().finally(function(){location.reload();});});
fetch('/api/config',{headers:{Accept:'application/json'},cache:'no-store'}).then(function(r){return r.json().then(function(d){if(!r.ok||d.status!=='ok')throw new Error(d.message||'Konfigurasi Supabase belum tersedia.');return d;});}).then(function(cfg){
 if(!window.supabase||!window.supabase.createClient)throw new Error('Library Supabase gagal dimuat. Periksa koneksi internet, lalu muat ulang halaman.');
 client=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 return client.auth.getSession();
}).then(function(r){
 if(r&&r.data&&r.data.session){
  return apiAdmin('dashboard').then(function(){showDashboard();}).catch(function(){showAuth('Sesi tersimpan perlu login ulang dan verifikasi OTP Telegram.');});
 }
 showAuth('Backend siap. Masuk dengan akun admin Supabase.');
}).catch(function(err){showAuth(err.message||'Backend belum dikonfigurasi.','error');});
})();
