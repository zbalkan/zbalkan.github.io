const assert=require('node:assert/strict'),{test}=require('node:test'),fs=require('node:fs/promises'),{join}=require('node:path'),{createServer}=require('node:http');
const dep=require('node:module').createRequire(join(process.env.TEST_DEPENDENCIES,'package.json'));
const engines=dep('playwright'),esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const source='flowchart TB\n A[Start] --> B[Design]\n A --> C[Implement]\n B --> D[Test]\n C --> D\n D --> E[Review]\n D --> F[Deploy]';
(async()=>{
const script=await fs.readFile('assets/js/mermaid.js','utf8'),css=await fs.readFile('_site/assets/css/main.css','utf8');
const files={'/viewer.js':script,'/mermaid.js':await fs.readFile(join(process.env.TEST_DEPENDENCIES,'node_modules/mermaid/dist/mermaid.min.js'),'utf8'),'/panzoom.js':await fs.readFile(dep.resolve('svg-pan-zoom'),'utf8')};
files['/panzoom.js'] += ';const originalPanZoom = window.svgPanZoom; window.svgPanZoom = function(...args) { const api = originalPanZoom(...args); (window.testViewers ||= []).push(api); return api; };';
const corpus=[];
for(const dir of ['_posts','_pages'])for(const file of await fs.readdir(dir)){
 if(!file.endsWith('.md'))continue;
 const lines=(await fs.readFile(join(dir,file),'utf8')).split(/\r?\n/);let fence;
 for(let i=0;i<lines.length;i++){const m=/^ {0,3}(\x60{3,}|~{3,})(.*)$/.exec(lines[i]);if(!m)continue;
 if(!fence)fence={c:m[1][0],n:m[1].length,start:i+1,diagram:m[2].trim()==='mermaid'};
 else if(m[1][0]===fence.c&&m[1].length>=fence.n&&!m[2].trim()){if(fence.diagram)corpus.push(lines.slice(fence.start,i).join('\n'));fence=undefined;}}
}
await fs.mkdir('test-results',{recursive:true});
const server=createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/main.css'){res.setHeader('Content-Type','text/css');return res.end(css);}
 if(files[u.pathname]){res.setHeader('Content-Type','text/javascript');return res.end(files[u.pathname]);}
 res.setHeader('Content-Type','text/html');res.end('<!doctype html><html data-theme="'+(u.searchParams.has('dark')?'dark':'light')+'"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/main.css"><style>body{margin:0;padding:180px 18px 1600px}.page__content{width:100%;max-width:900px;margin:0 auto}</style></head><body><main class="page__content">'+(u.pathname==='/gallery'?corpus:[source]).map(s=>'<div class="language-mermaid">'+esc(s)+'</div>').join('')+'</main><script src="/mermaid.js"></script><script src="/panzoom.js"></script><script src="/viewer.js"></script></body></html>');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const ready=async p=>{await p.locator('.mermaid-viewer__toolbar').first().waitFor();await p.evaluate(async()=>{await document.fonts.ready;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame)});};
const painted=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const state=async p=>{await painted(p);return p.locator('.svg-pan-zoom_viewport').first().evaluate(g=>{const m=g.getCTM();return {a:m.a,e:m.e,f:m.f};});};
const waitWheel=p=>p.evaluate(async()=>{let last='',stable=0;for(let i=0;i<240;i++){await new Promise(requestAnimationFrame);const next=document.querySelector('.svg-pan-zoom_viewport').getAttribute('transform');stable=next===last?stable+1:0;if(stable>=8)return;last=next;}throw Error('Wheel did not settle');});
const button=(p,a)=>p.locator('button[data-action="'+a+'"]').first();
const anchor=async(p,x,y)=>{await painted(p);return p.locator('.svg-pan-zoom_viewport').first().evaluate((g,p)=>{const q=new DOMPoint(p.x,p.y).matrixTransform(g.getScreenCTM().inverse());return {...p,lx:q.x,ly:q.y};},{x,y});};
const drift=async(p,a)=>{await painted(p);return p.locator('.svg-pan-zoom_viewport').first().evaluate((g,p)=>{const q=new DOMPoint(p.lx,p.ly).matrixTransform(g.getScreenCTM());return {dx:q.x-p.x,dy:q.y-p.y};},a);};
try{for(const name of ['chromium','firefox','webkit'])await test(name,async t=>{
 const browser=await engines[name].launch(),context=await browser.newContext({viewport:{width:1200,height:900}});
 await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 try{
 await t.test('all existing diagrams in light and dark themes',async()=>{
 assert.ok(corpus.length>=22);
 for(const dark of [false,true]){await page.goto(base+'/gallery'+(dark?'?dark':''));await page.waitForFunction(n=>document.querySelectorAll('.mermaid-viewer__toolbar').length===n,corpus.length);assert.equal(await page.locator('.mermaid-viewer > svg').count(),corpus.length);await page.screenshot({path:'test-results/'+name+'-'+dark+'.png'});}
 });
 await t.test('native wheel anchors in/out at offset and scrolled positions',async()=>{
 await page.goto(base);await ready(page);for(let i=0;i<3;i++)await button(page,'in').click();
 for(const scroll of [0,100]){await page.evaluate(y=>window.scrollTo(0,y),scroll);
 for(const [fx,fy,delta]of [[.2,.25,-100],[.2,.25,100],[.8,.75,-180],[.8,.75,180]]){
 const b=await page.locator('.mermaid-viewer > svg').boundingBox(),x=b.x+b.width*fx,y=b.y+b.height*fy,p=await anchor(page,x,y),before=await state(page);
 await page.mouse.move(x,y);await page.mouse.wheel(0,delta);await page.waitForFunction(a=>Math.abs(document.querySelector('.svg-pan-zoom_viewport').getCTM().a-a)>1e-5,before.a);await waitWheel(page);
 const d=await drift(page,p),after=await state(page);assert.ok(Math.abs(d.dx)<2&&Math.abs(d.dy)<2,JSON.stringify({scroll,delta,d}));assert.ok(delta<0?after.a>before.a:after.a<before.a);assert.equal(await page.evaluate(()=>window.scrollY),scroll);
 }}
 const y=await page.evaluate(()=>window.scrollY);await page.mouse.move(5,100);await page.mouse.wheel(0,150);await page.waitForFunction(y=>window.scrollY>y,y);
 });
 await t.test('native mouse drag, release, right button and double click',async()=>{
 await page.goto(base);await ready(page);await button(page,'in').click();
 const b=await page.locator('.mermaid-viewer > svg').boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2,p=await anchor(page,x,y);
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+30,y+20,{steps:5});await page.mouse.up();
 const d=await drift(page,p);assert.ok(Math.abs(d.dx-30)<2&&Math.abs(d.dy-20)<2,JSON.stringify(d));
 const released=await state(page);await page.mouse.move(x+60,y+40);assert.deepEqual(await state(page),released);
 await page.evaluate(()=>document.addEventListener('contextmenu',e=>e.preventDefault()));
 await page.mouse.down({button:'right'});await page.mouse.move(x+40,y+30);await page.mouse.up({button:'right'});assert.deepEqual(await state(page),released);
 await page.mouse.dblclick(x,y);assert.notDeepEqual(await state(page),released);
 });
 await t.test('fit and reset interrupt wheel animation',async()=>{
 await page.goto(base);await ready(page);const fitted=await state(page);
 for(const a of ['fit','reset']){await page.locator('.mermaid-viewer > svg').evaluate((svg,a)=>{const b=svg.getBoundingClientRect();svg.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:-120,clientX:b.left+b.width*.3,clientY:b.top+b.height*.4}));document.querySelector('button[data-action="'+a+'"]').click();},a);await page.evaluate(()=>new Promise(requestAnimationFrame));const immediate=await state(page);await waitWheel(page);assert.deepEqual(await state(page),immediate);if(a==='fit')assert.deepEqual(await state(page),fitted);}
 });
 await t.test('touch pan, stationary and moving pinch, cancellation',async()=>{
 await page.setViewportSize({width:390,height:844});await page.goto(base);await ready(page);
 assert.equal(await page.locator('.mermaid-viewer > svg').evaluate(s=>s.style.touchAction),'pan-y');
 await button(page,'in').click();await button(page,'in').click();await page.waitForFunction(()=>document.querySelector('.mermaid-viewer > svg').style.touchAction==='none');
 const o=await page.locator('.mermaid-viewer > svg').evaluate(async svg=>{
 const tick=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const g=svg.querySelector('.svg-pan-zoom_viewport'),b=svg.getBoundingClientRect(),x=b.left+b.width/2,y=b.top+b.height/2;
 const state=()=>{const m=g.getCTM();return {a:m.a,e:m.e,f:m.f};};
 const send=(type,coords)=>{const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:coords.map(([clientX,clientY])=>({clientX,clientY}))});svg.dispatchEvent(e);};
 await tick();const before=state();send('touchstart',[[x,y]]);send('touchmove',[[x+24,y+16]]);send('touchend',[]);await tick();const panned=state();
 const local=new DOMPoint(x,y).matrixTransform(g.getScreenCTM().inverse());
 send('touchstart',[[x-30,y],[x+30,y]]);send('touchmove',[[x-45,y],[x+45,y]]);await tick();const enlarged=state(),screen=new DOMPoint(local.x,local.y).matrixTransform(g.getScreenCTM());
 send('touchmove',[[x-30,y],[x+30,y]]);await tick();const reduced=state();
 send('touchmove',[[x-20,y+10],[x+40,y+10]]);await tick();const moved=new DOMPoint(local.x,local.y).matrixTransform(g.getScreenCTM());
 send('touchcancel',[]);const cancelled=state();send('touchmove',[[x+60,y+60]]);await tick();
 return {before,panned,enlarged,reduced,drift:{dx:screen.x-x,dy:screen.y-y},moved:{dx:moved.x-x,dy:moved.y-y},cancelled,afterCancel:state()};
 });
 assert.ok(Math.abs(o.panned.e-o.before.e-24)<2&&Math.abs(o.panned.f-o.before.f-16)<2,JSON.stringify(o));
 assert.ok(o.enlarged.a>o.panned.a&&o.reduced.a<o.enlarged.a);
 assert.ok(Math.abs(o.drift.dx)<2&&Math.abs(o.drift.dy)<2,JSON.stringify(o));
 assert.ok(Math.abs(o.moved.dx-10)<2&&Math.abs(o.moved.dy-10)<2,JSON.stringify(o));
 assert.deepEqual(o.afterCancel,o.cancelled);await button(page,'fit').click();assert.equal(await page.locator('.mermaid-viewer > svg').evaluate(s=>s.style.touchAction),'pan-y');
 });
 await t.test('resize after heavy zoom preserves Fit, Reset, limits and wheel anchoring',async()=>{
 await page.setViewportSize({width:1200,height:900});await page.goto(base);await ready(page);
 for(const width of [390,1200,390,1200]){
   await page.evaluate(()=>{const v=window.testViewers[0];const s=v.getSizes();const fit=Math.min(s.width/s.viewBox.width,s.height/s.viewBox.height);v.zoom(v.getZoom()*fit*8/s.realZoom);v.panBy({x:30,y:20});});
   await painted(page);
   await page.setViewportSize({width,height:844});
   await page.waitForFunction(()=>Math.abs(window.testViewers[0].getSizes().width-document.querySelector('.mermaid-viewer > svg').getBoundingClientRect().width)<1);
   await painted(page);
   for(const action of ['reset','fit']){
     if(action==='fit')await button(page,'in').click();
     await button(page,action).click();await painted(page);
     const values=await page.evaluate(()=>{const v=window.testViewers[0],s=v.getSizes();return {actual:s.realZoom,fit:Math.min(s.width/s.viewBox.width,s.height/s.viewBox.height)};});
     assert.ok(Math.abs(values.actual-values.fit)<1e-5,JSON.stringify({width,action,values}));
     assert.equal(await page.locator('.mermaid-viewer > svg').evaluate(s=>s.style.touchAction),'pan-y');
   }
   const limits=await page.evaluate(()=>{const v=window.testViewers[0],s=v.getSizes(),fit=Math.min(s.width/s.viewBox.width,s.height/s.viewBox.height);v.zoom(1e6);const max=v.getSizes().realZoom;v.zoom(1e-6);const min=v.getSizes().realZoom;return{fit,min,max};});
   assert.ok(Math.abs(limits.min/limits.fit-.35)<1e-5,JSON.stringify(limits));
   assert.ok(Math.abs(limits.max/limits.fit-12)<1e-5,JSON.stringify(limits));
   await button(page,'fit').click();await button(page,'in').click();await button(page,'in').click();await painted(page);
   for(const delta of [-100,100]){
     const b=await page.locator('.mermaid-viewer > svg').boundingBox(),x=b.x+b.width*.35,y=b.y+b.height*.4,p=await anchor(page,x,y),before=await state(page);
     await page.mouse.move(x,y);await page.mouse.wheel(0,delta);
     await page.waitForFunction(a=>Math.abs(document.querySelector('.svg-pan-zoom_viewport').getCTM().a-a)>1e-5,before.a);await waitWheel(page);
     const d=await drift(page,p);assert.ok(Math.abs(d.dx)<2&&Math.abs(d.dy)<2,JSON.stringify({width,delta,d}));
   }
 }
 });
 await t.test('wheel direction stays correct outside resized fit limits',async()=>{
 for(const high of [false,true]){
   await page.setViewportSize({width:high?1200:220,height:844});await page.goto(base);await ready(page);
   await page.evaluate(high=>window.testViewers[0].zoom(high?1e6:1e-6),high);await painted(page);
   const original=(await state(page)).a;
   await page.setViewportSize({width:high?220:1200,height:844});await painted(page);await painted(page);
   const resized=await page.evaluate(()=>{const s=window.testViewers[0].getSizes();return {scale:s.realZoom,fit:Math.min(s.width/s.viewBox.width,s.height/s.viewBox.height)};});
   assert.ok(Math.abs(resized.scale-original)<1e-5,JSON.stringify(resized));
   assert.ok(high?resized.scale>resized.fit*12:resized.scale<resized.fit*.35,JSON.stringify(resized));
   await page.locator('.mermaid-viewer').first().scrollIntoViewIfNeeded();
   const b=await page.locator('.mermaid-viewer > svg').boundingBox(),x=b.x+b.width*.3,y=b.y+b.height*.4,p=await anchor(page,x,y);
   await page.mouse.move(x,y);await page.mouse.wheel(0,high?-100:100);await waitWheel(page);
   assert.ok(Math.abs((await state(page)).a-original)<1e-5,'Outward wheel must not reverse direction');
   await page.mouse.wheel(0,high?100:-100);await waitWheel(page);
   const after=(await state(page)).a,d=await drift(page,p);
   assert.ok(high?after<original:after>original,'Wheel toward the fitted range must move gradually');
   assert.ok(Math.abs(d.dx)<2&&Math.abs(d.dy)<2,JSON.stringify(d));
   await page.mouse.wheel(0,high?-100:100);await waitWheel(page);
   assert.ok(Math.abs((await state(page)).a-original)<.002,'Wheel can return to the preserved scale');
   await button(page,'fit').click();await painted(page);
   const limits=await page.evaluate(()=>{const v=window.testViewers[0],s=v.getSizes(),fit=Math.min(s.width/s.viewBox.width,s.height/s.viewBox.height);v.zoom(1e6);const max=v.getSizes().realZoom;v.zoom(1e-6);return {fit,max,min:v.getSizes().realZoom};});
   assert.ok(Math.abs(limits.min/limits.fit-.35)<1e-5&&Math.abs(limits.max/limits.fit-12)<1e-5,JSON.stringify(limits));
 }
 });
 await t.test('clipboard success, denied permission, cleanup, focus and repeat feedback',async()=>{
 await page.goto(base);await ready(page);
 await page.evaluate(()=>{
   Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedText=text;}}});
   document.execCommand=()=>{throw Error('Fallback must not run when Clipboard API succeeds');};
 });

 await button(page,'copy').click();await page.waitForFunction(()=>window.copiedText!==undefined);
 assert.equal(await page.evaluate(()=>window.copiedText),source);
 await page.evaluate(()=>{
   navigator.clipboard.writeText=async()=>{throw Error('Permission denied');};
   document.execCommand=()=>{window.fallbackText=document.querySelector('textarea').value;return true;};
 });
 await button(page,'copy').focus();await button(page,'copy').click();
 await page.waitForFunction(()=>window.fallbackText!==undefined);
 assert.equal(await page.evaluate(()=>window.fallbackText),source);
 assert.equal(await page.locator('textarea').count(),0);
 assert.equal(await button(page,'copy').evaluate(b=>document.activeElement===b),true);
 await page.evaluate(()=>{document.execCommand=()=>{throw Error('Unsupported');};});
 await button(page,'copy').focus();await button(page,'copy').click();
 await page.waitForFunction(()=>document.querySelector('[data-action="copy"]').title==='Copy failed');
 assert.equal(await page.locator('textarea').count(),0);
 assert.equal(await button(page,'copy').evaluate(b=>document.activeElement===b),true);
 await page.evaluate(()=>{document.execCommand=()=>false;});
 await button(page,'copy').click();await painted(page);
 assert.equal(await page.locator('textarea').count(),0);
 await page.evaluate(()=>{document.execCommand=()=>true;});
 await button(page,'copy').click();await page.waitForFunction(()=>document.querySelector('[data-action="copy"]').title==='Copied');
 await button(page,'copy').click();await page.waitForFunction(()=>document.querySelector('[data-action="copy"]').title==='Copy Mermaid source');
 });
 await t.test('compiled syntax token colors match their single intended palette',async()=>{
 const scss=await fs.readFile('assets/css/main.scss','utf8');assert.ok(!scss.includes('\\n.page__content'));
 for(const dark of [false,true]){
   await page.goto(base+(dark?'/?dark':''));await ready(page);
   const colors=await page.evaluate(()=>{
     const group=document.createElement('div');group.className='highlight';group.innerHTML='<span class="nt">tag</span><span class="nb">builtin</span><span class="expected-function" style="color:var(--code-function)">function</span><span class="expected-muted" style="color:var(--code-muted)">muted</span>';document.querySelector('.page__content').append(group);
     return Object.fromEntries([...group.children].map(s=>[s.className,getComputedStyle(s).color]));
   });
   assert.equal(colors.nt,colors['expected-function']);assert.equal(colors.nb,colors['expected-muted']);
 }
 });
 await t.test('fullscreen denied and unsupported',async()=>{
 await page.goto(base);await ready(page);
 if(await button(page,'fullscreen').count()){await page.locator('.mermaid-viewer').evaluate(v=>v.requestFullscreen=()=>Promise.reject(Error('denied')));await button(page,'fullscreen').click();await page.waitForFunction(()=>document.querySelector('[role="status"]').textContent.includes('Fullscreen is unavailable'));}
 const p=await context.newPage();await p.addInitScript(()=>Object.defineProperty(document,'fullscreenEnabled',{value:false}));await p.goto(base);await ready(p);assert.equal(await button(p,'fullscreen').count(),0);await p.close();
 });
 await t.test('initially hidden diagrams initialize when shown',async()=>{
 const p=await context.newPage();
 await p.route(base+'/',async route=>{const response=await route.fetch();const html=await response.text();await route.fulfill({response,body:html.replace('</head>','<style>.page__content{display:none}</style></head>')});});
 await p.goto(base);await p.waitForFunction(()=>document.querySelector('.language-mermaid svg'));
 assert.equal(await p.locator('.mermaid-viewer').count(),0);
 await p.locator('.page__content').evaluate(el=>el.style.display='block');await ready(p);
 const v=await p.evaluate(()=>{const s=window.testViewers[0].getSizes();return {scale:s.realZoom,fit:Math.min(s.width/s.viewBox.width,s.height/s.viewBox.height)};});
 assert.ok(Number.isFinite(v.scale)&&Math.abs(v.scale-v.fit)<1e-5,JSON.stringify(v));await p.close();
 });
 if(name==='chromium'){
 await t.test('native touch pan, pinch both ways, and page scroll at fit',async()=>{
 await page.setViewportSize({width:390,height:844});await page.goto(base);await ready(page);
 const session=await context.newCDPSession(page);await session.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
 const send=(type,points)=>session.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([id,x,y])=>({id,x,y}))});
 try{await button(page,'in').click();await button(page,'in').click();
 const b=await page.locator('.mermaid-viewer > svg').boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2,before=await state(page);
 await send('touchStart',[[1,x,y]]);await send('touchMove',[[1,x+25,y+20]]);await send('touchEnd',[]);assert.notDeepEqual(await state(page),before);
 const start=await state(page);await send('touchStart',[[1,x-25,y],[2,x+25,y]]);await send('touchMove',[[1,x-45,y],[2,x+45,y]]);await send('touchEnd',[]);const enlarged=await state(page);assert.ok(enlarged.a>start.a);
 await send('touchStart',[[1,x-45,y],[2,x+45,y]]);await send('touchMove',[[1,x-30,y],[2,x+30,y]]);await send('touchEnd',[]);assert.ok((await state(page)).a<enlarged.a);
 await button(page,'fit').click();const fitted=await state(page),scroll=await page.evaluate(()=>window.scrollY);
 await send('touchStart',[[1,x,y]]);for(let i=1;i<=5;i++)await send('touchMove',[[1,x,y-i*20]]);await send('touchEnd',[]);await page.waitForFunction(y=>window.scrollY>y,scroll);assert.deepEqual(await state(page),fitted);
 }finally{await session.send('Emulation.setTouchEmulationEnabled',{enabled:false});await session.detach();}
 });
 await t.test('real fullscreen controls and background',async()=>{
 await page.goto(base);await ready(page);await button(page,'fullscreen').click();await page.waitForFunction(()=>document.querySelector('[data-action="fullscreen"]').getAttribute('aria-label')==='Exit fullscreen');
 await painted(page);
 const fitCheck=await page.evaluate(()=>{const v=window.testViewers[0],s=v.getSizes();return {scale:s.realZoom,fit:Math.min(s.width/s.viewBox.width,s.height/s.viewBox.height)};});
 assert.ok(Math.abs(fitCheck.scale-fitCheck.fit)<1e-5,JSON.stringify(fitCheck));
 assert.equal(await button(page,'fullscreen').getAttribute('aria-label'),'Exit fullscreen');const bg=await page.locator('.mermaid-viewer').evaluate(v=>getComputedStyle(v).backgroundColor);assert.doesNotMatch(bg,/rgba\([^)]*,\s*0\)|transparent/);
 await button(page,'in').click();await painted(page);
 const getCenter=()=>page.evaluate(()=>{const v=window.testViewers[0],s=v.getSizes(),p=v.getPan();return {scale:s.realZoom,x:(s.width/2-p.x)/s.realZoom,y:(s.height/2-p.y)/s.realZoom};});
 const before=await getCenter();
 await button(page,'fullscreen').click();await page.waitForFunction(()=>!document.fullscreenElement);await painted(page);
 const after=await getCenter();for(const k of ['scale','x','y'])assert.ok(Math.abs(before[k]-after[k])<.01,JSON.stringify({before,after}));
 });
 }
 assert.deepEqual(errors,[]);
 }finally{await fs.writeFile('test-results/'+name+'-errors.json',JSON.stringify(errors));await context.close();await browser.close();}
});}finally{await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
