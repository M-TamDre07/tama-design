/**
 * TA Backend — Admin Security & Technician Console extensions
 *
 * IMPORTANT:
 * - No admin secret is stored in this file.
 * - Configure secrets from Apps Script with configureAdminSecurity().
 * - The first admin gate is a non-customer credential. It never looks up an order.
 */
const ADMIN_SECURITY={
  STAGE_SECONDS:300,
  SESSION_SECONDS:21600,
  GATE_LIMIT:5,
  CODE_LIMIT:5,
  VERIFY_LIMIT:5,
  GATE_WINDOW:600,
  CODE_WINDOW:600,
  VERIFY_WINDOW:900
};

const ADMIN_SUPPORT_SHEETS={
  NOTES:'Service_Notes',
  BOOT:'Boot_Keys'
};

const ADMIN_SUPPORT_HEADERS={
  NOTES:['Note ID','Kategori','Judul','Ringkasan','Langkah Kerja','Peringatan / Batasan','Updated At'],
  BOOT:['Brand','Jenis Perangkat','Model / Motherboard','BIOS / UEFI','Boot Menu','Catatan','Updated At']
};

/** One-time configuration from the Apps Script editor. */
function configureAdminSecurity(){
  const ui=SpreadsheetApp.getUi();
  const gate=promptSecret_(ui,'Tahap 1 — Kode Gerbang Admin','Masukkan kode gerbang admin. Contoh format: ORD-0000-1111-2222-3333');
  if(gate===null)return;
  const code=promptSecret_(ui,'Tahap 2 — Kode Akses Admin','Masukkan kode akses admin kedua. Gunakan kode berbeda dari kode gerbang.');
  if(code===null)return;
  const name=promptText_(ui,'Tahap 3 — Nama Admin','Masukkan nama admin resmi.');
  if(name===null)return;
  const email=promptText_(ui,'Tahap 3 — Email Admin','Masukkan email admin.');
  if(email===null)return;
  const password=promptSecret_(ui,'Tahap 3 — Password Admin','Masukkan password admin minimal 12 karakter.');
  if(password===null)return;

  if(String(gate).trim().length<8||String(code).trim().length<8){ui.alert('Kode akses terlalu pendek.');return;}
  if(String(password).length<12){ui.alert('Password minimal 12 karakter.');return;}
  if(!/^\S+@\S+\.\S+$/.test(String(email).trim())){ui.alert('Format email tidak valid.');return;}

  const p=PropertiesService.getScriptProperties();
  const gateSalt=makeToken_(),codeSalt=makeToken_(),passwordSalt=makeToken_(),identitySalt=makeToken_();
  p.setProperties({
    TA_ADMIN_GATE_SALT:gateSalt,
    TA_ADMIN_GATE_HASH:hash_(String(gate).trim(),gateSalt),
    TA_ADMIN_CODE_SALT:codeSalt,
    TA_ADMIN_CODE_HASH:hash_(String(code).trim(),codeSalt),
    TA_ADMIN_ID_SALT:identitySalt,
    TA_ADMIN_EMAIL_HASH:hash_(String(email).trim().toLowerCase(),identitySalt),
    TA_ADMIN_NAME_HASH:hash_(normalize_(name),identitySalt),
    TA_ADMIN_PASSWORD_SALT:passwordSalt,
    TA_ADMIN_PASSWORD_HASH:hash_(String(password),passwordSalt)
  },true);
  ensureAdminSupportSheets_();
  seedBootKeys_();
  seedServiceNotes_();
  writeAudit_(makeRequestId_(),'admin-setup','CONFIGURE_SECURITY','','SUCCESS','Admin security dikonfigurasi.');
  ui.alert('Konfigurasi keamanan admin selesai. Secret tidak ditulis ke source code.');
}

function promptSecret_(ui,title,message){
  const r=ui.prompt(title,message,ui.ButtonSet.OK_CANCEL);
  if(r.getSelectedButton()!==ui.Button.OK)return null;
  return String(r.getResponseText()||'');
}
function promptText_(ui,title,message){return promptSecret_(ui,title,message);}

