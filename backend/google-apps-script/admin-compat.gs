/** Compatibility helpers for the technician/admin extension. Keep secrets out of this file. */
function normalize_(value){return String(value==null?'':value).trim().toLowerCase().replace(/\s+/g,' ');}
function enforceRateLimit_(key,maxCount,windowSeconds){if(typeof enforceRate_==='function')return enforceRate_(key,maxCount,windowSeconds);throw new Error('Rate-limit helper tidak tersedia.');}
