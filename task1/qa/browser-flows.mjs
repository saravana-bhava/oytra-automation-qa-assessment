import puppeteer from 'puppeteer-core';
const B = 'https://demo.realworld.show', S = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: 1280, height: 800 });
const alerts = []; p.on('dialog', async d => { alerts.push(d.message()); await d.dismiss(); });
const reqs = []; p.on('response', r => { if (r.url().includes('/api/')) reqs.push(r.request().method() + ' ' + r.status() + ' ' + r.url().replace(/.*\/api/, '')); });
const u = 'qa' + Date.now();

await p.goto(B + '/register', { waitUntil: 'networkidle2' }); await p.waitForSelector('input');
const ins = await p.$$('input'); await ins[0].type(u); await ins[1].type(u + '@example.com'); await ins[2].type('a');
await p.screenshot({ path: 'shots/02-register-weak-password.png' });
await p.click('button[type=submit]'); await S(4000); console.log('after register', p.url());

await p.goto(B + '/editor', { waitUntil: 'networkidle2' }); await p.waitForSelector('input');
const e = await p.$$('input');
await e[0].type('QA test <img src=x onerror=alert(1)>'); await e[1].type('desc');
await p.type('textarea', '<script>alert(1)</script> **bold** [click me](javascript:alert(document.domain)) <img src=x onerror=alert(2)>');
await e[2].type('qa'); await p.keyboard.press('Enter');
await p.click('button.btn-primary'); await S(4000); console.log('after publish', p.url());
await p.screenshot({ path: 'shots/03-xss-article.png', fullPage: true });
console.log('article html:', await p.evaluate(() => document.querySelector('.article-content, .article-page')?.innerHTML.slice(0, 700)));
const js = await p.$$('a[href^="javascript"]'); console.log('js links', js.length);
if (js.length) { await js[0].click().catch(() => {}); await S(1000); }
console.log('alerts fired', alerts);

await p.goto(B + '/editor', { waitUntil: 'networkidle2' }); await p.waitForSelector('input');
const f = await p.$$('input'); await f[0].type('Double submit ' + u); await f[1].type('d'); await p.type('textarea', 'b');
const pb = await p.$('button.btn-primary');
await Promise.all([pb.click(), pb.click(), pb.click()]); await S(4000);
await p.screenshot({ path: 'shots/05-double-submit.png' });
console.log('POST /articles count', reqs.filter(r => /^POST \d+ \/articles$/.test(r)).length);

console.log('localStorage', JSON.stringify(await p.evaluate(() => Object.keys(localStorage))));
await p.goto(B + '/settings', { waitUntil: 'networkidle2' }); await S(1500);
for (const x of await p.$$('button')) { const t = (await x.evaluate(n => n.innerText)).toLowerCase(); if (t.includes('logout') || t.includes('log out')) { await x.click(); break; } }
await S(2000); console.log('after logout url', p.url());

await p.goto(B + '/article/nope-' + u, { waitUntil: 'networkidle2' }); await S(3000);
await p.screenshot({ path: 'shots/04-missing-article.png' });
console.log(reqs.join('\n'));
await b.close();
