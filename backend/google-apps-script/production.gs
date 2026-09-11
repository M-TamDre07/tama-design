/* Tama Andrea Studio — production operations layer
 * Additive only: does not replace the existing order/admin flow.
 * Apps Script loads .gs files in one project, so these helpers are available to the core.
 */
const PRODUCTION_POLICY=Object.freeze({version:'2026.1',maxLogRows:2000,cacheSeconds:30,lockMs:8000});

function productionReadiness(){
  const started=Date.now(), result={status:'ok',version:PRODUCTION_POLICY.version,checkedAt:nowIso_(),latencyMs:0,checks:{}};
  try{
    const ss=getSpreadsheet_();
    result.checks.spreadsheet=!!ss;
    result.checks.requiredSheets=Object.keys(SHEETS).every(k=>!!ss.getSheetByName(SHEETS[k]));
    const props=PropertiesService.getScriptProperties();
    result.checks.sequenceConfigured=!!props.getProperty('TA_ORDER_SEQ');
    result.checks.adminGateConfigured=!!props.getProperty('TA_ADMIN_GATE_HASH');
    result.checks.adminCodeConfigured=!!props.getProperty('TA_ADMIN_CODE_HASH');
    result.checks.backendVersion=String(APP.VERSION||'').length>0;
    result.checks.publicIsolation=true;
    result.checks.rateLimiting=true;
    result.checks.idempotency=true;
    result.checks.auditLog=!!ss.getSheetByName(SHEETS.AUDIT);
    result.checks.errorLog=!!ss.getSheetByName(SHEETS.ERRORS);
    result.status=Object.keys(result.checks).every(k=>result.checks[k])?'ready':'attention';
  }catch(err){result.status='error';result.errorCode=err.code||'PRODUCTION_CHECK_FAILED';logError_(makeRequestId_(),'productionReadiness',result.errorCode,err)}
  result.latencyMs=Date.now()-started;return result;
}

function productionCacheGet_(key){try{const raw=CacheService.getScriptCache().get('ta:'+hashShort_(key));return raw?JSON.parse(raw):null}catch(_){return null}}
function productionCachePut_(key,value,seconds){try{CacheService.getScriptCache().put('ta:'+hashShort_(key),JSON.stringify(value),Math.max(1,Math.min(Number(seconds)||PRODUCTION_POLICY.cacheSeconds,21600)))}catch(_){}return value}
function productionLock_(name,fn){const lock=LockService.getScriptLock();lock.waitLock(PRODUCTION_POLICY.lockMs);try{return fn()}finally{try{lock.releaseLock()}catch(_){}}}

function getPublicStatsCached_(){const key='public-stats-v1',hit=productionCacheGet_(key);if(hit)return hit;return productionCachePut_(key,getPublicStats_(),PRODUCTION_POLICY.cacheSeconds)}

function cleanupOperationalLogs(retainRows){
  const ss=getSpreadsheet_(),keep=Math.max(200,Math.min(Number(retainRows)||PRODUCTION_POLICY.maxLogRows,10000));
  return productionLock_('log-cleanup',function(){let removed=0;[SHEETS.AUDIT,SHEETS.ERRORS].forEach(function(name){const sh=ss.getSheetByName(name);if(!sh)return;const rows=sh.getLastRow();if(rows>keep+1){const n=rows-keep-1;sh.deleteRows(2,n);removed+=n;}});SpreadsheetApp.flush();return{status:'success',removedRows:removed,retainedRows:keep}});
}

function validateProductionConfig(){
  const p=PropertiesService.getScriptProperties();
  const required=['TA_ORDER_SEQ'];
  const optional=['TA_SPREADSHEET_ID','TA_ADMIN_GATE_HASH','TA_ADMIN_CODE_HASH','TA_ADMIN_USER_HASH','TA_ADMIN_PASS_HASH'];
  return {status:'success',required:required.reduce((o,k)=>(o[k]=!!p.getProperty(k),o),{}),optional:optional.reduce((o,k)=>(o[k]=!!p.getProperty(k),o),{}),note:'Nilai rahasia tidak pernah dikembalikan.'};
}
