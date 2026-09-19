"""One-time integration on an isolated feature branch; not part of review head."""
import hashlib
import json
import re
from pathlib import Path
ROOT=Path.cwd()
def change(path,old,new,count=1):
    p=ROOT/path;s=p.read_text()
    assert s.count(old)==count,(path,old,s.count(old))
    p.write_text(s.replace(old,new))
def blob(path):
    raw=(ROOT/path).read_bytes()
    return hashlib.sha1(f'blob {len(raw)}\0'.encode()+raw).hexdigest()
assert blob('src/data/intelligence.json')=='cf74e8a47acfe2f3236fbdf1330757f263080da6'
assert blob('src/data/thread-links.json')=='92ac40c0e36a26512794bf4baf4ea5f307ad1569'
history=dict(schema_version=1,baseline_blob_sha=blob('src/data/intelligence.json'),baseline_links_blob_sha=blob('src/data/thread-links.json'),baseline_ref='https://github.com/cinic0101/grepsignal/blob/fd1cceb64329fd94ecc50c3c18f60573979437e9/src/data/intelligence.json',initialized_at='2026-09-19T13:00:00Z',initial_thread_review_due_at='2026-09-26T03:30:00Z',events=[])
(ROOT/'src/data/history.json').write_text(json.dumps(history,indent=2)+'\n')
for p in (ROOT/'src').rglob('*'):
    if p.suffix not in {'.astro','.ts'} or p.name in {'intelligence.ts','thread-links.ts','history.json.ts'}:continue
    s=p.read_text()
    s=re.sub(r"(from\s+['\"](?:\.\./)+data/intelligence)\.json(['\"])",r'\1\2',s)
    s=re.sub(r"(from\s+['\"](?:\.\./)+data/thread-links)\.json(['\"])",r'\1\2',s)
    p.write_text(s)
change('scripts/accountability.mjs',"assert(ID.test(e.id) && ID.test(e.record_id) && TYPES[e.record_type]", "assert(typeof e.id === 'string' && typeof e.record_id === 'string' && ID.test(e.id) && ID.test(e.record_id) && Object.hasOwn(TYPES,e.record_type)")
change('scripts/accountability.mjs',"assert(ASSESSMENTS.includes(s.status),'invalid Signal assessment');evidence(s.sources);", "assert(ASSESSMENTS.includes(s.status),'invalid Signal assessment');evidence(s.sources);\n    assert(['capability_delta','cost_intelligence','ecosystem_momentum','platform_shift','second_order_effect'].includes(s.type),'invalid Signal type');")
change('scripts/validate-data.mjs', "import { readFile } from 'node:fs/promises';\n\nconst path = new URL('../src/data/intelligence.json', import.meta.url);\nconst data = JSON.parse(await readFile(path, 'utf8'));", "import { load } from './accountability.mjs';\nconst { data } = load();")
change('scripts/validate-data.mjs',"if (data.schema_version !== 1) fail('schema_version must be 1');","if (data.schema_version !== 2) fail('schema_version must be 2');")
change('scripts/validate-data.mjs','data.stats.material_signals !== data.signals.length',"data.stats.material_signals !== data.signals.filter(x => x.lifecycle === 'active').length")
change('scripts/validate-data.mjs','data.stats.active_threads !== data.threads.length',"data.stats.active_threads !== data.threads.filter(x => x.lifecycle === 'active').length")
change('scripts/validate-data.mjs','data.stats.open_predictions !== data.predictions.length',"data.stats.open_predictions !== data.predictions.filter(x => ['open','unresolved'].includes(x.status) && x.lifecycle === 'active').length")
change('scripts/validate-data.mjs',"['emerging', 'strengthening', 'stable', 'weakening']","['emerging', 'strengthening', 'stable', 'weakening', 'falsified']")
change('scripts/validate-data.mjs','update.date > latest.date','update.date >= latest.date')
p=ROOT/'scripts/validate-thread-links.mjs';s=p.read_text();start=s.index('const fail =');p.write_text("import { load } from './accountability.mjs';\nconst { data: intelligence, links } = load();\n\n"+s[start:])
change('src/layouts/BaseLayout.astro',"import LocalAIStatus from '../components/LocalAIStatus.astro';","import LocalAIStatus from '../components/LocalAIStatus.astro';\nimport RecordHistory from '../components/RecordHistory.astro';")
change('src/layouts/BaseLayout.astro','    <slot />','    <RecordHistory />\n    <slot />')
change('src/layouts/BaseLayout.astro','    <meta property="og:site_name"','    <link rel="alternate" type="application/atom+xml" title="GrepSignal changes" href={`${base}atom.xml`} />\n    <meta property="og:site_name"')
change('src/layouts/BaseLayout.astro','<a href={`${base}editorial/`}>Editorial policy</a>','<a href={`${base}changes/`}>Changes</a>\n          <a href={`${base}editorial/`}>Editorial policy</a>')
change('src/pages/index.astro',"import CoveragePanel from '../components/CoveragePanel.astro';","import CoveragePanel from '../components/CoveragePanel.astro';\nimport PredictionLedger from '../components/PredictionLedger.astro';")
change('src/pages/index.astro','          Structured intelligence on the changes shaping the AI era — connected across time,\n          pushed into second-order effects, and tested through falsifiable predictions.','          Agent infrastructure intelligence: know what is worth remembering,\n          which evidence matters, and which judgments need to change.')
change('src/pages/index.astro','&gt; grep --signal ai-era','&gt; grep --signal agent-infrastructure')
p=ROOT/'src/pages/index.astro';s=p.read_text();start=s.index('      <div class="card" id="predictions">');end=s.index('\n    </section>\n\n    <section class="agent-panel"',start);s=s[:start]+'      <PredictionLedger />\n'+s[end:];s=s.replace('&gt; grep signal --since 7d','&gt; GET data/changes.json').replace('source: structured public intelligence','process sequence &gt; last_seen');p.write_text(s)
for path in ['src/pages/index.astro','src/pages/signals/index.astro','src/pages/threads/index.astro']:
    p=ROOT/path
    if not p.exists():continue
    s=p.read_text().replace('[...intelligence.signals]',"[...intelligence.signals.filter(x => x.lifecycle === 'active')]").replace('intelligence.threads.map(',"intelligence.threads.filter(x => x.lifecycle === 'active').map(").replace('intelligence.threads.length','intelligence.stats.active_threads').replace("  weakening: '↓',","  weakening: '↓',\n  falsified: '×',")
    p.write_text(s)
