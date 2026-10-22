(function(){
'use strict';
var client=null, factorId='', challengeId='', enrolling=false, currentOrders=[], currentCustomers=[], currentSchedule=[], currentAudit=[], currentMessages=[], currentNotifications=[], currentErrorLogs=[];
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
function renderWebsiteMessages(){
 $('#websiteMessagesBody').innerHTML=currentMessages.map(function(m){
  var current=String(m.status||'Baru');
  var options=['Baru','Diproses','Selesai'].map(function(s){return '<option value="'+s+'"'+(current===s?' selected':'')+'>'+s+'</option>';}).join('');
  return '<tr data-message="'+escapeHtml(m.id)+'"><td>'+escapeHtml(fmtDate(m.created_at))+'</td><td><strong>'+escapeHtml(m.sender_name)+'</strong><small>'+escapeHtml(m.sender_email)+'</small></td><td>'+escapeHtml(m.message_type)+'<small>Prioritas: '+escapeHtml(m.priority||'Normal')+'</small></td><td><div class="message-cell">'+escapeHtml(m.message)+'</div><small>'+escapeHtml(m.page_url||'')+'</small></td><td>'+escapeHtml(m.telegram_status||'not_configured')+'<small>'+escapeHtml(fmtDate(m.telegram_sent_at))+'</small></td><td><select class="message-status" aria-label="Status penanganan">'+options+'</select></td><td><button class="btn primary save-message">Simpan</button><small class="message-save-status"></small></td></tr>';
 }).join('')||'<tr><td colspan="7">Belum ada laporan website.</td></tr>';
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
  currentOrders=d.orders||[];currentCustomers=d.customers||[];currentSchedule=d.serviceAvailability||[];currentAudit=d.auditLog||[];currentMessages=d.websiteMessages||[];currentNotifications=d.notifications||[];currentErrorLogs=d.errorLogs||[];
  $('#accountText').textContent='Masuk sebagai '+(d.account&&d.account.email||'admin')+'. Sesi dilindungi Supabase Auth + TOTP.';
  $('#orderCount').textContent=currentOrders.length;
  $('#completedCount').textContent=currentOrders.filter(function(o){return o.status==='Selesai';}).length;
  $('#customerCount').textContent=currentCustomers.length;
  $('#messageCount').textContent=currentMessages.length;
  $('#pendingNotificationCount').textContent=currentNotifications.filter(function(n){return n.status!=='sent';}).length;
  $('#errorCount').textContent=currentErrorLogs.length;
  var system=d.systemStatus||{};
  $('#systemStatus').textContent='Database: '+(system.database==='connected'?'terhubung':'belum terverifikasi')+' · Telegram: '+(system.telegramConfigured?'variabel tersedia':'belum dikonfigurasi')+' · Error server terbaru: '+currentErrorLogs.length+'.';
  renderOrders();renderCustomers();renderSchedule();renderAudit();renderWebsiteMessages();renderNotifications();renderErrors();
  showStatus($('#dashboardStatus'),'Data berhasil dimuat. '+new Date().toLocaleTimeString('id-ID'), 'ok');
 });
}
function showDashboard(){ $('#authView').classList.add('hidden');$('#dashboardView').classList.remove('hidden');loadDashboard().catch(function(err){showStatus($('#dashboardStatus'),err.message,'error');});}
function prepareMfa(factor,needEnroll){
 factorId=factor?factor.id:'';enrolling=!!needEnroll;challengeId='';
 $('#mfaPanel').classList.remove('hidden');$('#mfaCode').value='';$('#mfaQr').classList.add('hidden');$('#mfaSecret').classList.add('hidden');
 $('#mfaTitle').textContent=needEnroll?'Daftarkan authenticator':'Verifikasi dua langkah';
 $('#mfaText').textContent=needEnroll?'Pindai kode QR dengan aplikasi authenticator, lalu masukkan kode 6 digit untuk menyelesaikan pendaftaran.':'Masukkan kode 6 digit dari authenticator yang sudah terdaftar.';
 if(needEnroll){
  client.auth.mfa.enroll({factorType:'totp',friendlyName:'Tama Andrea Admin'}).then(function(r){
   if(r.error)throw r.error;factorId=r.data.id;
   $('#mfaQr').src=r.data.totp.qr_code;$('#mfaQr').classList.remove('hidden');
   $('#mfaSecret').textContent='Kunci manual: '+r.data.totp.secret;$('#mfaSecret').classList.remove('hidden');
   return client.auth.mfa.challenge({factorId:factorId});
  }).then(function(r){if(r.error)throw r.error;challengeId=r.data.id;showAuth('Pendaftaran authenticator siap. Simpan faktor cadangan secara aman.');}).catch(function(err){showAuth(err.message||'Tidak dapat menyiapkan authenticator.','error');});
 }else{
  client.auth.mfa.challenge({factorId:factorId}).then(function(r){if(r.error)throw r.error;challengeId=r.data.id;showAuth('Masukkan kode terbaru dari aplikasi authenticator.');}).catch(function(err){showAuth(err.message||'Tidak dapat meminta kode MFA.','error');});
 }
}
$('#loginForm').addEventListener('submit',function(e){
 e.preventDefault();if(!client){showAuth('Konfigurasi Supabase belum siap.','error');return;}
 var button=$('#loginBtn');button.disabled=true;showAuth('Memeriksa akun…');
 client.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value}).then(function(r){
  if(r.error)throw r.error;
  return client.auth.mfa.listFactors();
 }).then(function(r){
  if(r.error)throw r.error;
  var factors=(r.data&&r.data.totp)||[];
  if(!factors.length){prepareMfa(null,true);return;}
  return client.auth.mfa.getAuthenticatorAssuranceLevel().then(function(level){
   if(level.error)throw level.error;
   if(level.data&&level.data.currentLevel==='aal2'){showDashboard();return;}
   prepareMfa(factors[0],false);
  });
 }).catch(function(err){showAuth(err.message||'Login gagal.','error');}).finally(function(){button.disabled=false;});
});
$('#verifyMfaBtn').addEventListener('click',function(){
 var code=$('#mfaCode').value.replace(/\s+/g,'');
 if(!/^\d{6,8}$/.test(code)||!factorId||!challengeId){showAuth('Masukkan kode 6–8 digit yang valid.','error');return;}
 var button=$('#verifyMfaBtn');button.disabled=true;showAuth('Memverifikasi authenticator…');
 client.auth.mfa.verify({factorId:factorId,challengeId:challengeId,code:code}).then(function(r){
  if(r.error)throw r.error;
  return client.auth.mfa.getAuthenticatorAssuranceLevel();
 }).then(function(r){
  if(r.error)throw r.error;
  if(!r.data||r.data.currentLevel!=='aal2')throw new Error('Sesi belum mencapai level keamanan yang diperlukan.');
  $('#mfaPanel').classList.add('hidden');showDashboard();
 }).catch(function(err){showAuth(err.message||'Kode MFA tidak diterima.','error');}).finally(function(){button.disabled=false;});
});
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
 if(r&&r.data&&r.data.session){return client.auth.mfa.getAuthenticatorAssuranceLevel().then(function(level){if(!level.error&&level.data.currentLevel==='aal2')showDashboard();else showAuth('Sesi tersimpan belum menyelesaikan MFA. Silakan masuk kembali.');});}
 showAuth('Backend siap. Masuk dengan akun admin Supabase.');
}).catch(function(err){showAuth(err.message||'Backend belum dikonfigurasi.','error');});
})();
