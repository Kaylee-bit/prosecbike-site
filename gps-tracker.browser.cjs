const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({headless:true});
 const html=fs.readFileSync('gps-tracker.html','utf8');
 for (const scenario of ['success','http','network','timeout','tracking-error']) {
  const page=await browser.newPage();
  let posts=0;
  await page.route('**/*',async route=>{
   if(route.request().url()==='https://example.test/gps-tracker.html') return route.fulfill({contentType:'text/html',body:html});
   if(route.request().url()==='https://formspree.io/f/mdajvwey') {
    posts++;
    if(scenario==='network') return route.abort();
    if(scenario==='timeout') return; // Browser AbortController cancels this mocked request.
    await new Promise(r=>setTimeout(r,150));
    return route.fulfill({status:scenario==='http'?422:200,contentType:'application/json',body:JSON.stringify({ok:scenario!=='http'})});
   }
   return route.abort(); // No analytics, images, fonts or other external requests.
  });
  await page.goto('https://example.test/gps-tracker.html');
  await page.evaluate(scenario=>{
   window.conversions=[];
   window.gtag=(...args)=>{if(scenario==='tracking-error') throw Error('blocked'); window.conversions.push(args);};
   if(scenario==='timeout') {const original=window.setTimeout; window.setTimeout=(fn,ms)=>original(fn,ms===20000?20:ms);}
  },scenario);
  await page.locator('[name=company]').fill('SIMULATION');
  await page.locator('[name=_replyto]').fill('test@example.com');
  await page.locator('[name=message]').fill('Mock request only');
  await page.locator('button[type=submit]').click();
  await page.evaluate(()=>document.querySelector('form').requestSubmit());
  await page.waitForFunction(()=>['success','error'].includes(document.querySelector('form').dataset.state));
  assert.equal(posts,1,scenario+' repeated click');
  const expected=['success','tracking-error'].includes(scenario);
  assert.equal(await page.locator('form').getAttribute('data-state'),expected?'success':'error');
  assert.equal(await page.evaluate(()=>window.conversions.length),scenario==='success'?1:0);
  assert.equal(await page.locator('button[type=submit]').isDisabled(),expected);
  if(expected) {await page.evaluate(()=>document.querySelector('form').requestSubmit()); assert.equal(posts,1);}
  else assert.equal(await page.locator('[name=company]').inputValue(),'SIMULATION');
  await page.close();
  console.log('PASS browser:',scenario);
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
