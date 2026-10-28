const assert=require('node:assert/strict'),{test}=require('node:test'),fs=require('node:fs/promises');
const {join,resolve,extname}=require('node:path'),{createServer}=require('node:http'),{execFileSync}=require('node:child_process');
const dep=require('node:module').createRequire(join(process.env.TEST_DEPENDENCIES,'package.json')),pw=dep('playwright');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
(async()=>{
const script=await fs.readFile('assets/js/mermaid.js','utf8'),css=await fs.readFile('_site/assets/css/main.css','utf8');
const vendor={
 '/mermaid.js':await fs.readFile(join(process.env.TEST_DEPENDENCIES,'node_modules/mermaid/dist/mermaid.min.js'),'utf8'),
 '/panzoom.js':await fs.readFile(dep.resolve('svg-pan-zoom'),'utf8')
};
const corpus=[];
for(const dir of ['_posts','_pages'])for(const file of await fs.readdir(dir)){
 if(!file.endsWith('.md'))continue;
 const lines=(await fs.readFile(join(dir,file),'utf8')).split(/\r?\n/);let fence;
 for(let i=0;i<lines.length;i++){const m=/^ {0,3}(\x60{3,}|~{3,})(.*)$/.exec(lines[i]);if(!m)continue;
 if(!fence)fence={c:m[1][0],n:m[1].length,start:i+1,diagram:m[2].trim()==='mermaid'};
 else if(m[1][0]===fence.c&&m[1].length>=fence.n&&!m[2].trim()){if(fence.diagram)corpus.push(lines.slice(fence.start,i).join('\n'));fence=undefined;}}
}
const fixtures=[
 'flowchart LR\n'+Array.from({length:12},(_,i)=>`N${i}[Wide step ${i}] --> N${i+1}[Wide step ${i+1}]`).join('\n'),
 'flowchart TB\n'+Array.from({length:24},(_,i)=>`T${i}[Tall step ${i}] --> T${i+1}[Tall step ${i+1}]`).join('\n'),
 'flowchart TD\n A[HTML label<br/>second line] --> B[Complete diagram]',
 'flowchart LR\n A[Animated start] e1@--> B[Animated finish]\n e1@{ animation: fast }'
];
const site=resolve('_site');await fs.mkdir('test-results',{recursive:true});
const server=createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/main.css'){res.setHeader('Content-Type','text/css');return res.end(css);}
 if(vendor[u.pathname]){res.setHeader('Content-Type','text/javascript');return res.end(vendor[u.pathname]);}
 if(u.pathname==='/viewer.js'){
   res.setHeader('Content-Type','text/javascript');
   const prefix=u.searchParams.has('fallback')?`const realRun=mermaid.run;mermaid.run=async(...args)=>{await realRun(...args);mermaid.render=async()=>{throw Error('Test light render failure');};};`:'';
   return res.end(prefix+script);
 }
 if(u.pathname==='/fixture'){
   const sources=u.searchParams.has('gallery')?corpus:fixtures;
   res.setHeader('Content-Type','text/html');return res.end('<!doctype html><html data-theme="'+(u.searchParams.has('dark')?'dark':'light')+'"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/main.css"><style>body{display:block;margin:0;padding:20px}.page__content{width:100%;max-width:900px;margin:0 auto}</style></head><body><main class="page__content"><h1>Print verification</h1>'+sources.map(s=>'<div class="language-mermaid">'+esc(s)+'</div>').join('')+'</main><script src="/mermaid.js"></script><script src="/panzoom.js"></script><script src="/viewer.js'+(u.searchParams.has('fallback')?'?fallback':'')+'"></script></body></html>');
 }
 let path=decodeURIComponent(u.pathname);if(path.endsWith('/'))path+='index.html';const file=resolve(site,'.'+path);
 if(!file.startsWith(site+'/'))throw Error('Invalid path');
 res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'})[extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));
}catch{res.statusCode=404;res.end('Not found');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const painted=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const ready=async(p,n)=>{await p.waitForFunction(n=>document.querySelectorAll('.mermaid-viewer__toolbar').length===n,n);await p.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('.mermaid-print')].map(i=>i.decode()));});await painted(p);};
const state=p=>p.evaluate(()=>[...document.querySelectorAll('.mermaid-viewer > svg')].map(s=>{const m=s.querySelector('.svg-pan-zoom_viewport').getCTM();return {a:m.a,e:m.e,f:m.f};}));
try{for(const name of ['chromium','firefox','webkit'])await test(name,async t=>{
 const browser=await pw[name].launch(),context=await browser.newContext({viewport:{width:1280,height:900}});
 await context.addInitScript(()=>{localStorage.setItem('site-theme','dark');window.printViewers=[];let library;Object.defineProperty(window,'svgPanZoom',{configurable:true,get(){return library;},set(fn){library=(...args)=>{const api=fn(...args);window.printViewers.push(api);return api;};}});});
 await context.route('**/*',r=>{const url=r.request().url();if(url.includes('cdn.jsdelivr.net/npm/mermaid@11.12.0/'))return r.fulfill({contentType:'text/javascript',body:vendor['/mermaid.js']});if(url.includes('cdn.jsdelivr.net/npm/svg-pan-zoom@3.6.2/'))return r.fulfill({contentType:'text/javascript',body:vendor['/panzoom.js']});if(url.startsWith(base)||url.startsWith('https://fonts.googleapis.com/')||url.startsWith('https://fonts.gstatic.com/'))return r.continue();return r.abort();});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
 t.beforeEach(()=>page.emulateMedia({media:'screen'}));
 try{
 await t.test('all diagram types have isolated complete print images in both themes',async()=>{
   assert.ok(corpus.length>=22);
   for(const dark of [false,true]){
     await page.goto(base+'/fixture?gallery'+(dark?'&dark':''));await ready(page,corpus.length);
     const info=await page.locator('.mermaid-print').evaluateAll(images=>images.map(image=>{const s=new DOMParser().parseFromString(decodeURIComponent(image.src.split(',')[1]),'image/svg+xml').documentElement;return {display:getComputedStyle(image).display,width:image.naturalWidth,height:image.naturalHeight,viewBox:s.getAttribute('viewBox'),viewport:s.querySelector('.svg-pan-zoom_viewport')!==null,background:s.firstElementChild.getAttribute('fill')};}));
     assert.equal(info.length,corpus.length);for(const item of info){assert.equal(item.display,'none');assert.ok(item.width>0&&item.height>0&&item.viewBox);assert.equal(item.viewport,false);assert.equal(item.background,'#fff');}
     assert.equal(await page.locator('[id^="mermaid-print-"]').count(),0,'Print SVG IDs stay inside the image document');
     await page.emulateMedia({media:'print'});await painted(page);
     assert.equal(await page.locator('.mermaid-viewer').first().isVisible(),false);
     assert.equal(await page.locator('.mermaid-print').first().isVisible(),true);
     await page.screenshot({path:`test-results/${name}-print-gallery-${dark}.png`,fullPage:true});
     await page.emulateMedia({media:'screen'});await painted(page);
   }
 });
 await t.test('repeated print and cancel preserve zoom, pan and pristine images',async()=>{
   for(const dark of [false,true]){
     await page.goto(base+'/fixture'+(dark?'?dark':''));await ready(page,fixtures.length);
     await page.evaluate(()=>window.printViewers.forEach(v=>{v.zoomBy(2.5);v.panBy({x:37,y:-23});}));await painted(page);
     const before=await state(page),sources=await page.locator('.mermaid-print').evaluateAll(images=>images.map(i=>i.src));
     for(let repeat=0;repeat<3;repeat++){
       await page.emulateMedia({media:'print'});await painted(page);
       const layout=await page.locator('.mermaid-print').evaluateAll(images=>images.map(i=>{const r=i.getBoundingClientRect();return {width:r.width,height:r.height,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,available:i.parentElement.getBoundingClientRect().width,display:getComputedStyle(i).display};}));
       for(const item of layout){assert.equal(item.display,'block');assert.ok(item.width>0&&item.width<=item.available+1&&item.width<=item.naturalWidth+1);assert.ok(item.height>0&&item.height<=721&&item.height<=item.naturalHeight+1);}
       assert.equal(await page.locator('.mermaid-viewer__toolbar').first().isVisible(),false);
       await page.emulateMedia({media:'screen'});await painted(page);await painted(page);
       const after=await state(page);after.forEach((v,i)=>{for(const key of ['a','e','f'])assert.ok(Math.abs(v[key]-before[i][key])<.01,JSON.stringify({before,after}));});
       assert.deepEqual(await page.locator('.mermaid-print').evaluateAll(images=>images.map(i=>i.src)),sources);
     }
   }
 });
 await t.test('real article uses full printable width and preserves screen viewer state',async()=>{
   await page.goto(base+'/wazuhscatune/');await ready(page,2);
   await page.evaluate(()=>window.printViewers.forEach(v=>{v.zoomBy(3);v.panBy({x:40,y:20});}));await painted(page);const before=await state(page);
   await page.emulateMedia({media:'print'});await painted(page);
   assert.equal(await page.locator('.sidebar__right').isVisible(),false);
   assert.equal(await page.locator('.page__content').evaluate(e=>getComputedStyle(e).paddingInlineEnd),'0px');
   const colors=await page.evaluate(()=>({scheme:getComputedStyle(document.documentElement).colorScheme,text:getComputedStyle(document.querySelector('.page__content p')).color,background:getComputedStyle(document.querySelector('#main')).backgroundColor,token:getComputedStyle(document.documentElement).getPropertyValue('--code-text').trim()}));
   assert.equal(colors.scheme,'light');assert.equal(colors.text,'rgb(0, 0, 0)');assert.equal(colors.background,'rgb(255, 255, 255)');assert.equal(colors.token,'#273449');
   await page.screenshot({path:`test-results/${name}-article-print.png`,fullPage:true});
   await page.emulateMedia({media:'screen'});await painted(page);await painted(page);
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark');
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('.page__content p')).color==='rgb(241, 245, 249)');
   assert.equal(await page.locator('.page__content p').first().evaluate(e=>getComputedStyle(e).color),'rgb(241, 245, 249)');
   const after=await state(page);after.forEach((v,i)=>{for(const key of ['a','e','f'])assert.ok(Math.abs(v[key]-before[i][key])<.01,JSON.stringify({before,after}));});
 });
 await t.test('failed light rendering keeps a complete readable original print image',async()=>{
   await page.goto(base+'/fixture?dark&fallback');await ready(page,fixtures.length);
   const backgrounds=await page.locator('.mermaid-print').evaluateAll(images=>images.map(i=>new DOMParser().parseFromString(decodeURIComponent(i.src.split(',')[1]),'image/svg+xml').documentElement.firstElementChild.getAttribute('fill')));
   assert.deepEqual(backgrounds,fixtures.map(()=>'#333'));
 });
 await t.test('initialization during printing defers only the interactive viewers',async()=>{
   await page.emulateMedia({media:'print'});await page.goto(base+'/fixture?dark');
   await page.waitForFunction(n=>document.querySelectorAll('.mermaid-print').length===n,fixtures.length);
   await page.evaluate(()=>Promise.all([...document.querySelectorAll('.mermaid-print')].map(i=>i.decode())));await painted(page);
   assert.equal(await page.locator('.mermaid-viewer').count(),0);
   assert.equal(await page.locator('.mermaid-screen').first().isVisible(),false);
   assert.equal(await page.locator('.mermaid-print').first().isVisible(),true);
   await page.emulateMedia({media:'screen'});await ready(page,fixtures.length);
   assert.equal(await page.locator('.mermaid-viewer').first().isVisible(),true);
 });
 await t.test('animated screen edges become still print images',async()=>{
   await page.goto(base+'/fixture?dark');await ready(page,fixtures.length);
   const animation=await page.locator('.mermaid-viewer').last().locator('.flowchart-link').first().evaluate(e=>getComputedStyle(e).animationName);
   assert.notEqual(animation,'none','The fixture must animate on screen');
   await page.emulateMedia({media:'print'});await painted(page);
   const image=page.locator('.mermaid-print').last(),first=await image.screenshot({animations:'allow'});
   await page.waitForTimeout(150);const second=await image.screenshot({animations:'allow'});
   assert.equal(Buffer.compare(first,second),0,'Printed animation frames must be identical');
 });
 if(name==='chromium')await t.test('PDF output on A4, Letter and landscape paper',async()=>{
   for(const dark of [false,true])for(const [format,landscape]of [['A4',false],['Letter',false],['A4',true]]){
     await page.goto(base+'/fixture'+(dark?'?dark':''));await ready(page,fixtures.length);
     await page.evaluate(()=>window.printViewers.forEach(v=>{v.zoomBy(4);v.panBy({x:80,y:-60});}));await painted(page);const before=await state(page);
     const file=`test-results/print-${dark}-${format}-${landscape}.pdf`;
     await page.emulateMedia({media:'print'});await painted(page);
     assert.equal(await page.locator('.mermaid-viewer').first().isVisible(),false);
     await page.pdf({path:file,format,landscape,printBackground:false,margin:{top:'12mm',bottom:'12mm',left:'12mm',right:'12mm'}});
     assert.ok((await fs.stat(file)).size>5000);await page.emulateMedia({media:'screen'});await painted(page);await painted(page);
     const after=await state(page);after.forEach((v,i)=>{for(const key of ['a','e','f'])assert.ok(Math.abs(v[key]-before[i][key])<.01);});
     const text=execFileSync('pdftotext',[file,'-'],{encoding:'utf8'});await fs.writeFile(file+'.txt',text);
     for(const label of ['Wide step 0','Wide step 12','Tall step 0','Tall step 24','HTML label','Complete diagram'])assert.ok(text.includes(label),`${file} is missing ${label}`);
     execFileSync('pdftoppm',['-scale-to','1400','-png',file,file.replace('.pdf','')]);
   }
 });
 assert.deepEqual(errors,[]);
 }finally{await context.close();await browser.close();}
});}finally{await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
