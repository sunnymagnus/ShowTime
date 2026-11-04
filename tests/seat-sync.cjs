const {chromium}=require('C:/Users/HI/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');const fs=require('fs');const ts=require('typescript');
const base=process.env.SHOWTIME_TEST_URL||'http://127.0.0.1:5174';
async function until(fn,label){const start=Date.now();while(Date.now()-start<10000){if(await fn())return Date.now()-start;await new Promise(r=>setTimeout(r,100));}throw new Error('Timed out: '+label);}
(async()=>{
 const code=ts.transpileModule(fs.readFileSync('app/catalog.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const c=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64')),show=c.showsFor(c.dayKeys()[1])[11];
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),a=await browser.newContext(),b=await browser.newContext(),one=await a.newPage(),two=await b.newPage(),errors=[];
 for(const p of [one,two]){p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});}
 const url=base+'/?show='+encodeURIComponent(show.id);await Promise.all([one.goto(url,{waitUntil:'networkidle'}),two.goto(url,{waitUntil:'networkidle'})]);
 const state=await (await a.request.get(base+'/api/cinema?show='+encodeURIComponent(show.id))).json(),taken=new Set(state.occupied.map(s=>s.seat));
 const chosen=c.seatsFor(show).filter(s=>!taken.has(s.id)).slice(-2);assert.equal(chosen.length,2);
 const seat=(p,id)=>p.getByRole('button',{name:new RegExp('^Seat '+id+',')});
 await seat(one,chosen[0].id).click();const blockMs=await until(()=>seat(two,chosen[0].id).isDisabled(),'device B sees the first click locked');
 assert.equal(await seat(one,chosen[0].id).getAttribute('aria-pressed'),'true');
 await seat(one,chosen[0].id).click();const freeMs=await until(async()=>!await seat(two,chosen[0].id).isDisabled(),'deselection releases seat on device B');
 await seat(one,chosen[0].id).click();await until(()=>seat(two,chosen[0].id).isDisabled(),'selected again');
 await seat(one,chosen[1].id).click();await until(()=>seat(two,chosen[1].id).isDisabled(),'second click locks the group');
 await one.reload({waitUntil:'networkidle'});await until(async()=>await seat(one,chosen[0].id).getAttribute('aria-pressed')==='true','hold survives reload');
 await one.getByRole('button',{name:'Release hold',exact:true}).click();await until(async()=>!await seat(two,chosen[0].id).isDisabled()&&!await seat(two,chosen[1].id).isDisabled(),'release restores both seats');
 await seat(one,chosen[0].id).click();await until(()=>seat(two,chosen[0].id).isDisabled(),'navigation case starts held');await one.locator('header').getByRole('button',{name:'Movies',exact:true}).click();await until(async()=>!await seat(two,chosen[0].id).isDisabled(),'leaving the seat screen releases hold');
 await seat(two,chosen[0].id).click();await two.getByRole('button',{name:'Review booking',exact:true}).click();await two.getByRole('button',{name:'Confirm free project booking',exact:true}).click();await two.locator('.booking-ticket').first().waitFor();
 await one.goto(url,{waitUntil:'networkidle'});await until(()=>seat(one,chosen[0].id).isDisabled(),'confirmed seat remains unavailable');
 await two.getByRole('button',{name:'Cancel booking',exact:true}).first().click();await two.getByRole('button',{name:'Yes, cancel',exact:true}).click();await until(async()=>!await seat(one,chosen[0].id).isDisabled(),'cancellation restores the seat');
 assert.deepEqual(errors,[]);console.log(`PASS two independent browsers at ${base}: click locks seat (${blockMs}ms observed); deselection frees it (${freeMs}ms); group edits, reload recovery, release, navigation away, confirmation and cancellation synchronize without manual refresh. No page or console errors.`);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