p=ROOT/'public/schema/intelligence.schema.json';schema=json.loads(p.read_text());old=json.loads(p.read_text());old['$id']=old['$id'].replace('intelligence.schema.json','intelligence-v1.schema.json');(p.parent/'intelligence-v1.schema.json').write_text(json.dumps(old,indent=2)+'\n')
schema['properties']['schema_version']={'const':2}
schema['description']='Pinned legacy snapshot plus accepted events. Lifecycle/history and strict forecasts; inactive records remain in arrays but are excluded from active counters.'
schema['properties']['content_license']={'type':'object','required':['identifier','url','scope']}
schema['properties']['accountability']={'type':'object','required':['baseline_ref','initialized_at','latest_sequence','last_recorded_at']}
schema['required']+=['content_license','accountability']
for kind in ['signals','threads']:
    item=schema['properties'][kind]['items'];item['properties']['status']['enum'].append('falsified')
    item['required']+=['version','lifecycle','superseded_by','first_observed_at','first_public_at','last_reviewed_at','last_changed_at','next_review_at','relations','revision_ids','review_required','history_origin']
    item['properties'].update(version={'type':'integer','minimum':0},lifecycle={'enum':['active','superseded','retracted']},superseded_by={'type':['string','null']},review_required={'type':'boolean'},history_origin={'enum':['legacy_snapshot','journal']},relations={'type':'array'},revision_ids={'type':'array','items':{'type':'string'}})
    for k in ['first_observed_at','first_public_at','last_reviewed_at','last_changed_at','next_review_at','review_due_since']:item['properties'][k]={'type':['string','null'],'format':'date-time'}
