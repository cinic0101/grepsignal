import test from 'node:test';
import assert from 'node:assert/strict';
import {replay,changesSince,asAtom,safeUrl,timestamp} from '../scripts/accountability.mjs';
const source={url:'https://example.org/report',publisher:'Example',title:'Report',role:'independent_measurement',published_at:'2026-09-19'};
const signal={id:'sig-example',type:'capability_delta',status:'emerging',title:'Example',summary:'Narrow observation',why_it_matters:'A bounded effect',second_order_effect:'Conditional effect',watch_next:'Look for independent measurements',registered_at:'2026-09-19',evidence_since:'2026-09',falsifiers:['Contrary measurement'],limitations:['One task'],sources:[source],source_count:1,source_organization_count:1};
const thread={id:'thread-example',title:'Example',summary:'Bounded thesis',thesis:'A testable thesis',status:'emerging',created_at:'2026-09-19',last_updated:'2026-09-19',evidence_since:'2026-09',signal_count:1,updates:[{id:'rev-old',date:'2026-09-19',assessment:'emerging',change:'Original',signal_ids:['sig-example'],sources:[]}]};
const baseline={schema_version:1,publication_status:'published',canonical_language:'en',generated_at:'2026-09-19T10:00:00Z',signals:[signal],threads:[thread],predictions:[]};
const journal=events => ({schema_version:1,baseline_blob_sha:'0'.repeat(40),baseline_ref:'https://github.com/example/example/blob/commit/data.json',initialized_at:'2026-09-19T12:00:00Z',initial_thread_review_due_at:'2026-09-26T03:30:00Z',events});
const event=(overrides={}) => ({id:'evt-one',record_type:'signal',record_id:'sig-example',expected_version:0,kind:'revise',recorded_at:'2026-09-20T00:00:00Z',proposed_by:'Test agent',acceptance:{actor:'Test editor',scope:'publication',reference:'https://github.com/example/example/pull/1',accepted_at:'2026-09-19T23:00:00Z'},note:'Scope narrowed by independent measurement',evidence:[source],payload:{summary:'Narrower observation',status:'weakening'},...overrides});
const run=es => replay(baseline,journal(es));

