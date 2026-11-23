'use strict';
const { rest } = require('./_lib/db');
const SITE='https://tamaandrea.vercel.app';
const xml=v=>String(v||'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
const iso=v=>{const d=v?new Date(v):null;return d&&!Number.isNaN(d.getTime())?d.toISOString():''};
module.exports=async function newsSitemap(req,res){
 if(req.method!=='GET'&&req.method!=='HEAD'){res.setHeader('Allow','GET, HEAD');res.statusCode=405;res.end('Method not allowed');return;}
 let rows=[];
 try{rows=await rest('studio_news',{query:{select:'slug,published_at,updated_at',status:'eq.published',order:'published_at.desc',limit:'500'}});}catch(_){}
 const entries=(Array.isArray(rows)?rows:[]).filter(x=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(x.slug||''))).map(x=>{
  const loc=SITE+'/berita/'+encodeURIComponent(x.slug),last=iso(x.updated_at)||iso(x.published_at);
  return '<url><loc>'+xml(loc)+'</loc>'+(last?'<lastmod>'+xml(last)+'</lastmod>':'')+'<changefreq>monthly</changefreq><priority>0.6</priority></url>';
 }).join('');
 const body='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+entries+'</urlset>';
 res.statusCode=200;res.setHeader('Content-Type','application/xml; charset=utf-8');res.setHeader('Cache-Control','public, max-age=0, s-maxage=300, stale-while-revalidate=600');res.setHeader('X-Content-Type-Options','nosniff');res.end(req.method==='HEAD'?'':body);
};
