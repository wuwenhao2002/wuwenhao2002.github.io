const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const data = Object.fromEntries(['primitives', 'relationships', 'rules', 'literature', 'sources', 'results', 'redirects', 'papers']
  .map(name => [name, JSON.parse(fs.readFileSync(path.join(root, 'data', name + '.json'), 'utf8'))]));

async function boot({href = 'https://example.org/tcs-ontology/', stored = {}, denyRead = false, denyWrite = false} = {}) {
  const elements = new Map(), downloads = [], writes = [], listeners = {};
  class Element {
    constructor(tag = 'div') {
      this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.attrs = {};
      this.style = {}; this._text = ''; this._value = ''; this.hidden = false; this.disabled = false; this.checked = false;
      this.classList = {toggle() {}, add() {}, remove() {}};
    }
    set id(id) {this._id = id; elements.set(id, this);}
    get id() {return this._id;}
    set textContent(value) {this._text = String(value); this.children = [];}
    get textContent() {return this._text + this.children.map(x => x.textContent).join('');}
    get options() {return this.children;}
    set value(value) {this._value = String(value);}
    get value() {return this._value;}
    append(...children) {
      for (const child of children) {
        this.children.push(child);
        if (this.tagName === 'SELECT' && this.children.length === 1) this._value = child.value;
      }
    }
    replaceChildren(...children) {this.children = []; this._text = ''; this._value = ''; this.append(...children);}
    setAttribute(key, value) {this.attrs[key] = String(value);}
    removeAttribute(key) {delete this.attrs[key];}
    addEventListener(key, callback) {this['on' + key] = callback;}
    scrollIntoView() {}
    focus() {}
    click() {this.onclick?.();}
  }
  for (const match of html.matchAll(/<([a-z]+)\b[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const el = new Element(match[1]); el.id = match[2]; el.checked = /\bchecked\b/.test(match[0]);
  }
  const views = [...elements.values()].filter(el => ['explore', 'compose', 'saved', 'papers', 'sources'].includes(el.id));
  const tabs = views.map(view => {const el = new Element('button');el.dataset.view = view.id;return el;});
  const location = new URL(href);
  class BrowserURL extends URL {
    static createObjectURL(blob) {downloads.push(blob);return 'blob:test';}
    static revokeObjectURL() {}
  }
  const context = {
    URL: BrowserURL, Blob, AbortController, console, location,
    history: {replaceState(_state, _unused, url) {location.href = new URL(url, location.href).href;}},
    localStorage: {
      getItem(key) {if (denyRead) throw new Error('Blocked');return stored[key] ?? null;},
      setItem(key, value) {writes.push({key,value});if (denyWrite) throw new Error('Quota');stored[key] = value;}
    },
    navigator: {clipboard: {async writeText() {}}},
    document: {
      getElementById(id) {return elements.get(id);}, createElement(tag) {return new Element(tag);},
      querySelectorAll(query) {return query === '.view' ? views : tabs;},
      querySelector() {return new Element();}, addEventListener() {}
    },
    fetch: async url => ({ok: true, json: async () => data[url.match(/([^/]+)\.json$/)[1]]}),
    setTimeout() {return 1;},clearTimeout() {}
  };
  context.window = {location,addEventListener(key, callback) {listeners[key] = callback;}};
  vm.runInNewContext(app, context, {filename: 'app.js'});
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(elements.get('loadingState').hidden, true, 'catalog initialized');
  return {elements, location, tabs, downloads, writes, listeners};
}
const change = (e, value) => {e.value = value;e.onchange({target:e});};

test('All review states displays every primitive and persists the filter in the URL', async () => {
  const {elements:e,location} = await boot();
  assert.equal(e.get('reviewFilter').options[0].value, 'all');
  change(e.get('reviewFilter'), 'all');
  assert.equal(e.get('resultCount').textContent, `${data.primitives.items.length} matching / ${data.primitives.items.length} total`);
  assert.equal(location.searchParams.get('review'), 'all');
});

test('catalog links restore valid search, filters and page; reset returns to the reviewed default', async () => {
  const {elements:e,location} = await boot({href:'https://example.org/tcs-ontology/?review=all&page=2'});
  assert.match(e.get('pageNumber').textContent, /^2 \/ /);
  e.get('search').value='congestion';e.get('search').oninput({target:e.get('search')});
  assert.equal(location.searchParams.get('q'),'congestion');
  assert.equal(location.searchParams.has('page'),false);
  const restored=await boot({href:location.href});
  assert.equal(restored.elements.get('search').value,'congestion');
  assert.equal(restored.elements.get('resultCount').textContent,e.get('resultCount').textContent);
  e.get('resetFilters').onclick();
  assert.equal(location.search,'');
  assert.equal(e.get('reviewFilter').value,'source_checked');
});

test('invalid URL filters and out-of-range pages normalize without emptying the catalog', async () => {
  const {elements:e,location}=await boot({href:'https://example.org/tcs-ontology/?kind=missing&area=missing&review=missing&page=999999999999999999999'});
  assert.equal(e.get('kindFilter').value,'');assert.equal(e.get('areaFilter').value,'');
  assert.match(e.get('pageNumber').textContent,/^1 \/ /);
  assert.equal(location.search,'');
});

test('paper and source cards are rendered only when their view is opened',async()=>{
  const {elements:e,tabs,location}=await boot();
  assert.equal(e.get('paperList').children.length,0);assert.equal(e.get('sourceList').children.length,0);
  tabs.find(t=>t.dataset.view==='papers').onclick();
  assert.equal(e.get('paperList').children.length,data.papers.items.length);
  assert.equal(location.searchParams.get('view'),'papers');
  tabs.find(t=>t.dataset.view==='sources').onclick();
  assert.equal(e.get('sourceList').children.length,data.sources.items.length);
});

test('unavailable browser storage retains newly composed ideas for export',async()=>{
  const {elements:e,downloads}=await boot({denyRead:true,denyWrite:true});
  e.get('generateButton').onclick();assert.equal(e.get('saveIdea').disabled,false);
  e.get('saveIdea').onclick();assert.equal(e.get('savedCount').textContent,'1');
  assert.equal(e.get('storageStatus').hidden,false);
  e.get('exportSaved').onclick();
  const exported=JSON.parse(await downloads[0].text());
  assert.equal(exported.items.length,1);assert.equal(typeof exported.items[0].title,'string');
});

test('failed migration preserves valid legacy ideas and corrupt storage is never overwritten',async()=>{
  const legacy={title:'Legacy candidate',rule_id:'old-rule',slots:{problem:'problem.example'}};
  const migrated=await boot({stored:{'tcs-ontology-saved':JSON.stringify([legacy])},denyWrite:true});
  assert.equal(migrated.elements.get('savedCount').textContent,'1');
  migrated.elements.get('exportSaved').onclick();
  assert.equal(JSON.parse(await migrated.downloads[0].text()).items[0].title,legacy.title);
  const corrupt=await boot({stored:{'tcs-ontology-ideas-v2':'broken JSON'}});
  corrupt.elements.get('generateButton').onclick();corrupt.elements.get('saveIdea').onclick();
  assert.equal(corrupt.writes.length,0);assert.equal(corrupt.elements.get('savedCount').textContent,'1');
});

test('legacy primitive hashes resolve to a canonical link and selected details',async()=>{
  const redirect=data.redirects.items[0];
  const {elements:e,location}=await boot({href:'https://example.org/tcs-ontology/#primitive='+encodeURIComponent(redirect.from)});
  assert.equal(location.hash,'#primitive='+encodeURIComponent(redirect.to));
  assert.match(e.get('inspector').textContent,new RegExp(redirect.to.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});


test('switching away from a primitive produces a reloadable view URL', async()=>{
  const id=data.primitives.items[0].id;
  const {tabs,location}=await boot({href:'https://example.org/tcs-ontology/#primitive='+encodeURIComponent(id)});
  tabs.find(t=>t.dataset.view==='papers').onclick();
  assert.equal(location.hash,'');
  const reloaded=await boot({href:location.href});
  assert.equal(reloaded.tabs.find(t=>t.dataset.view==='papers').attrs['aria-current'],'page');
  assert.equal(reloaded.elements.get('paperList').children.length,data.papers.items.length);
});


test('storage events refresh persisted ideas without discarding unsaved session ideas', async()=>{
  const stored={};
  const live=await boot({stored});
  stored['tcs-ontology-ideas-v2']=JSON.stringify([{title:'Another tab',rule_id:'old',slots:{}}]);
  live.listeners.storage({key:'tcs-ontology-ideas-v2'});
  assert.equal(live.elements.get('savedCount').textContent,'1');
  assert.match(live.elements.get('savedList').textContent,/Another tab/);
  const unsaved=await boot({denyWrite:true});
  unsaved.elements.get('generateButton').onclick();unsaved.elements.get('saveIdea').onclick();
  unsaved.listeners.storage({key:'tcs-ontology-ideas-v2'});
  assert.equal(unsaved.elements.get('savedCount').textContent,'1');
  assert.match(unsaved.elements.get('storageStatus').textContent,/both versions/);
});
