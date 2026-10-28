const assert=require('node:assert/strict');
const {createServer}=require('node:http'),fs=require('node:fs/promises'),{join,extname,resolve}=require('node:path');
const dep=require('node:module').createRequire(join(process.env.TEST_DEPENDENCIES,'package.json')),pw=dep('playwright');
(async()=>{
await fs.mkdir('test-results',{recursive:true});
const vendor={
 'https://cdn.jsdelivr.net/npm/mermaid@11.12.0/dist/mermaid.min.js':await fs.readFile(join(process.env.TEST_DEPENDENCIES,'node_modules/mermaid/dist/mermaid.min.js'),'utf8'),
 'https://cdn.jsdelivr.net/npm/svg-pan-zoom@3.6.2/dist/svg-pan-zoom.min.js':await fs.readFile(dep.resolve('svg-pan-zoom'),'utf8')
};
const site=resolve('_site');
const server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');let path=decodeURIComponent(u.pathname);if(path.endsWith('/'))path+='index.html';const file=resolve(site,'.'+path);if(!file.startsWith(site+'/'))throw Error('path');res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'})[extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch(e){res.statusCode=404;res.end('Not found');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const results=[];
try{for(const name of ['chromium','firefox','webkit']){
 const browser=await pw[name].launch(),context=await browser.newContext({viewport:{width:220,height:500},deviceScaleFactor:2,colorScheme:'dark'});
 try {
 await context.addInitScript(()=>{window.layoutViewers=[];let library;Object.defineProperty(window,'svgPanZoom',{configurable:true,get(){return library;},set(fn){library=function(svg,opts){const api=fn(svg,opts);window.layoutViewers.push({svg,api});return api;};}});});
 await context.route('**/*',route=>{const url=route.request().url();if(vendor[url])return route.fulfill({contentType:'text/javascript',body:vendor[url]});if(url.startsWith(base)||url.startsWith('https://fonts.googleapis.com/')||url.startsWith('https://fonts.gstatic.com/'))return route.continue();return route.abort();});
 const page=await context.newPage();
 const settle=()=>page.evaluate(async()=>{await document.fonts.ready;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
 const measure=()=>page.evaluate(()=>window.layoutViewers.map(({svg,api})=>{const g=svg.querySelector('.svg-pan-zoom_viewport'),r=g.getBoundingClientRect(),s=svg.getBoundingClientRect(),z=api.getSizes();return{available:{width:s.width,height:s.height},drawing:{x:r.x-s.x,y:r.y-s.y,width:r.width,height:r.height},scale:z.realZoom,neededFit:Math.min(z.width/z.viewBox.width,z.height/z.viewBox.height),pan:api.getPan(),centerOffset:{x:api.getPan().x+z.realZoom*(z.viewBox.x+z.viewBox.width/2)-z.width/2,y:api.getPan().y+z.realZoom*(z.viewBox.y+z.viewBox.height/2)-z.height/2}};}));
 await page.goto(base+'/wazuhscatune/');await page.waitForFunction(()=>window.layoutViewers.length===2&&document.querySelectorAll('.mermaid-viewer__toolbar').length===2);await settle();
 const initial=await measure();await page.setViewportSize({width:762,height:900});await settle();const widened=await measure();
 for(const item of widened)assert.ok(Math.abs(item.scale-item.neededFit)<1e-5,JSON.stringify(item));
 await page.evaluate(()=>window.layoutViewers.forEach(({api})=>{api.zoomBy(2);api.panBy({x:23,y:17});}));await settle();
 const beforeManual=await page.evaluate(()=>window.layoutViewers.map(({api})=>{const s=api.getSizes(),p=api.getPan();return {scale:s.realZoom,x:(s.width/2-p.x)/s.realZoom,y:(s.height/2-p.y)/s.realZoom};}));
 await page.setViewportSize({width:390,height:844});await settle();
 const afterManual=await page.evaluate(()=>window.layoutViewers.map(({api})=>{const s=api.getSizes(),p=api.getPan();return {scale:s.realZoom,x:(s.width/2-p.x)/s.realZoom,y:(s.height/2-p.y)/s.realZoom};}));
 afterManual.forEach((v,i)=>{for(const key of ['scale','x','y'])assert.ok(Math.abs(v[key]-beforeManual[i][key])<.01,JSON.stringify({beforeManual,afterManual}));});
 for(let i=0;i<2;i++)await page.locator('.mermaid-viewer').nth(i).screenshot({path:'test-results/'+name+'-widened-'+i+'.png'});
 for(let i=0;i<2;i++)await page.locator('.mermaid-viewer').nth(i).locator('[data-action="fit"]').click();await settle();
 for(const size of [{width:844,height:390},{width:390,height:844},{width:762,height:900}]){
   await page.setViewportSize(size);await settle();
   for(const v of await measure()){
     assert.ok(Math.abs(v.scale-v.neededFit)<1e-5,JSON.stringify(v));
     assert.ok(Math.abs(v.centerOffset.x)<.01,JSON.stringify(v));
     assert.ok(Math.abs(v.centerOffset.y)<.01,JSON.stringify(v));
   }
 }
 await page.locator('.mermaid-viewer').first().evaluate(v=>v.style.display='none');await settle();
 await page.locator('.mermaid-viewer').first().evaluate(v=>v.style.removeProperty('display'));await settle();
 await page.locator('.mermaid-viewer').first().evaluate(v=>v.style.width='0px');await settle();
 await page.locator('.mermaid-viewer').first().evaluate(v=>v.style.removeProperty('width'));await settle();
 for(const v of await measure())assert.ok(Number.isFinite(v.scale)&&Math.abs(v.scale-v.neededFit)<1e-5,JSON.stringify(v));
 const refitted=await measure();
 console.log('RESIZE '+JSON.stringify({engine:name,initial,widened,refitted}));results.push({engine:name,initial,widened,refitted});
 await page.setViewportSize({width:1280,height:900});await page.goto(base+'/wazuhscatune/');await page.waitForFunction(()=>window.layoutViewers.length===2);await settle();const covered=[];
 for(let i=0;i<2;i++){
   const viewer=page.locator('.mermaid-viewer').nth(i);await viewer.scrollIntoViewIfNeeded();
   const buttons=await viewer.locator('button').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{action:b.dataset.action,clickable:!!hit&&b.contains(hit),covering:hit?.outerHTML.slice(0,180)};}));
   covered.push({index:i,buttons});assert.ok(buttons.every(b=>b.clickable),JSON.stringify(buttons));
 }
 console.log('OCCLUSION '+JSON.stringify({engine:name,covered}));
 await fs.writeFile('test-results/'+name+'-occlusion.json',JSON.stringify(covered,null,2));
 } finally { await context.close();await browser.close(); }
}}finally{await fs.writeFile('test-results/resize.json',JSON.stringify(results,null,2));await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