/** Stage 1: validates the special admin gate without touching order/customer data. */
function adminGate(gateCode){
  const rid=makeRequestId_();
  try{
    ensureAdminSupportSheets_();
    if(!enforceRate_('admin-gate',ADMIN_SECURITY.GATE_LIMIT,ADMIN_SECURITY.GATE_WINDOW))return errorObject_('RATE_LIMITED','Terlalu banyak percobaan. Coba lagi nanti.',rid);
    const p=PropertiesService.getScriptProperties(),salt=p.getProperty('TA_ADMIN_GATE_SALT'),stored=p.getProperty('TA_ADMIN_GATE_HASH');
    if(!salt||!stored)return errorObject_('ADMIN_NOT_CONFIGURED','Gerbang admin belum dikonfigurasi.',rid);
    if(hash_(String(gateCode||'').trim(),salt)!==stored){writeAudit_(rid,'admin-gate','GATE','','DENIED','Kode gerbang salah.');return errorObject_('GATE_DENIED','Kode gerbang tidak valid.',rid)}
    const token=makeToken_();CacheService.getScriptCache().put('admin-gate:'+token,'1',ADMIN_SECURITY.STAGE_SECONDS);
    writeAudit_(rid,'admin-gate','GATE','','SUCCESS','Gerbang admin dibuka.');
    return{status:'ok',stage:'code',stageToken:token,expiresIn:ADMIN_SECURITY.STAGE_SECONDS,requestId:rid};
  }catch(err){logError_(rid,'adminGate',err.code||'INTERNAL_ERROR',err);return errorObject_('INTERNAL_ERROR','Gerbang admin tidak dapat diproses.',rid)}
}

/** Stage 2: second factor before identity/password verification. */
function adminCode(stageToken,accessCode){
  const rid=makeRequestId_();
  try{
    if(!stageToken||!CacheService.getScriptCache().get('admin-gate:'+stageToken))return errorObject_('STAGE_EXPIRED','Tahap pertama sudah kedaluwarsa. Mulai lagi.',rid);
    if(!enforceRate_('admin-code:'+stageToken,ADMIN_SECURITY.CODE_LIMIT,ADMIN_SECURITY.CODE_WINDOW))return errorObject_('RATE_LIMITED','Terlalu banyak percobaan. Coba lagi nanti.',rid);
    const p=PropertiesService.getScriptProperties(),salt=p.getProperty('TA_ADMIN_CODE_SALT'),stored=p.getProperty('TA_ADMIN_CODE_HASH');
    if(!salt||!stored)return errorObject_('ADMIN_NOT_CONFIGURED','Kode akses admin belum dikonfigurasi.',rid);
    if(hash_(String(accessCode||'').trim(),salt)!==stored){writeAudit_(rid,'admin-code','CODE','','DENIED','Kode akses salah.');return errorObject_('CODE_DENIED','Kode akses admin tidak valid.',rid)}
    CacheService.getScriptCache().remove('admin-gate:'+stageToken);
    const verifyToken=makeToken_();CacheService.getScriptCache().put('admin-verify:'+verifyToken,'1',ADMIN_SECURITY.STAGE_SECONDS);
    writeAudit_(rid,'admin-code','CODE','','SUCCESS','Tahap kedua lolos.');
    return{status:'ok',stage:'identity',verifyToken:verifyToken,expiresIn:ADMIN_SECURITY.STAGE_SECONDS,requestId:rid};
  }catch(err){logError_(rid,'adminCode',err.code||'INTERNAL_ERROR',err);return errorObject_('INTERNAL_ERROR','Kode akses tidak dapat diproses.',rid)}
}

