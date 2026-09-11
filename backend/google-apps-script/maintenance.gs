/* Tama Andrea Studio — long-term maintenance layer.
 * Additive and non-destructive. Requires the existing backend core helpers.
 * This file is intentionally independent from the public API router.
 */
const TA_MAINTENANCE=Object.freeze({version:'2026.1',maxLogRows:2000,triggerHours:6});

function maintenanceSnapshot(){
  const rid=typeof makeRequestId_==='function'?makeRequestId_():'maintenance_'+Date.now();
  const out={status:'ok',requestId:rid,version:TA_MAINTENANCE.version,time:new Date().toISOString(),sheets:{},config:{},warnings:[]};
  try{
    const ss=getSpreadsheet_();
    out.spreadsheet=ss.getName();
    Object.keys(SHEETS).forEach(function(k){
      const name=SHEETS[k],s=ss.getSheetByName(name);
      out.sheets[name]={exists:!!s,rows:s?s.getLastRow():0,columns:s?s.getLastColumn():0};
      if(!s)out.warnings.push('Missing sheet: '+name);
    });
    const p=PropertiesService.getScriptProperties();
    out.config.orderSequence=p.getProperty('TA_ORDER_SEQ')||'0';
    out.config.adminConfigured=!!p.getProperty('TA_ADMIN_GATE_HASH')&&!!p.getProperty('TA_ADMIN_CODE_HASH');
    out.config.spreadsheetConfigured=!!p.getProperty('TA_SPREADSHEET_ID')||!!SpreadsheetApp.getActiveSpreadsheet();
    out.config.timezone=Session.getScriptTimeZone();
    out.config.backendVersion=APP.VERSION;
    out.status=out.warnings.length?'warning':'ok';
    return out;
  }catch(err){
    out.status='error';
    out.error=typeof publicErrorMessage_==='function'?publicErrorMessage_(err):'Maintenance check failed.';
    if(typeof logError_==='function')logError_(rid,'maintenanceSnapshot','MAINTENANCE_FAILED',err);
    return out;
  }
}

function maintenanceSchemaCheck(){
  const ss=getSpreadsheet_(),checks=[];
  const expected={
    Orders:ORDER_HEADERS,
    Customers:CUSTOMER_HEADERS,
    Audit_Log:AUDIT_HEADERS,
    Error_Log:ERROR_HEADERS,
    Request_Index:REQUEST_HEADERS,
    Settings:SETTINGS_HEADERS,
    Service_Notes:['Note ID','Kategori','Judul','Ringkasan','Langkah Kerja','Peringatan / Batasan','Updated At'],
    Boot_Keys:['Brand','Jenis Perangkat','Model / Motherboard','BIOS / UEFI','Boot Menu','Catatan','Updated At']
  };
  Object.keys(expected).forEach(function(name){
    const s=ss.getSheetByName(name),want=expected[name],got=s?s.getRange(1,1,1,Math.max(want.length,s.getLastColumn()||1)).getDisplayValues()[0]:[];
    const missing=want.filter(function(h,i){return String(got[i]||'').trim()!==h});
    checks.push({sheet:name,exists:!!s,expectedColumns:want.length,missingOrMismatched:missing});
  });
  return{status:checks.every(function(c){return c.exists&&!c.missingOrMismatched.length})?'ok':'warning',checks:checks};
}

function maintenanceConfigCheck(){
  const p=PropertiesService.getScriptProperties(),required=['TA_ORDER_SEQ'];
  const optional=['TA_SPREADSHEET_ID','TA_ADMIN_GATE_HASH','TA_ADMIN_CODE_HASH','TA_ADMIN_EMAIL','TA_ADMIN_PASSWORD_HASH'];
  const missing=required.filter(function(k){return !String(p.getProperty(k)||'').trim()});
  return{status:missing.length?'warning':'ok',requiredPresent:required.filter(function(k){return!!String(p.getProperty(k)||'').trim()}),missingRequired:missing,optionalPresent:optional.filter(function(k){return!!String(p.getProperty(k)||'').trim()})};
}

function maintenanceFullReport(){
  const report={generatedAt:new Date().toISOString(),maintenance:TA_MAINTENANCE.version,snapshot:maintenanceSnapshot(),schema:maintenanceSchemaCheck(),config:maintenanceConfigCheck()};
  report.status=[report.snapshot.status,report.schema.status,report.config.status].indexOf('error')>=0?'error':([report.snapshot.status,report.schema.status,report.config.status].indexOf('warning')>=0?'warning':'ok');
  return report;
}

function maintenanceCreatePeriodicTrigger(){
  const fn='maintenancePeriodicCheck';
  ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()===fn}).forEach(function(t){ScriptApp.deleteTrigger(t)});
  ScriptApp.newTrigger(fn).timeBased().everyHours(TA_MAINTENANCE.triggerHours).create();
  return{status:'success',message:'Periodic maintenance trigger installed.',everyHours:TA_MAINTENANCE.triggerHours};
}

function maintenancePeriodicCheck(){
  const report=maintenanceFullReport();
  if(report.status==='error'&&typeof logError_==='function')logError_(report.snapshot.requestId||makeRequestId_(),'maintenancePeriodicCheck','MAINTENANCE_HEALTH_ERROR',new Error('Maintenance health check returned error.'));
  return report;
}
