'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('news article URLs use server rendering and only published records',()=>{
 const config=JSON.parse(read('vercel.json'));
 assert.ok(config.rewrites.some(rule=>rule.source==='/berita/:slug'&&rule.destination==='/api/news-page'));
 assert.match(read('api/news-page.js'),/status:'eq\.published'/);
 assert.match(read('api/news-page.js'),/NewsArticle/);
});
test('article output includes canonical, social and structured metadata',()=>{
 const page=read('api/news-page.js');
 assert.match(page,/rel="canonical"/);
 assert.match(page,/og:type/);
 assert.match(page,/twitter:card/);
 assert.match(page,/datePublished/);
 assert.match(page,/const esc=/);
});
test('news sitemap is exposed and linked from robots.txt',()=>{
 const config=JSON.parse(read('vercel.json'));
 assert.ok(config.rewrites.some(rule=>rule.source==='/news-sitemap.xml'&&rule.destination==='/api/news-sitemap'));
 assert.match(read('robots.txt'),/news-sitemap\.xml/);
 assert.match(read('api/news-sitemap.js'),/studio_news/);
});
test('listing cards link to clean article URLs and the one-card layout fills the page',()=>{
 assert.match(read('js/site.js'),/href="\/berita\/'\+slug/);
 assert.match(read('css/news-editorial.css'),/\.ta-news-card:only-child/);
 assert.match(read('css/news-editorial.css'),/\.news-article-layout/);
});
test('home and listing provide descriptive structured metadata',()=>{
 assert.match(read('index.html'),/"@type":"Organization"/);
 assert.match(read('berita.html'),/"@type":"CollectionPage"/);
 assert.match(read('berita.html'),/twitter:card/);
});