/** Stage 3: identity + password verification, then issue the admin session token. */
function adminVerify(verifyToken,payload){
  const rid=makeRequestId_();
  try{
    if(!verifyToken||!CacheService.getScriptCache().get('admin-verify:'+verifyToken))return errorObject_('STAGE_EXPIRED','Tahap verifikasi sudah kedaluwarsa. Mulai lagi.',rid);
    if(!enforceRate_('admin-verify:'+verifyToken,ADMIN_SECURITY.VERIFY_LIMIT,ADMIN_SECURITY.VERIFY_WINDOW))return errorObject_('RATE_LIMITED','Terlalu banyak percobaan. Coba lagi nanti.',rid);
    const raw=payload||{},p=PropertiesService.getScriptProperties();
    const identitySalt=p.getProperty('TA_ADMIN_ID_SALT'),emailHash=p.getProperty('TA_ADMIN_EMAIL_HASH'),nameHash=p.getProperty('TA_ADMIN_NAME_HASH'),passwordSalt=p.getProperty('TA_ADMIN_PASSWORD_SALT'),passwordHash=p.getProperty('TA_ADMIN_PASSWORD_HASH');
    if(!identitySalt||!emailHash||!nameHash||!passwordSalt||!passwordHash)return errorObject_('ADMIN_NOT_CONFIGURED','Identitas/password admin belum dikonfigurasi.',rid);
    const email=String(raw.email||'').trim().toLowerCase(),name=normalize_(raw.name),password=String(raw.password||'');
    if(hash_(email,identitySalt)!==emailHash||hash_(name,identitySalt)!==nameHash||hash_(password,passwordSalt)!==passwordHash){writeAudit_(rid,'admin','LOGIN','','DENIED','Verifikasi identitas/password gagal.');return errorObject_('AUTH_FAILED','Email, nama, atau password admin tidak cocok.',rid)}
    CacheService.getScriptCache().remove('admin-verify:'+verifyToken);
    const token=makeToken_();CacheService.getScriptCache().put('admin:'+token,'1',ADMIN_SECURITY.SESSION_SECONDS);
    writeAudit_(rid,'admin','LOGIN','','SUCCESS','Admin login berlapis berhasil.');
    return{status:'ok',token:token,expiresIn:ADMIN_SECURITY.SESSION_SECONDS,adminName:String(raw.name||'Admin').trim(),requestId:rid};
  }catch(err){logError_(rid,'adminVerify',err.code||'INTERNAL_ERROR',err);return errorObject_('INTERNAL_ERROR','Verifikasi admin tidak dapat diproses.',rid)}
}

function adminLogoutSecure(token){
  if(token)CacheService.getScriptCache().remove('admin:'+token);
  return{status:'ok'};
}

function ensureAdminSupportSheets_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();if(!ss)throw new Error('Spreadsheet aktif tidak ditemukan.');
  Object.keys(ADMIN_SUPPORT_SHEETS).forEach(k=>{
    const name=ADMIN_SUPPORT_SHEETS[k],headers=ADMIN_SUPPORT_HEADERS[k];
    let s=ss.getSheetByName(name);if(!s)s=ss.insertSheet(name);
    if(s.getLastRow()===0)s.getRange(1,1,1,headers.length).setValues([headers]);
    s.setFrozenRows(1);
    if(s.getLastColumn()>=headers.length)s.getRange(1,1,1,headers.length).setFontWeight('bold');
  });
}

function seedBootKeys_(){
  const s=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ADMIN_SUPPORT_SHEETS.BOOT);if(!s||s.getLastRow()>1)return;
  const rows=[
    ['Acer','Laptop/PC','','F2','F12','Tombol dapat berbeda menurut model.'],
    ['ASUS','Laptop/PC','','F2 atau Del','Esc','Boot Menu sering menggunakan Esc pada banyak model.'],
    ['Dell','Laptop/PC','','F2','F12','Tekan berulang segera setelah power.'],
    ['HP','Laptop/PC','','F10','F9','Esc sering membuka Startup Menu pada banyak model.'],
    ['Lenovo','Laptop/PC','','F1 atau F2','F12','Model tertentu memiliki tombol Novo.'],
    ['ThinkPad','Laptop','','F1 atau F2','F12','Boot Menu dapat dipanggil dengan F12.'],
    ['MSI','PC/Laptop','','Del atau F2','F11','Bisa berbeda menurut motherboard/model.'],
    ['Gigabyte','PC','','Del','F12','Berlaku sebagai panduan awal, bukan jaminan semua model.'],
    ['ASRock','PC','','Del atau F2','F11','Bisa berbeda menurut seri motherboard.']
  ];
  s.getRange(2,1,rows.length,6).setValues(rows.map(r=>r.concat([new Date()])));
}