test('honest baseline preserves IDs, unknown times and empty new history',()=>{
  const {data,changes}=run([]);
  assert.equal(data.signals[0].id,signal.id);assert.equal(data.signals[0].first_public_at,null);assert.equal(data.signals[0].last_reviewed_at,null);assert.equal(data.signals[0].version,0);assert.equal(data.generated_at,baseline.generated_at);assert.deepEqual(changes,[]);
});
test('revision flags dependent Thread without rewriting original',()=>{
  const {data,changes}=run([event()]);assert.equal(data.signals[0].summary,'Narrower observation');assert.equal(data.threads[0].review_required,true);assert.equal(signal.summary,'Narrow observation');assert.equal(changes[0].sequence,1);
});
test('Thread revision preserves earlier history',()=>{
  const e=event({record_type:'thread',record_id:'thread-example',payload:{status:'weakening'}});
  const {data}=run([e]);assert.equal(data.threads[0].updates.length,2);assert.equal(data.threads[0].updates[0].id,'rev-old');
});
test('review does not change judgment or intelligence publication time',()=>{
  const e=event({kind:'review',record_type:'thread',record_id:'thread-example',payload:{outcome:'unchanged',counterevidence_checked:['Checked original evaluation; no new result'],next_review_at:'2026-09-27T00:00:00Z'}});
  const {data}=run([e]);assert.equal(data.generated_at,baseline.generated_at);assert.equal(data.threads[0].status,'emerging');assert.equal(data.threads[0].last_reviewed_at,e.recorded_at);assert.equal(data.threads[0].last_changed_at,null);
});
test('inconclusive retains dependent warning',()=>{
  const e=event({id:'evt-review',kind:'review',record_type:'thread',record_id:'thread-example',recorded_at:'2026-09-21T00:00:00Z',payload:{outcome:'inconclusive',counterevidence_checked:['Primary data unavailable'],next_review_at:'2026-09-22T00:00:00Z'}});
  assert.equal(run([event(),e]).data.threads[0].review_required,true);
});
for (const [name,mutate] of [
  ['stale version',e=>e.expected_version=3],
  ['missing acceptance',e=>delete e.acceptance],
  ['unknown event field',e=>e.hidden='x'],
  ['raw data',e=>e.payload.raw_text='source body'],
  ['immutable identity',e=>e.payload.id='other'],
  ['missing evidence',e=>e.evidence=[]],
  ['invalid source count',e=>e.payload.source_count=2],
  ['invalid assessment',e=>e.payload.status='certain'],
  ['future acceptance',e=>e.acceptance.accepted_at='2026-10-01T00:00:00Z'],
  ['non-UTC time',e=>e.recorded_at='2026-09-20'],
  ['missing event ID',e=>delete e.id],
]) test(`reject ${name}`,()=>{const e=event();mutate(e);assert.throws(()=>run([e]));});
test('duplicate IDs fail',()=>assert.throws(()=>run([event(),event({expected_version:1})])));
test('time reversal fails',()=>assert.throws(()=>run([event(),event({id:'evt-two',expected_version:1,recorded_at:'2026-09-19T23:30:00Z'})])));
test('retraction keeps record but excludes active count',()=>{const {data}=run([event({kind:'retract',payload:{}})]);assert.equal(data.signals.length,1);assert.equal(data.signals[0].lifecycle,'retracted');assert.equal(data.stats.material_signals,0);});
test('retracted record cannot silently revive',()=>assert.throws(()=>run([event({kind:'retract',payload:{}}),event({id:'evt-two',expected_version:1})])));
test('replacement cannot refer to self',()=>assert.throws(()=>run([event({kind:'supersede',payload:{superseded_by:'sig-example'}})])));
test('relations are typed and version-bound',()=>{const e=event({kind:'relate',payload:{target_id:'thread-example',target_version:0,relationship:'depends_on'}});assert.equal(run([e]).data.signals[0].relations[0].target_id,'thread-example');e.payload.target_version=8;assert.throws(()=>run([e]));});
const prediction={id:'pred-example',thread_id:'thread-example',claim:'The measured condition will occur',created_at:'2026-09-20T00:00:00Z',deadline:'2026-10-01T00:00:00Z',initial_probability:.7,success_criterion:'Original source records a qualifying event',failure_criterion:'Complete original source records none',insufficient_evidence_policy:'unresolved',resolution_sources:[source.url]};
const register=()=>event({id:'evt-register',record_type:'prediction',record_id:prediction.id,kind:'register',payload:prediction});
const publication=()=>event({id:'evt-publish',record_type:'prediction',record_id:prediction.id,expected_version:1,kind:'publication',recorded_at:'2026-09-21T00:00:00Z',payload:{first_public_at:'2026-09-20T01:00:00Z',verification_url:'https://example.org/public-snapshot'}});
const resolution=(outcome='false')=>event({id:'evt-resolve',record_type:'prediction',record_id:prediction.id,expected_version:2,kind:'resolve',recorded_at:'2026-10-02T00:00:00Z',payload:{outcome,supersedes_resolution:null}});
test('unverified prediction excluded from public track record',()=>{const {data}=run([register()]);assert.equal(data.stats.open_predictions,0);assert.equal(data.predictions[0].status,'unregistered');});
test('forecast terms immutable',()=>assert.throws(()=>run([register(),event({id:'evt-rewrite',record_type:'prediction',record_id:prediction.id,expected_version:1,payload:{claim:'Easy replacement'}})])));
test('unverified or late public registration cannot score',()=>{assert.throws(()=>run([register(),resolution()]));const p=publication();p.payload.first_public_at='2026-10-01T01:00:00Z';assert.throws(()=>run([register(),p]));});
test('eligible outcome scores only after deadline',()=>{const {data}=run([register(),publication(),resolution()]);assert.ok(Math.abs(data.predictions[0].brier_score-.49)<1e-10);assert.equal(data.predictions[0].initial_probability,.7);assert.equal(data.stats.open_predictions,0);});
test('deadline does not force decisive resolution',()=>{const {data}=run([register(),publication(),resolution('unresolved')]);assert.equal(data.predictions[0].brier_score,null);assert.equal(data.predictions[0].status,'unresolved');assert.equal(data.stats.open_predictions,1);});
test('early resolution and substitute sources fail',()=>{const e=resolution();e.recorded_at='2026-09-22T00:00:00Z';assert.throws(()=>run([register(),publication(),e]));e.recorded_at='2026-10-02T00:00:00Z';e.evidence=[{...source,url:'https://example.org/other'}];assert.throws(()=>run([register(),publication(),e]));});
test('corrected resolution preserves original outcome',()=>{const e=resolution('true');e.id='evt-correct';e.expected_version=3;e.recorded_at='2026-10-03T00:00:00Z';e.payload.supersedes_resolution='evt-resolve';const p=run([register(),publication(),resolution(),e]).data.predictions[0];assert.equal(p.resolutions.length,2);assert.equal(p.resolutions[0].outcome,'false');assert.ok(Math.abs(p.brier_score-.09)<1e-10);});
test('sequence cursor preserves same-time events; empty Atom valid',()=>{const {changes}=run([event(),event({id:'evt-two',expected_version:1})]);assert.equal(changesSince(changes,1)[0].id,'evt-two');assert.throws(()=>changesSince(changes,-1));const xml=asAtom([],'https://example.org/grepsignal/',journal([]).initialized_at);assert.match(xml,/\/grepsignal\/atom.xml/);assert.doesNotMatch(xml,/<entry>/);});
test('Atom escapes prose',()=>{const xml=asAtom(run([event({note:'A & B < C'})]).changes,'https://example.org/',journal([]).initialized_at);assert.match(xml,/A &amp; B &lt; C/);});
test('credential URLs and bad dates fail',()=>{assert.throws(()=>safeUrl('https://example.org/?api_key=secret'));assert.throws(()=>safeUrl('https://user:pass@example.org/'));assert.throws(()=>timestamp('2026-02-30T00:00:00Z'));});
test('new Thread uses explicit links, and an evidence challenge updates them',()=>{
  const t={...structuredClone(thread),id:'thread-new',signal_relations:{supporting:['sig-example'],contradicting:[]}};
  const add=event({id:'evt-thread',kind:'register',record_type:'thread',record_id:t.id,payload:t});
  const challenge=event({id:'evt-challenge',kind:'relate',record_type:'thread',record_id:t.id,expected_version:1,payload:{target_id:'sig-example',target_version:0,relationship:'challenges'}});
  const {data,links}=run([add,challenge]);assert.deepEqual(links[t.id],{supporting:[],contradicting:['sig-example']});assert.equal(data.threads[1].signal_count,1);
});
test('new known observation time is retained without backdating registration',()=>{
  const s={...structuredClone(signal),id:'sig-new',first_observed_at:'2026-09-19T00:00:00Z'};
  const e=event({id:'evt-new',kind:'register',record_id:s.id,payload:s});
  assert.equal(run([e]).data.signals[1].first_observed_at,s.first_observed_at);
  s.first_observed_at='2027-01-01T00:00:00Z';assert.throws(()=>run([e]));
});
