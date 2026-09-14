/* Tama Andrea Studio — Telegram order notification layer
 * Secrets are stored only in Apps Script Script Properties.
 * Required property: TA_TELEGRAM_BOT_TOKEN
 * Fixed admin group: -1003943799973
 */
const TELEGRAM_CONFIG=Object.freeze({
  groupId:'-1003943799973',
  tokenProperty:'TA_TELEGRAM_BOT_TOKEN',
  cursorProperty:'TA_TELEGRAM_LAST_ORDER_ROW',
  triggerHandler:'telegramPollOrders_',
  pollMinutes:5,
  maxBatch:10
});

function telegramSetup(){
  const props=PropertiesService.getScriptProperties();
  const token=String(props.getProperty(TELEGRAM_CONFIG.tokenProperty)||'').trim();
  if(!token) throw new Error('TA_TELEGRAM_BOT_TOKEN belum diatur di Script Properties.');
  const sheet=getOrdersSheet_();
  props.setProperty(TELEGRAM_CONFIG.cursorProperty,String(sheet.getLastRow()));
  ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()===TELEGRAM_CONFIG.triggerHandler;}).forEach(function(t){ScriptApp.deleteTrigger(t)});
  ScriptApp.newTrigger(TELEGRAM_CONFIG.triggerHandler).timeBased().everyMinutes(TELEGRAM_CONFIG.pollMinutes).create();
  const test=telegramSendMessage_('🟦 <b>Tama Andrea Studio</b>\nTelegram order notification aktif.\nGrup: <code>'+escapeTelegram_(TELEGRAM_CONFIG.groupId)+'</code>');
  return {status:'success',configured:true,groupId:TELEGRAM_CONFIG.groupId,triggerMinutes:TELEGRAM_CONFIG.pollMinutes,test:test};
}

function telegramHealthCheck(){
  const props=PropertiesService.getScriptProperties();
  const token=String(props.getProperty(TELEGRAM_CONFIG.tokenProperty)||'').trim();
  const triggers=ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()===TELEGRAM_CONFIG.triggerHandler;});
  return {status:'success',configured:!!token,groupId:TELEGRAM_CONFIG.groupId,triggerCount:triggers.length,cursor:props.getProperty(TELEGRAM_CONFIG.cursorProperty)||'0',note:'Token tidak pernah dikembalikan.'};
}

function telegramPollOrders_(){
  const props=PropertiesService.getScriptProperties();
  if(!props.getProperty(TELEGRAM_CONFIG.tokenProperty)) return;
  const sheet=getOrdersSheet_(),lastRow=sheet.getLastRow();
  let cursor=Math.max(1,Number(props.getProperty(TELEGRAM_CONFIG.cursorProperty)||1));
  if(cursor>=lastRow){props.setProperty(TELEGRAM_CONFIG.cursorProperty,String(lastRow));return;}
  const start=cursor+1,end=Math.min(lastRow,start+TELEGRAM_CONFIG.maxBatch-1);
  const rows=sheet.getRange(start,1,end-start+1,ORDER_HEADERS.length).getValues();
  for(let index=0;index<rows.length;index++){
    const order=rowToTelegramOrder_(rows[index]);
    if(order.id){
      try{telegramSendMessage_(formatTelegramOrder_(order));}
      catch(err){logError_(makeRequestId_(),'telegramPollOrders','TELEGRAM_SEND_FAILED',err);return;}
    }
    cursor=start+index;
    props.setProperty(TELEGRAM_CONFIG.cursorProperty,String(cursor));
  }
}

function rowToTelegramOrder_(row){
  return {
    id:String(row[0]||''),date:formatDateTime_(row[1]),name:String(row[3]||''),email:String(row[4]||''),wa:String(row[5]||''),
    category:String(row[6]||''),service:String(row[7]||''),os:String(row[8]||''),method:String(row[9]||''),brief:String(row[10]||''),
    deadline:formatDateTime_(row[11]),status:String(row[12]||'Pending'),estimate:String(row[13]||''),priority:String(row[17]||'Normal'),source:String(row[19]||'website')
  };
}

function formatTelegramOrder_(o){
  return '🆕 <b>ORDER BARU — Tama Andrea Studio</b>\n\n'+
    '<b>ID:</b> <code>'+escapeTelegram_(o.id)+'</code>\n'+
    '<b>Waktu:</b> '+escapeTelegram_(o.date)+'\n'+
    '<b>Nama:</b> '+escapeTelegram_(o.name)+'\n'+
    '<b>Email:</b> '+escapeTelegram_(o.email)+'\n'+
    '<b>WhatsApp:</b> '+escapeTelegram_(o.wa)+'\n\n'+
    '<b>Kategori:</b> '+escapeTelegram_(o.category)+'\n'+
    '<b>Layanan:</b> '+escapeTelegram_(o.service)+'\n'+
    '<b>OS:</b> '+escapeTelegram_(o.os||'Tidak dipilih')+'\n'+
    '<b>Metode:</b> '+escapeTelegram_(o.method)+'\n'+
    '<b>Estimasi:</b> Rp '+escapeTelegram_(o.estimate||'menunggu konfirmasi')+'\n'+
    '<b>Prioritas:</b> '+escapeTelegram_(o.priority)+'\n'+
    '<b>Sumber:</b> '+escapeTelegram_(o.source)+'\n\n'+
    '<b>Brief:</b>\n'+escapeTelegram_(o.brief||'—')+'\n\n'+
    '🔒 Data dikirim dari sistem order. Jangan meminta password, OTP, recovery code, atau token pelanggan.';
}

function telegramSendMessage_(text){
  const token=String(PropertiesService.getScriptProperties().getProperty(TELEGRAM_CONFIG.tokenProperty)||'').trim();
  if(!token) throw new Error('Telegram bot token belum dikonfigurasi.');
  const url='https://api.telegram.org/bot'+encodeURIComponent(token)+'/sendMessage';
  const response=UrlFetchApp.fetch(url,{method:'post',contentType:'application/json',payload:JSON.stringify({chat_id:TELEGRAM_CONFIG.groupId,text:text,parse_mode:'HTML',disable_web_page_preview:true}),muteHttpExceptions:true});
  const code=response.getResponseCode(),body=response.getContentText();
  let data={};try{data=JSON.parse(body)}catch(_){ }
  if(code<200||code>=300||!data.ok) throw new Error('Telegram API gagal ('+code+').');
  return {ok:true,messageId:data.result&&data.result.message_id||null};
}

function escapeTelegram_(value){return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
