'use strict';
const { rest, getSupabaseConfig, safeError } = require('./_lib/db');
const SITE='https://tamaandrea.vercel.app';
const LOGO=SITE+'/assets/images/brand/logo-tamaandreastudio.jpg';
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iso=v=>{const d=v?new Date(v):null;return d&&!Number.isNaN(d.getTime())?d.toISOString():''};
const date=v=>{const d=v?new Date(v):null;return d&&!Number.isNaN(d.getTime())?new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(d):'Tanggal publikasi tidak tersedia'};
const json=v=>JSON.stringify(v).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
function paragraphs(v){return String(v||'').replace(/\r\n?/g,'\n').split(/\n{2,}/).map(p=>p.trim()).filter(Boolean).map(p=>'<p>'+esc(p).replace(/\n/g,'<br>')+'</p>').join('')}
function publicImage(v){
 const s=String(v||'').trim();
 if(s.startsWith('/assets/images/news/')||s.startsWith('/assets/images/brand/'))return SITE+s;
 if(/^https:\/\/[a-z0-9.-]+(?::\d+)?\//i.test(s))return s;
 return '';
}
async function getArticle(slug){
 const rows=await rest('studio_news',{query:{select:'id,title,slug,excerpt,content,category,cover_media_id,cover_image_url,published_at,updated_at',slug:'eq.'+slug,status:'eq.published',limit:'1'}});
 const item=Array.isArray(rows)?rows[0]:null;if(!item)return null;
 let image=publicImage(item.cover_image_url),alt=String(item.title||'Tama Andrea Studio');
 if(item.cover_media_id){
  try{
   const media=await rest('studio_media_assets',{query:{select:'bucket_id,object_path,alt_text,visibility,status',id:'eq.'+item.cover_media_id,bucket_id:'eq.studio-media-public',visibility:'eq.public',status:'eq.ready',limit:'1'}});
   const asset=Array.isArray(media)?media[0]:null;
   if(asset&&asset.bucket_id==='studio-media-public'&&asset.visibility==='public'&&asset.status==='ready'){
    const cfg=getSupabaseConfig(),path=String(asset.object_path||'').split('/').map(encodeURIComponent).join('/');
    image=cfg.url+'/storage/v1/object/public/studio-media-public/'+path;alt=String(asset.alt_text||alt);
   }
  }catch(_){/* Retain a valid public cover when an optional media relation is unavailable. */}
 }
 return {...item,image_url:image,alt_text:alt};
}
function missing(){
 return '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Berita tidak ditemukan | Tama Andrea Studio</title><meta name="robots" content="noindex,follow"><link rel="stylesheet" href="/css/site.css"></head><body><main class="container" style="padding:96px 0"><p>404 · BERITA STUDIO</p><h1>Artikel tidak tersedia.</h1><p>Artikel mungkin sudah tidak dipublikasikan atau alamatnya salah.</p><a href="/berita.html">Kembali ke berita studio</a></main></body></html>';
}
function render(item){
 const title=String(item.title||'Berita studio'),desc=String(item.excerpt||'').slice(0,320),canonical=SITE+'/berita/'+encodeURIComponent(item.slug);
 const published=iso(item.published_at),modified=iso(item.updated_at)||published,minutes=Math.max(1,Math.ceil(String(item.content||'').trim().split(/\s+/).filter(Boolean).length/200));
 const image=item.image_url||'',alt=String(item.alt_text||title),category=String(item.category||'Kabar Studio');
 const article={'@context':'https://schema.org','@type':'NewsArticle',headline:title,description:desc,image:image?[image]:undefined,datePublished:published||undefined,dateModified:modified||undefined,articleSection:category,inLanguage:'id-ID',author:{'@type':'Organization',name:'Tama Andrea Studio',url:SITE+'/'},publisher:{'@type':'Organization',name:'Tama Andrea Studio',url:SITE+'/',logo:{'@type':'ImageObject',url:LOGO}},mainEntityOfPage:{'@type':'WebPage','@id':canonical}};
 const crumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{ '@type':'ListItem',position:1,name:'Beranda',item:SITE+'/'},{'@type':'ListItem',position:2,name:'Berita studio',item:SITE+'/berita.html'},{'@type':'ListItem',position:3,name:title,item:canonical}]};
 const cover=image?'<figure class="news-cover"><img src="'+esc(image)+'" alt="'+esc(alt)+'" width="1600" height="900" fetchpriority="high" decoding="async"><figcaption>'+esc(alt)+'</figcaption></figure>':'';
 return '<!doctype html><html lang="id" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>'+esc(title+' | Tama Andrea Studio')+'</title><meta name="description" content="'+esc(desc)+'"><meta name="robots" content="index,follow,max-image-preview:large"><meta name="author" content="Tama Andrea Studio">'+
 '<link rel="canonical" href="'+esc(canonical)+'"><link rel="icon" href="/assets/images/brand/logo-tamaandreastudio.jpg">'+
 '<meta property="og:locale" content="id_ID"><meta property="og:site_name" content="Tama Andrea Studio"><meta property="og:type" content="article"><meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(desc)+'"><meta property="og:url" content="'+esc(canonical)+'">'+
 (image?'<meta property="og:image" content="'+esc(image)+'"><meta property="og:image:alt" content="'+esc(alt)+'">':'')+
 (published?'<meta property="article:published_time" content="'+esc(published)+'">':'')+
 '<meta name="twitter:card" content="'+(image?'summary_large_image':'summary')+'"><meta name="twitter:title" content="'+esc(title)+'"><meta name="twitter:description" content="'+esc(desc)+'">'+(image?'<meta name="twitter:image" content="'+esc(image)+'"><link rel="preload" as="image" href="'+esc(image)+'">':'')+
 '<link rel="stylesheet" href="/css/site.css"><link rel="stylesheet" href="/css/studio-experience.css"><link rel="stylesheet" href="/css/studio-maintenance.css"><link rel="stylesheet" href="/css/reference-ui.css"><link rel="stylesheet" href="/css/media-cms.css"><link rel="stylesheet" href="/css/news-editorial.css">'+
 '<script type="application/ld+json">'+json(article)+'</script><script type="application/ld+json">'+json(crumbs)+'</script></head><body>'+
 '<div class="studio-announcement" role="region" aria-label="Informasi studio"><div class="container studio-announcement-inner"><span><strong>TAMA ANDREA STUDIO</strong><span class="announcement-separator">·</span> Desain grafis independen</span><a href="/pesan.html">Mulai konsultasi ↗</a></div></div>'+
 '<a class="skip" href="#main">Lewati ke konten</a><header class="site-header"><div class="container nav"><a class="brand" href="/" aria-label="Tama Andrea Studio"><img src="/assets/images/brand/logo-tamaandreastudio.jpg" alt="" width="40" height="40"><span><strong data-site-content="studioName">Tama Andrea Studio</strong><small>Graphic Design Studio</small></span></a><nav class="nav-links" aria-label="Navigasi utama"></nav><div class="nav-actions"><button class="icon-btn" id="theme" type="button" aria-label="Ganti tema"></button><button class="menu-btn" id="menu" type="button" aria-label="Buka menu" aria-expanded="false"></button></div></div><nav class="mobile-panel" id="mobileMenu" aria-label="Navigasi mobile"></nav></header>'+
 '<main id="main"><nav class="container breadcrumb" aria-label="Breadcrumb"><a href="/">Beranda</a><span aria-hidden="true">/</span><a href="/berita.html">Berita studio</a><span aria-hidden="true">/</span><span aria-current="page">'+esc(title)+'</span></nav>'+
 '<section class="news-article-section"><div class="container"><article class="news-article"><header class="news-article-header"><div class="news-article-kicker"><span class="eyebrow">PUBLIKASI STUDIO</span><span class="news-category">'+esc(category)+'</span></div><h1>'+esc(title)+'</h1><p class="news-article-excerpt">'+esc(desc)+'</p><div class="news-article-meta"><span>Tama Andrea Studio</span><span aria-hidden="true">·</span><time'+(published?' datetime="'+esc(published)+'"':'')+'>'+esc(date(item.published_at))+'</time><span aria-hidden="true">·</span><span>'+minutes+' menit baca</span></div></header>'+cover+
 '<div class="news-article-layout"><aside class="news-facts" aria-label="Informasi profil studio"><span class="news-facts-label">PROFIL STUDIO</span><h2>Informasi studio.</h2><dl><div><dt>Bidang</dt><dd>Desain grafis independen</dd></div><div><dt>Basis layanan</dt><dd>Kalianda, Lampung Selatan</dd></div><div><dt>Pengguna layanan</dt><dd>Personal, sekolah, komunitas, kreator, dan UMKM</dd></div><div><dt>Alur kerja</dt><dd>Brief, peninjauan, konfirmasi, pengerjaan, dan finalisasi</dd></div></dl><a class="news-facts-link" href="/tentang.html">Kenali studio ↗</a></aside><div class="news-article-body">'+paragraphs(item.content)+'<aside class="news-editorial-note"><strong>Informasi pemesanan</strong><p>Pengiriman formulir merupakan permintaan awal. Ruang lingkup, biaya, dan waktu pengerjaan dikonfirmasi sebelum desain dimulai.</p></aside></div></div>'+
 '<footer class="news-article-footer"><div><span class="eyebrow">LANGKAH BERIKUTNYA</span><h2>Butuh materi visual untuk kebutuhanmu?</h2><p>Lihat layanan dan contoh karya terlebih dahulu, lalu kirim brief agar kebutuhan dapat ditinjau dengan jelas.</p></div><div class="news-article-actions"><a class="btn btn-secondary" href="/karya.html">Lihat karya</a><a class="btn btn-primary" href="/pesan.html">Kirim brief</a></div></footer></article></div></section></main>'+
 '<footer class="footer"><div class="container footer-grid"><div><h3 data-site-content="studioName">Tama Andrea Studio</h3><p>Studio desain grafis independen untuk kebutuhan visual personal, sekolah, komunitas, kreator, dan UMKM.</p></div><div class="footer-links"><h4>Studio</h4><a href="/layanan.html">Layanan</a><a href="/karya.html">Karya</a><a href="/berita.html">Berita</a></div><div class="footer-links"><h4>Pesanan</h4><a href="/pesan.html">Pesan desain</a><a href="/pesan.html#tracker">Cek pesanan</a></div><div class="footer-links"><h4>Bantuan</h4><a href="/bantuan.html">FAQ</a><a href="/privasi.html">Privasi</a></div></div><div class="container footer-bottom"><span>© <span id="year"></span> Tama Andrea Studio</span><span>Made in Indonesia</span></div></footer><script src="/js/site.js" defer></script></body></html>';
}
module.exports=async function newsPage(req,res){
 if(req.method!=='GET'&&req.method!=='HEAD'){res.setHeader('Allow','GET, HEAD');res.statusCode=405;res.end('Method not allowed');return;}
 const raw=Array.isArray(req.query&&req.query.slug)?req.query.slug[0]:(req.query&&req.query.slug);
 const slug=String(raw||'').trim().slice(0,180);
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)){res.statusCode=404;res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('X-Robots-Tag','noindex,follow');res.end(req.method==='HEAD'?'':missing());return;}
 try{
  const item=await getArticle(slug);
  if(!item){res.statusCode=404;res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('X-Robots-Tag','noindex,follow');res.end(req.method==='HEAD'?'':missing());return;}
  res.statusCode=200;res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Content-Language','id-ID');res.setHeader('Cache-Control','public, max-age=0, s-maxage=120, stale-while-revalidate=300');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Robots-Tag','index,follow,max-image-preview:large');
  const html=render(item);res.end(req.method==='HEAD'?'':html);
 }catch(error){await safeError(res,error,'api/news-page',req);}
};
