const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(process.env.PAGE || 'gps-tracker.html', 'utf8');
function setup({valid = true, tracking = true} = {}) {
  const status = {textContent: '', dataset: {}};
  const button = {disabled: false, textContent: 'Submit Inquiry'};
  const form = {action: 'https://formspree.io/f/mdajvwey', dataset: {}, reportValidity: () => valid,
    querySelector: () => button, setAttribute() {}, reset() {this.resetCalled = true;}};
  const calls = [], conversions = [];
  let resolve, reject;
  const context = {document: {getElementById: () => status}, FormData: class {}, AbortController,
    setTimeout, clearTimeout,
    fetch: (...args) => {calls.push(args); return new Promise((a,b) => {resolve=a; reject=b;});},
    gtag: tracking ? (...args) => conversions.push(args) : undefined};
  vm.createContext(context);
  const code = html.match(/(?:async )?function handleFormSubmission\([\s\S]*?(?=<\/script>)/)[0];
  vm.runInContext(code, context);
  const event = {currentTarget: form, preventDefault() {this.prevented = true;}};
  return {form, status, button, calls, conversions, event,
    submit: () => context.handleFormSubmission(event),
    resolve: value => resolve(value), reject: error => reject(error)};
}
test('conversion waits for confirmed success; duplicates stay blocked', async () => {
  const s = setup(); const pending = s.submit();
  assert.equal(s.conversions.length, 0);
  assert.equal(s.calls.length, 1); assert.equal(s.event.prevented, true);
  assert.equal(s.button.disabled, true);
  await s.submit(); assert.equal(s.calls.length, 1);
  s.resolve({ok:true, json:async()=>({ok:true})}); await pending;
  assert.equal(s.conversions.length, 1); assert.match(s.status.textContent, /success/i);
  assert.equal(s.conversions[0][2].send_to, 'AW-18223695442/G6yjCJDS0MIcENKM3vFD');
  await s.submit(); assert.equal(s.calls.length,1); assert.equal(s.conversions.length,1);
});
for (const kind of ['http', 'network', 'application', 'invalid-json']) {
  test(kind + ' failure does not convert; allows manual retry', async () => {
    const s=setup(); const pending=s.submit();
    if(kind==='network') s.reject(new Error('offline'));
    else s.resolve({ok:kind!=='http', json:async()=>{if(kind==='invalid-json') throw Error(); return {ok:false};}});
    await pending;
    assert.equal(s.conversions.length,0); assert.equal(s.button.disabled,false);
    assert.match(s.status.textContent,/not.*confirm|failed/i); assert.ok(!s.form.resetCalled);
    const retry=s.submit(); assert.equal(s.calls.length,2);
    s.resolve({ok:true,json:async()=>({ok:true})}); await retry;
    assert.equal(s.conversions.length,1);
  });
}
test('invalid form makes no request or conversion', async()=>{const s=setup({valid:false}); await s.submit(); assert.equal(s.calls.length,0); assert.equal(s.conversions.length,0);});
test('missing analytics does not turn accepted inquiry into failure', async()=>{const s=setup({tracking:false}); const p=s.submit(); s.resolve({ok:true,json:async()=>({ok:true})}); await p; assert.match(s.status.textContent,/success/i);});
test('analytics configuration and accessible status remain wired', () => {
 for(const value of ['AW-18223695442','G-VP60HXP3SM','xaev9gb6g0','https://formspree.io/f/mdajvwey','onsubmit="handleFormSubmission(event)"','role="status"','aria-live="polite"']) assert.ok(html.includes(value),value);
 assert.equal((html.match(/gtag\('event', 'conversion'/g)||[]).length,1);
});