schema['properties']['threads']['items']['properties']['updates']['items']['properties']['assessment']['enum'].append('falsified')
schema['properties']['predictions']['items']={'type':'object','required':['id','thread_id','claim','status','created_at','deadline','success_criterion','failure_criterion','initial_probability','insufficient_evidence_policy','resolution_sources','first_public_at','lifecycle','version'],'properties':{'id':{'type':'string'},'thread_id':{'type':'string'},'claim':{'type':'string','minLength':1},'status':{'enum':['unregistered','open','resolved','unresolved']},'lifecycle':{'enum':['active','superseded','retracted']},'created_at':{'type':'string','format':'date-time'},'deadline':{'type':'string','format':'date-time'},'first_public_at':{'type':['string','null'],'format':'date-time'},'initial_probability':{'type':'number','minimum':0,'maximum':1},'insufficient_evidence_policy':{'const':'unresolved'},'success_criterion':{'type':'string','minLength':1},'failure_criterion':{'type':'string','minLength':1},'resolution_sources':{'type':'array','minItems':1,'items':{'type':'string','format':'uri'}},'version':{'type':'integer','minimum':0}},'additionalProperties':True}
p.write_text(json.dumps(schema,indent=2)+'\n')
# Machine-readable event envelope; reducer additionally enforces per-record allowlists and lifecycle invariants.
string={'type':'string','minLength':1};ident={'type':'string','pattern':'^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,95}$'};utc={'type':'string','format':'date-time','pattern':'Z$'};url={'type':'string','format':'uri','pattern':'^https://'}
def obj(props,required=None):return {'type':'object','properties':props,'required':list(props) if required is None else required,'additionalProperties':False}
evidence=obj({'url':url,'publisher':string,'title':string,'role':string,'published_at':{'type':['string','null']}},['url','publisher','title','role'])
event=obj({'id':ident,'record_type':{'enum':['signal','thread','prediction']},'record_id':ident,'expected_version':{'type':'integer','minimum':0},'kind':{'enum':['register','revise','review','supersede','retract','resolve','publication','relate']},'recorded_at':utc,'proposed_by':string,'acceptance':obj({'actor':string,'scope':{'enum':['publication','review']},'reference':url,'accepted_at':utc}),'note':string,'evidence':{'type':'array','items':evidence},'payload':{'type':'object'}})
event['allOf']=[]
for kind,payload in {'review':obj({'outcome':{'enum':['unchanged','inconclusive']},'counterevidence_checked':{'type':'array','minItems':1,'items':string},'next_review_at':utc}),'publication':obj({'first_public_at':utc,'verification_url':url}),'retract':obj({}),'supersede':obj({'superseded_by':ident}),'relate':obj({'target_id':ident,'relationship':{'enum':['supports','challenges','depends_on']},'target_version':{'type':'integer','minimum':0}}),'resolve':obj({'outcome':{'enum':['true','false','unresolved']},'supersedes_resolution':{'type':['string','null']}},['outcome'])}.items():event['allOf'].append({'if':{'properties':{'kind':{'const':kind}}},'then':{'properties':{'payload':payload}}})
hs={'$schema':'https://json-schema.org/draft/2020-12/schema','$id':'https://cinic0101.github.io/grepsignal/schema/history.schema.json','title':'GrepSignal accepted event journal','description':'Structural envelope. Registration/revision allowlists, immutable terms, exact versions and old-prefix invariants are enforced by accountability.mjs/check-history.mjs.',**obj({'schema_version':{'const':1},'baseline_blob_sha':{'type':'string','pattern':'^[0-9a-f]{40}$'},'baseline_links_blob_sha':{'type':'string','pattern':'^[0-9a-f]{40}$'},'baseline_ref':url,'initialized_at':utc,'initial_thread_review_due_at':utc,'events':{'type':'array','items':event}})}
(ROOT/'public/schema/history.schema.json').write_text(json.dumps(hs,indent=2)+'\n')
p=ROOT/'src/pages/agents/index.astro';s=p.read_text();needle='const endpoints = [';assert needle in s;s=s.replace(needle,needle+"\n  { label: 'CHANGES', href: `${base}data/changes.json`, path: '/data/changes.json', description: 'Complete post-migration stream. Filter by sequence, not source publication date.' },\n  { label: 'HISTORY', href: `${base}data/history.json`, path: '/data/history.json', description: 'Accepted events and immutable legacy snapshot reference.' },\n  { label: 'ATOM', href: `${base}atom.xml`, path: '/atom.xml', description: 'Sitewide judgment revisions, corrections and reviews.' },\n  { label: 'HISTORY SCHEMA', href: `${base}schema/history.schema.json`, path: '/schema/history.schema.json', description: 'Versioned event envelope; lifecycle invariants also enforced during build.' },")
s=s.replace('<h2>Recommended flow</h2>','<h2>Recommended flow</h2><p>Intelligence now uses schema v2. Arrays retain withdrawn/replaced records: inspect lifecycle and assessment before recommending them. Version 0 is a legacy snapshot, not complete earlier event history. Save the latest sequence and process each larger sequence; timestamps are not safe cursors. First-publication times remain null until explicitly verified. See Changes and Editorial policy for corrections and reuse.</p>');p.write_text(s)
p=ROOT/'src/pages/sitemap.xml.ts';s=p.read_text().replace("{ loc: absoluteUrl('agents/') },","{ loc: absoluteUrl('agents/') },\n    { loc: absoluteUrl('editorial/') },\n    { loc: absoluteUrl('changes/') },").replace('lastmod: signal.registered_at,','lastmod: signal.last_changed_at?.slice(0,10) ?? signal.registered_at,').replace('  const urls = entries.map','  entries.push(...intelligence.predictions.map(p => ({ loc: absoluteUrl(`predictions/${p.id}/`), lastmod: p.last_changed_at?.slice(0,10) ?? p.created_at.slice(0,10) })));\n\n  const urls = entries.map');p.write_text(s)
p=ROOT/'package.json';package=json.loads(p.read_text());package['scripts']['history:check']='node scripts/check-history.mjs';package['scripts']['history:append']='node scripts/append-history.mjs';package['scripts']['build']='node scripts/check-history.mjs && '+package['scripts']['build'];p.write_text(json.dumps(package,indent=2)+'\n')
p=ROOT/'README.md';p.write_text(p.read_text()+'''\n## Accountability journal (schema v2)\n\n`src/data/intelligence.json` and `thread-links.json` are pinned legacy baselines, **not the current head**. Append accepted events to `src/data/history.json`; `src/data/intelligence.ts` derives pages and the current `/data/intelligence.json`. Never edit baselines to publish a finding. See `docs/accountability.md`.\n\nChanges: `/changes/`, `/data/changes.json`, `/data/history.json`, `/atom.xml`. Migration adds no fake review, correction or forecast. Earlier Thread history stays intact. Unknown first-publication times remain unknown.\n''')
print('Integrated public B/C without rewriting legacy intelligence or adding a source/forecast.')