function seedServiceNotes_(){
  const s=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ADMIN_SUPPORT_SHEETS.NOTES);if(!s||s.getLastRow()>1)return;
  const notes=[
    ['NOTE-BOOT-001','Boot / Startup','Windows gagal boot','Gunakan diagnosis bertahap sebelum memutuskan reinstall.','Nyalakan → amati POST → masuk BIOS/Boot Menu bila diperlukan → boot media eksternal → cek storage internal → cek apakah data terbaca → cek versi Windows → backup bila diperlukan → coba recovery → konsultasi sebelum reinstall.','Jangan menyimpulkan SSD rusak hanya karena Windows gagal boot. Jangan hapus partisi sebelum persetujuan pelanggan.'],
    ['NOTE-BACKUP-001','Backup Data','Backup sebelum instal ulang','Amankan file penting terlebih dahulu bila storage masih dapat dibaca.','Identifikasi drive internal → cek Users → tentukan folder yang perlu disalin → salin ke media tujuan → verifikasi ukuran dan beberapa file → catat hasil backup → baru lanjut sesuai persetujuan pelanggan.','BitLocker/enkripsi, kerusakan storage, atau filesystem bermasalah dapat menghambat akses data. Jangan menjanjikan data 100% aman.'],
    ['NOTE-RECOVERY-001','Windows Recovery','Repair your computer','Gunakan installation media/recovery yang sesuai untuk mencoba pemulihan sebelum clean install.','Boot flashdisk → Windows Setup → Repair your computer → Troubleshoot → gunakan opsi recovery yang relevan → restart → evaluasi hasil.','Media LTSC tidak boleh diasumsikan universal untuk semua edisi Windows. Jangan menghapus data tanpa persetujuan.'],
    ['NOTE-SSD-001','Storage','Pemeriksaan SSD / HDD','Gunakan tools yang sesuai untuk menilai deteksi dan indikator kesehatan storage.','Cek apakah drive terdeteksi → cek kapasitas/partisi → baca SMART/health → amati error → simpulkan status secara hati-hati.','SMART adalah indikator, bukan jaminan drive pasti sehat. Hindari operasi tulis yang tidak perlu pada drive yang dicurigai rusak.']
  ];
  s.getRange(2,1,notes.length,7).setValues(notes.map(r=>r.concat([new Date()])));
}

function getServiceNotes(token,query,category){
  requireAdmin_(token);ensureAdminSupportSheets_();
  const s=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ADMIN_SUPPORT_SHEETS.NOTES);if(!s||s.getLastRow()<2)return{status:'ok',notes:[]};
  const q=normalize_(query),cat=normalize_(category);const rows=s.getRange(2,1,s.getLastRow()-1,7).getValues();
  const notes=rows.filter(r=>{const hay=normalize_([r[0],r[1],r[2],r[3],r[4]].join(' '));return(!q||hay.includes(q))&&(!cat||normalize_(r[1])===cat)}).map(noteRow_);
  return{status:'ok',notes:notes.slice(0,100)};
}
function saveServiceNote(note,token){
  requireAdmin_(token);ensureAdminSupportSheets_();
  const s=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ADMIN_SUPPORT_SHEETS.NOTES),n=note||{},id=safeCell_(n.id||('NOTE-'+makeToken_().slice(0,8).toUpperCase()));
  const row=[id,safeCell_(String(n.category||'Umum').slice(0,80)),safeCell_(String(n.title||'Untitled').slice(0,160)),safeCell_(String(n.summary||'').slice(0,1000)),safeCell_(String(n.steps||'').slice(0,6000)),safeCell_(String(n.warnings||'').slice(0,3000)),new Date()];
  const data=s.getLastRow()>1?s.getRange(2,1,s.getLastRow()-1,7).getValues():[],idx=data.findIndex(r=>String(r[0])===id);
  if(idx<0)s.appendRow(row);else s.getRange(idx+2,1,1,7).setValues([row]);
  writeAudit_(makeRequestId_(),'admin','SAVE_SERVICE_NOTE',id,'SUCCESS','Catatan teknisi diperbarui.');return{status:'ok',note:noteRow_(row)};
}
function deleteServiceNote(id,token){
  requireAdmin_(token);const s=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ADMIN_SUPPORT_SHEETS.NOTES);if(!s)throw appError_('NOT_FOUND','Sheet catatan tidak ditemukan.');const data=s.getLastRow()>1?s.getRange(2,1,s.getLastRow()-1,7).getValues():[],idx=data.findIndex(r=>String(r[0])===String(id));if(idx<0)throw appError_('NOT_FOUND','Catatan tidak ditemukan.');s.deleteRow(idx+2);writeAudit_(makeRequestId_(),'admin','DELETE_SERVICE_NOTE',String(id),'SUCCESS','Catatan teknisi dihapus.');return{status:'ok',id:id};
}
function noteRow_(r){return{id:String(r[0]||''),category:String(r[1]||''),title:String(r[2]||''),summary:String(r[3]||''),steps:String(r[4]||''),warnings:String(r[5]||''),updated:formatDateTimeValue_(r[6])}}

