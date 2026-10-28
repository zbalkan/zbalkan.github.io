const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { createServer } = require('node:http');
const { join, resolve, extname } = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const dep = require('node:module').createRequire(join(process.env.TEST_DEPENDENCIES, 'package.json'));
const { chromium, devices } = dep('playwright');

(async () => {
  const site = resolve('_site');
  const iconUrl = 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.7.2/css/all.min.css';
  const iconCss = await fs.readFile(join(process.env.TEST_DEPENDENCIES, 'node_modules/@fortawesome/fontawesome-free/css/all.min.css'));
  const iconIntegrity = 'sha384-' + createHash('sha384').update(iconCss).digest('base64');
  const vendor = {
    [iconUrl]: iconCss,
    'https://cdn.jsdelivr.net/npm/mermaid@11.12.0/dist/mermaid.min.js': await fs.readFile(join(process.env.TEST_DEPENDENCIES, 'node_modules/mermaid/dist/mermaid.min.js')),
    'https://cdn.jsdelivr.net/npm/svg-pan-zoom@3.6.2/dist/svg-pan-zoom.min.js': await fs.readFile(dep.resolve('svg-pan-zoom'))
  };
  const server = createServer(async (req, res) => {
    try {
      let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (path.endsWith('/')) path += 'index.html';
      const file = resolve(site, '.' + path);
      if (!file.startsWith(site + '/')) throw Error('Invalid path');
      res.setHeader('Content-Type', ({ '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' })[extname(file)] || 'application/octet-stream');
      res.end(await fs.readFile(file));
    } catch {
      res.statusCode = 404;
      res.end('Not found');
    }
  });
  await fs.mkdir('test-results', { recursive: true });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const channel = process.env.PRINT_BROWSER_CHANNEL;
  let browser;
  try {
    browser = await chromium.launch(channel ? { channel } : {});
    console.log(`Article PDF engine: ${channel || 'chromium'} ${browser.version()}`);
    for (const mobile of [false, true]) for (const dark of [false, true]) {
      const context = await browser.newContext(mobile ? devices['Pixel 7'] : { viewport: { width: 1280, height: 900 } });
      try {
        await context.addInitScript(dark => localStorage.setItem('site-theme', dark ? 'dark' : 'light'), dark);
        await context.route('**/*', route => {
          const url = route.request().url();
          if (vendor[url]) return route.fulfill({ contentType: url === iconUrl ? 'text/css' : 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: vendor[url] });
          if (url.startsWith(base) || url.startsWith('https://fonts.googleapis.com/') || url.startsWith('https://fonts.gstatic.com/')) return route.continue();
          return route.abort();
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(base + '/wazuhscatune/');
        const icons = await page.evaluate(() => {
          const link = document.querySelector('link[href*="@fortawesome/fontawesome-free@"]');
          const noscript = [...document.querySelectorAll('noscript')].find(node => node.textContent.includes('@fortawesome/fontawesome-free@'));
          const fallback = new DOMParser().parseFromString(noscript.textContent, 'text/html').querySelector('link');
          const attributes = node => ({ url: node.href, integrity: node.integrity, crossOrigin: node.crossOrigin });
          return { link: attributes(link), fallback: attributes(fallback), loaded: link.sheet !== null };
        });
        assert.deepEqual(icons.link, { url: iconUrl, integrity: iconIntegrity, crossOrigin: 'anonymous' });
        assert.deepEqual(icons.fallback, icons.link);
        assert.ok(icons.loaded, 'The pinned icon stylesheet must pass browser integrity checks');
        const assets = await page.evaluate(() => ({
          css: document.querySelector('link[href*="/assets/css/main.css"]').href,
          js: document.querySelector('script[src*="/assets/js/mermaid.js"]').src
        }));
        const cssVersion = new URL(assets.css).searchParams.get('v');
        assert.ok(cssVersion, 'The stylesheet URL must identify its deployment');
        assert.equal(new URL(assets.js).searchParams.get('v'), cssVersion, 'Viewer script and stylesheet must use the same deployment');
        await page.waitForFunction(() => document.querySelectorAll('.mermaid-print').length === 2);
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all([...document.querySelectorAll('.mermaid-print')].map(image => image.decode()));
        });
        const diagramLabels = await page.locator('.mermaid-viewer > svg').evaluateAll(svgs => svgs.map(svg =>
          [...svg.querySelectorAll('g.edgeLabel')].filter(e => e.textContent.trim()).map(e => ({
            text: e.textContent, box: e.getBoundingClientRect().toJSON()
          }))
        ));
        assert.equal(diagramLabels.length, 2);
        for (const [index, transitionLabels] of diagramLabels.entries()) {
          assert.ok(transitionLabels.length > 1, `Diagram ${index} must expose its edge labels`);
          for (let i = 0; i < transitionLabels.length; i++) for (let j = i + 1; j < transitionLabels.length; j++) {
            const a = transitionLabels[i], b = transitionLabels[j];
            const width = Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left);
            const height = Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.top, b.box.top);
            assert.ok(width <= 0.1 || height <= 0.1, `Overlapping labels in diagram ${index}: ${a.text} / ${b.text}`);
          }
        }
        await page.emulateMedia({ media: 'print' });
        assert.equal(await page.locator('.page__content p').first().evaluate(p => getComputedStyle(p).color), 'rgb(0, 0, 0)');
        const prefix = `test-results/article-${channel || 'chromium'}-${mobile ? 'mobile' : 'desktop'}-${dark ? 'dark' : 'light'}`;
        const layout = await page.locator('.mermaid-viewer-host').evaluateAll(hosts => hosts.map(host => {
          const clips = [];
          for (let ancestor = host; ancestor; ancestor = ancestor.parentElement) {
            const style = getComputedStyle(ancestor), rect = ancestor.getBoundingClientRect();
            const clipX = /^(auto|scroll|hidden|clip)$/.test(style.overflowX);
            const clipY = /^(auto|scroll|hidden|clip)$/.test(style.overflowY);
            if (clipX || clipY) clips.push({
              tag: ancestor.tagName, clipX, clipY,
              left: rect.left + ancestor.clientLeft, top: rect.top + ancestor.clientTop,
              right: rect.left + ancestor.clientLeft + ancestor.clientWidth,
              bottom: rect.top + ancestor.clientTop + ancestor.clientHeight
            });
            if (ancestor.classList.contains('page__content')) break;
          }
          return {
          tag: host.tagName, parent: host.parentElement.tagName,
          host: host.getBoundingClientRect().toJSON(), clips,
          overflow: getComputedStyle(host.parentElement).overflow,
          image: host.querySelector('.mermaid-print').getBoundingClientRect().toJSON(),
          viewerDisplay: getComputedStyle(host.querySelector('.mermaid-viewer')).display
          };
        }));
        await fs.writeFile(prefix + '.json', JSON.stringify({ layout, errors }, null, 2));
        assert.equal(layout.length, 2);
        for (let index = 0; index < 2; index++) {
          const { image, host, clips, viewerDisplay } = layout[index];
          assert.equal(viewerDisplay, 'none');
          assert.ok(image.width > 0 && image.height > 0, `Diagram ${index} must have positive dimensions`);
          assert.ok(image.width <= host.width + 1 && image.left >= host.left - 1 && image.right <= host.right + 1,
            `Diagram ${index} exceeds its host: ${JSON.stringify(layout[index])}`);
          for (const clip of clips) {
            assert.ok(!clip.clipX || (image.left >= clip.left - 1 && image.right <= clip.right + 1),
              `Diagram ${index} is clipped horizontally by ${clip.tag}`);
            assert.ok(!clip.clipY || (image.top >= clip.top - 1 && image.bottom <= clip.bottom + 1),
              `Diagram ${index} is clipped vertically by ${clip.tag}`);
          }
          await page.locator('.mermaid-print').nth(index).screenshot({ path: prefix + `-diagram-${index}.png` });
        }
        // Exercise the browser's own switch into print media during PDF capture.
        await page.emulateMedia({ media: null });
        for (const printBackground of [false, true]) {
          const file = prefix + `-backgrounds-${printBackground}.pdf`;
          await page.pdf({ path: file, format: 'Letter', printBackground, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } });
          const text = execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' });
          await fs.writeFile(file + '.txt', text);
          execFileSync('pdftoppm', ['-scale-to', '1100', '-png', file, file.slice(0, -4)]);
          for (const label of ['Unreviewed', 'NotApplicable', 'ReviewComplete', 'Export', 'source baseline', 'tailored policy', 'import refused', 'loads as a new baseline', 'Neither digest authenticates anything', 'Deploying the tailored policy']) {
            assert.ok(text.replace(/\s+/g, ' ').includes(label), `${file} is missing ${label}`);
          }
        }
        assert.deepEqual(errors, []);
        console.log(`Article print passed: mobile=${mobile}, dark=${dark}`);
      } finally {
        await context.close();
      }
    }
  } finally {
    try {
      if (browser) await browser.close();
    } finally {
      await new Promise(r => server.close(r));
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