function searchBootKeys(query,type,token){
  requireAdmin_(token);ensureAdminSupportSheets_();seedBootKeys_();
  const s=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ADMIN_SUPPORT_SHEETS.BOOT),q=normalize_(query),t=normalize_(type);const rows=s.getLastRow()>1?s.getRange(2,1,s.getLastRow()-1,7).getValues():[];
  const result=rows.filter(r=>(!q||normalize_([r[0],r[2],r[3],r[4],r[5]].join(' ')).includes(q))&&(!t||normalize_(r[1]).includes(t))).map(bootRow_);
  return{status:'ok',results:result.slice(0,100)};
}
function saveBootKey(item,token){
  requireAdmin_(token);ensureAdminSupportSheets_();const s=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ADMIN_SUPPORT_SHEETS.BOOT),n=item||{};
  const row=[safeCell_(n.brand||''),safeCell_(n.deviceType||'Laptop/PC'),safeCell_(n.model||''),safeCell_(n.bios||''),safeCell_(n.boot||''),safeCell_(n.notes||''),new Date()];
  const data=s.getLastRow()>1?s.getRange(2,1,s.getLastRow()-1,7).getValues():[];const idx=data.findIndex(r=>String(r[0])===String(n.brand||'')&&String(r[1])===String(n.deviceType||'')&&String(r[2])===String(n.model||''));
  if(idx<0)s.appendRow(row);else s.getRange(idx+2,1,1,7).setValues([row]);
  writeAudit_(makeRequestId_(),'admin','SAVE_BOOT_KEY',String(n.brand||''),'SUCCESS','Data boot key diperbarui.');return{status:'ok',item:bootRow_(row)};
}
function bootRow_(r){return{brand:String(r[0]||''),deviceType:String(r[1]||''),model:String(r[2]||''),bios:String(r[3]||''),boot:String(r[4]||''),notes:String(r[5]||''),updated:formatDateTimeValue_(r[6])}}

function getAdminSettingsSecure(token){
  requireAdmin_(token);const s=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(typeof SHEETS!=='undefined'?SHEETS.SETTINGS:'Settings');if(!s||s.getLastRow()<2)return{status:'ok',settings:[]};
  return{status:'ok',settings:s.getRange(2,1,s.getLastRow()-1,4).getValues().filter(r=>r[0]).map(r=>({key:String(r[0]),value:String(r[1]||''),description:String(r[2]||''),updated:formatDateTimeValue_(r[3])}))};
}
function saveAdminSettingSecure(key,value,description,token){
  requireAdmin_(token);if(!/^[A-Z0-9_.-]{2,80}$/.test(String(key||'')))throw appError_('VALIDATION_ERROR','Key setting tidak valid.');
  const ss=SpreadsheetApp.getActiveSpreadsheet(),name=typeof SHEETS!=='undefined'?SHEETS.SETTINGS:'Settings',s=ss.getSheetByName(name)||getOrCreateSheet_(ss,name,typeof SETTINGS_HEADERS!=='undefined'?SETTINGS_HEADERS:['Key','Value','Description','Updated At']);
  writeSetting_(s,String(key),String(value||'').slice(0,5000),String(description||'').slice(0,300));writeAudit_(makeRequestId_(),'admin','SAVE_SETTING',String(key),'SUCCESS','Setting diperbarui.');return{status:'ok'};
}

function adminAuditSummary(token){
  requireAdmin_(token);const ss=SpreadsheetApp.getActiveSpreadsheet(),s=ss.getSheetByName(typeof SHEETS!=='undefined'?SHEETS.AUDIT:'Audit_Log');if(!s||s.getLastRow()<2)return{status:'ok',events:[]};const rows=s.getRange(Math.max(2,s.getLastRow()-49),1,Math.min(50,s.getLastRow()-1),7).getDisplayValues();return{status:'ok',events:rows.reverse().map(r=>({time:r[0],requestId:r[1],actor:r[2],action:r[3],entity:r[4],result:r[5],detail:r[6]}))};
}

function adminExtendedHealthCheck(token){
  requireAdmin_(token);const base=runHealthCheck();ensureAdminSupportSheets_();base.supportSheets={Service_Notes:!!SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Service_Notes'),Boot_Keys:!!SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Boot_Keys')};base.adminSecurity={gate:!!PropertiesService.getScriptProperties().getProperty('TA_ADMIN_GATE_HASH'),code:!!PropertiesService.getScriptProperties().getProperty('TA_ADMIN_CODE_HASH'),identity:!!PropertiesService.getScriptProperties().getProperty('TA_ADMIN_EMAIL_HASH'),password:!!PropertiesService.getScriptProperties().getProperty('TA_ADMIN_PASSWORD_HASH')};return base;
}
