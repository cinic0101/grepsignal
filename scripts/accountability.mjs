/** Public accepted-event reducer: contracts, never truth or editor identity. */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const TYPES = {signal:'signals', thread:'threads', prediction:'predictions'};
const ASSESSMENTS = ['emerging','strengthening','stable','weakening','falsified'];
const KINDS = ['register','revise','review','supersede','retract','resolve','publication','relate'];
const ID = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,95}$/;
const FORBIDDEN = /^(raw_html|raw_text|source_text|source_body|image_bytes|screenshot|prompt|private_notes|cache_file|secret|token|__proto__|constructor|prototype)$/;
const patchKeys = {
  signal:['title','summary','why_it_matters','second_order_effect','watch_next','status','falsifiers','limitations','sources','source_count','source_organization_count'],
  thread:['title','summary','thesis','status','analysis'],
};
export function assert(ok,message) { if (!ok) throw new Error(`Accountability: ${message}`); }
function text(s) { return typeof s === 'string' && s.trim().length > 0 && s.length <= 10000; }
function exact(o,keys,label) {
  assert(o && typeof o === 'object' && !Array.isArray(o),`${label} must be an object`);
  assert(Object.keys(o).every(k => keys.includes(k)),`${label} has unknown fields`);
}
export function timestamp(s) {
  assert(typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(s) && Number.isFinite(Date.parse(s)),`invalid UTC timestamp ${s}`);
  assert(new Date(s).toISOString().slice(0,19) === s.slice(0,19),`invalid calendar timestamp ${s}`);
  return Date.parse(s);
}
export function safeUrl(s) {
  let u;
  try {u=new URL(s);} catch {throw new Error('Accountability: invalid evidence URL');}
  assert(u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443'),'credential-free HTTPS required');
  assert(![...u.searchParams.keys()].some(k => /token|secret|password|signature|api[_-]?key/i.test(k)),'credential-like URL query');
  return s;
}
function safe(value) {
  if (Array.isArray(value)) return value.forEach(safe);
  if (value && typeof value === 'object') for (const [k,v] of Object.entries(value)) {assert(!FORBIDDEN.test(k),`forbidden field ${k}`);safe(v);}
  if (typeof value === 'string') assert(!/(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|-----BEGIN .*PRIVATE KEY-----)/.test(value),'potential secret');
}
function evidence(xs) {
  assert(Array.isArray(xs),'evidence must be an array');
  for (const x of xs) {
    exact(x,['url','publisher','title','role','published_at','retrieved_at','archive_url','lineage_id'],'evidence');
    assert([x.url,x.publisher,x.title,x.role].every(text),'incomplete evidence');safeUrl(x.url);
    if (x.published_at != null) {
      assert(typeof x.published_at === 'string' && /^\d{4}-\d{2}(?:-\d{2})?$/.test(x.published_at),'source date precision');
      // Validate the known portion without filling missing precision in the record.
      timestamp(`${x.published_at.length === 7 ? x.published_at+'-01' : x.published_at}T00:00:00Z`);
    }
    if (x.retrieved_at != null) timestamp(x.retrieved_at);
    if (x.archive_url != null) safeUrl(x.archive_url);
    if (x.lineage_id != null) assert(typeof x.lineage_id === 'string' && ID.test(x.lineage_id),'invalid evidence lineage_id');
  }
}
function normalizedEvidence(xs) {
  return structuredClone(xs).map(x => ({...x,retrieved_at:x.retrieved_at ?? null,archive_url:x.archive_url ?? null,lineage_id:x.lineage_id ?? null}));
}
function validateProposal(p) {
  exact(p,['actor_type','provider','model_id','model_version','role','run_id','cycle_id'],'proposal');
  assert(['model','human','program'].includes(p.actor_type),'invalid proposal actor_type');
  assert(text(p.role),'proposal role required');
  if (p.actor_type === 'model') assert(text(p.provider),'model proposal provider required');
  if (p.provider != null) assert(text(p.provider),'invalid proposal provider');
  if (p.model_id != null) assert(text(p.model_id),'invalid proposal model_id');
  if (p.model_version != null) assert(text(p.model_version),'invalid proposal model_version');
  if (p.actor_type !== 'model') assert(p.model_id == null && p.model_version == null,'model identifiers require model actor');
  for (const key of ['run_id','cycle_id']) if (p[key] != null) assert(typeof p[key] === 'string' && ID.test(p[key]),`invalid proposal ${key}`);
  return p;
}
function proposalAttribution(value) {
  const chatgpt=/\bchatgpt\b/i.test(value);
  return {actor_type:chatgpt?'model':'unspecified',provider:chatgpt?'OpenAI':null,model_id:null,role:/daily review/i.test(value)?'daily_review':/retrospective/i.test(value)?'retrospective_review':'proposal',display_name:value};
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k,canonical(value[k])]));
  return value;
}
function sha256(value) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}
function publicAcceptanceReceipt(e,sequence,resultingVersion) {
  return {actor_type:/editor/i.test(e.acceptance.actor)?'human_editor':'unspecified',display_name:e.acceptance.actor,scope:e.acceptance.scope,accepted_at:e.acceptance.accepted_at,event_id:e.id,event_sha256:sha256(e),sequence,record_type:e.record_type,record_id:e.record_id,resulting_version:resultingVersion,public_receipt_path:`../changes/#${e.id}`,source_reference:e.acceptance.reference,source_reference_visibility:/\/grepsignal-engine\//.test(e.acceptance.reference)?'private':'public_or_external'};
}
function forecast(p) {
  for (const k of ['claim','success_criterion','failure_criterion']) assert(text(p[k]),`forecast missing ${k}`);
  assert(ID.test(p.thread_id),'forecast needs thread_id');
  assert(timestamp(p.created_at) < timestamp(p.deadline),'forecast horizon');
  assert(typeof p.initial_probability === 'number' && Number.isFinite(p.initial_probability) && p.initial_probability >= 0 && p.initial_probability <= 1,'invalid probability');
  assert(p.insufficient_evidence_policy === 'unresolved','insufficient evidence must remain unresolved');
  assert(Array.isArray(p.resolution_sources) && p.resolution_sources.length > 0,'resolution sources required');
  p.resolution_sources.forEach(safeUrl);
}
export function validateEvent(e) {
  exact(e,['id','record_type','record_id','expected_version','kind','recorded_at','proposed_by','proposal','acceptance','note','evidence','payload'],'event');
  assert(typeof e.id === 'string' && typeof e.record_id === 'string' && ID.test(e.id) && ID.test(e.record_id) && Object.hasOwn(TYPES,e.record_type),'invalid event identity');
  assert(KINDS.includes(e.kind) && Number.isInteger(e.expected_version) && e.expected_version >= 0,'invalid kind/version');
  timestamp(e.recorded_at);assert(text(e.proposed_by) && text(e.note),'proposal attribution/note required');
  if (e.proposal != null) validateProposal(e.proposal);
  exact(e.acceptance,['actor','scope','reference','accepted_at'],'acceptance');
  assert(text(e.acceptance.actor) && ['publication','review'].includes(e.acceptance.scope),'explicit acceptance scope required');
  safeUrl(e.acceptance.reference);
  assert(timestamp(e.acceptance.accepted_at) <= timestamp(e.recorded_at),'acceptance after recording');
  if (e.kind !== 'review') assert(e.acceptance.scope === 'publication','material events require publication acceptance');
  evidence(e.evidence);safe(e);
  assert(e.payload && typeof e.payload === 'object' && !Array.isArray(e.payload),'payload required');
  return e;
}
function bootstrap(r,type,journal) {
  const out=structuredClone(r);
  Object.assign(out,{version:0,lifecycle:'active',superseded_by:null,first_observed_at:null,first_public_at:null,last_reviewed_at:null,last_changed_at:null,next_review_at:type === 'thread' ? journal.initial_thread_review_due_at : null,relations:[],revision_ids:[],review_required:false,history_origin:'legacy_snapshot'});
  out.review_due_since=out.next_review_at;
  return out;
}
export function replay(baseline,journal,baselineLinks=null) {
  exact(journal,['schema_version','baseline_blob_sha','baseline_links_blob_sha','baseline_ref','initialized_at','initial_thread_review_due_at','events'],'journal');
  assert(journal.schema_version === 1 && Array.isArray(journal.events),'journal schema');
  assert(timestamp(journal.initial_thread_review_due_at) > timestamp(journal.initialized_at),'initial due date must be future at initialization');
  safeUrl(journal.baseline_ref);
  const data=structuredClone(baseline);
  data.schema_version=2;
  data.content_license={identifier:'CC-BY-4.0',url:'https://creativecommons.org/licenses/by/4.0/',scope:'Authorized original GrepSignal intelligence only; third-party material excluded.'};
  data.history_schema_version=1;
  const links=structuredClone(baselineLinks ?? Object.fromEntries((baseline.threads ?? []).map(t => [t.id,{supporting:[...new Set(t.updates.flatMap(x => x.signal_ids))],contradicting:[]}])));
  const records=new Map();
  for (const [type,key] of Object.entries(TYPES)) {
    data[key]=(baseline[key] ?? []).map(r => bootstrap(r,type,journal));
    for (const r of data[key]) {assert(!records.has(r.id),'duplicate record ID');records.set(r.id,{type,r});}
  }
  const seen=new Set();const changes=[];let priorTime=timestamp(journal.initialized_at);
  for (const raw of journal.events) {
    const e=validateEvent(raw);assert(!seen.has(e.id),'duplicate event ID');seen.add(e.id);
    assert(timestamp(e.recorded_at) >= priorTime,'journal time reversal');priorTime=timestamp(e.recorded_at);
    const p=e.payload;let item=records.get(e.record_id);
    if (e.kind === 'register') {
      assert(!item && e.expected_version === 0,'record already registered');
      const allowed=e.record_type === 'signal' ? ['id','type','status','title','summary','why_it_matters','second_order_effect','watch_next','source_count','source_organization_count','registered_at','evidence_since','falsifiers','limitations','sources'] : e.record_type === 'thread' ? ['id','title','status','summary','thesis','created_at','last_updated','evidence_since','signal_count','updates','analysis','signal_relations'] : ['id','thread_id','claim','created_at','deadline','success_criterion','failure_criterion','insufficient_evidence_policy','resolution_sources','initial_probability'];
      exact(p,[...allowed,'first_observed_at'],'registration');assert(p.id === e.record_id,'registration ID mismatch');
      if (e.record_type === 'prediction') {
        forecast(p);assert(records.get(p.thread_id)?.type === 'thread','unknown forecast Thread');
        assert(timestamp(p.created_at) <= timestamp(e.recorded_at) && timestamp(e.recorded_at) < timestamp(p.deadline),'registration must precede deadline');
      } else {assert(e.evidence.length > 0,'registration needs evidence');assert(ASSESSMENTS.includes(p.status),'invalid assessment');}
      const r=bootstrap(p,e.record_type,journal);r.history_origin='journal';
      if (e.record_type === 'thread') {
        exact(p.signal_relations,['supporting','contradicting'],'initial Thread relations');
        assert(Array.isArray(p.signal_relations.supporting) && Array.isArray(p.signal_relations.contradicting),'explicit initial Thread relations required');
        links[r.id]=structuredClone(p.signal_relations);delete r.signal_relations;
        r.next_review_at=new Date(timestamp(e.recorded_at)+7*24*60*60*1000).toISOString();r.review_due_since=r.next_review_at;
      }
      if (p.first_observed_at != null) assert(timestamp(p.first_observed_at) <= timestamp(e.recorded_at),'observation cannot be in the future');
      r.first_observed_at=p.first_observed_at ?? null;r.last_changed_at=e.recorded_at;
      if (e.record_type === 'prediction') {r.status='unregistered';r.resolutions=[];r.brier_score=null;}
      data[TYPES[e.record_type]].push(r);item={type:e.record_type,r};records.set(r.id,item);
    } else assert(item && item.type === e.record_type,'unknown record/type');
    const r=item.r;
    let changedFields=null;
    assert(r.version === e.expected_version,'stale expected_version');
    if (r.lifecycle !== 'active') assert(['publication','review'].includes(e.kind),'withdrawn/replaced records cannot silently revive');
    if (e.kind === 'revise') {
      assert(e.record_type !== 'prediction','prediction terms are immutable');
      exact(p,patchKeys[e.record_type],'revision patch');
      assert(Object.keys(p).length > 0 && e.evidence.length > 0,'revision needs changes and evidence');
      if ('status' in p) assert(ASSESSMENTS.includes(p.status),'invalid assessment');
      changedFields=Object.fromEntries(Object.entries(p).filter(([key,value]) => JSON.stringify(canonical(r[key])) !== JSON.stringify(canonical(value))).map(([key,value]) => [key,{before:structuredClone(r[key] ?? null),after:structuredClone(value)}]));
      assert(Object.keys(changedFields).length > 0,'revision must materially change at least one field');
      Object.assign(r,structuredClone(p));r.last_changed_at=e.recorded_at;
      if (e.record_type === 'thread') {
        r.last_updated=e.recorded_at.slice(0,10);
        r.updates.push({id:e.id,date:r.last_updated,assessment:r.status,change:e.note,signal_ids:[],sources:structuredClone(e.evidence)});
      }
    } else if (e.kind === 'review') {
      exact(p,['outcome','counterevidence_checked','next_review_at'],'review');
      assert(['unchanged','inconclusive'].includes(p.outcome),'judgment changes require a revision');
      assert(Array.isArray(p.counterevidence_checked) && p.counterevidence_checked.length > 0 && p.counterevidence_checked.every(text),'counter-evidence work must be recorded');
      assert(timestamp(p.next_review_at) > timestamp(e.recorded_at),'next review must be in the future');
      r.last_reviewed_at=e.recorded_at;r.last_review_outcome=p.outcome;r.next_review_at=p.next_review_at;
      if (p.outcome === 'unchanged') {r.review_required=false;r.review_due_since=p.next_review_at;}
      else r.review_required=true;
    } else if (e.kind === 'supersede') {
      exact(p,['superseded_by'],'supersession');
      assert(p.superseded_by !== r.id && records.get(p.superseded_by)?.type === e.record_type,'replacement must exist and have same type');
      let target=records.get(p.superseded_by).r;const chain=new Set([r.id]);
      while (target) {assert(!chain.has(target.id),'supersession cycle');chain.add(target.id);target=target.superseded_by ? records.get(target.superseded_by)?.r : null;}
      assert(records.get(p.superseded_by).r.lifecycle === 'active','replacement must be active');
      r.lifecycle='superseded';r.superseded_by=p.superseded_by;r.last_changed_at=e.recorded_at;
    } else if (e.kind === 'retract') {
      exact(p,[],'retraction');r.lifecycle='retracted';r.last_changed_at=e.recorded_at;
    } else if (e.kind === 'publication') {
      exact(p,['first_public_at','verification_url'],'publication receipt');safeUrl(p.verification_url);
      assert(r.first_public_at === null,'first publication receipt is immutable');
      assert(timestamp(p.first_public_at) <= timestamp(e.recorded_at),'publication receipt from future');
      if (e.record_type === 'prediction') {
        assert(timestamp(p.first_public_at) >= timestamp(r.created_at) && timestamp(p.first_public_at) < timestamp(r.deadline),'forecast must be public before deadline');r.status='open';
      }
      r.first_public_at=p.first_public_at;r.publication_verification_url=p.verification_url;
    } else if (e.kind === 'resolve') {
      exact(p,['outcome','supersedes_resolution'],'resolution');
      assert(e.record_type === 'prediction' && r.first_public_at !== null,'only publicly registered predictions may resolve');
      assert(timestamp(e.recorded_at) >= timestamp(r.deadline),'deadline has not passed');
      assert(['true','false','unresolved'].includes(p.outcome),'invalid forecast outcome');
      const previous=r.resolutions.at(-1)?.id ?? null;
      assert((p.supersedes_resolution ?? null) === previous,'resolution correction must name previous resolution');
      assert(p.outcome === 'unresolved' || e.evidence.length > 0,'decisive resolution requires evidence');
      if (p.outcome !== 'unresolved') assert(e.evidence.some(x => r.resolution_sources.includes(x.url)),'resolution evidence must include an original allowed resolution source');
      r.status=p.outcome === 'unresolved' ? 'unresolved' : 'resolved';
      r.brier_score=p.outcome === 'unresolved' ? null : (r.initial_probability-(p.outcome === 'true' ? 1 : 0))**2;
      r.resolutions.push({id:e.id,outcome:p.outcome,recorded_at:e.recorded_at,note:e.note,evidence:structuredClone(e.evidence),supersedes_resolution:previous,brier_score:r.brier_score});
      r.last_changed_at=e.recorded_at;
    } else if (e.kind === 'relate') {
      exact(p,['target_id','relationship','target_version'],'relation');
      assert(p.target_id !== r.id && records.has(p.target_id),'relation target must exist');
      assert(records.get(p.target_id).r.version === p.target_version,'relation target version mismatch');
      assert(['supports','challenges','depends_on'].includes(p.relationship) && e.evidence.length > 0,'typed evidence-backed relationship required');
      assert(!r.relations.some(x => x.target_id === p.target_id && x.relationship === p.relationship && x.target_version === p.target_version),'duplicate relationship');
      r.relations.push({...p,source_version:r.version,event_id:e.id,rationale:e.note});r.last_changed_at=e.recorded_at;
      if (e.record_type === 'thread' && records.get(p.target_id).type === 'signal' && p.relationship !== 'depends_on') {
        const relation=links[r.id];
        relation.supporting=relation.supporting.filter(id => id !== p.target_id);
        relation.contradicting=relation.contradicting.filter(id => id !== p.target_id);
        relation[p.relationship === 'supports' ? 'supporting' : 'contradicting'].push(p.target_id);
        r.signal_count=relation.supporting.length+relation.contradicting.length;
        r.last_updated=e.recorded_at.slice(0,10);
        r.updates.push({id:e.id,date:r.last_updated,assessment:r.status,change:e.note,signal_ids:[p.target_id],sources:structuredClone(e.evidence)});
      }
    }
    r.version+=1;r.revision_ids.push(e.id);
    if (['revise','supersede','retract'].includes(e.kind)) for (const {r:other} of records.values()) {
      const linked=other.relations?.some(x => x.target_id === r.id) || other.updates?.some(x => x.signal_ids.includes(r.id)) || other.thread_id === r.id;
      if (other.id !== r.id && linked) other.review_required=true;
    }
    const sequence=changes.length+1;
    const change=structuredClone(e);change.evidence=normalizedEvidence(change.evidence);
    const proposal=e.proposal ? {...structuredClone(e.proposal),display_name:e.proposed_by} : proposalAttribution(e.proposed_by);
    changes.push({...change,sequence,version:r.version,proposal,changed_fields:changedFields,acceptance_receipt:publicAcceptanceReceipt(e,sequence,r.version)});
  }
  for (const s of data.signals) {
    assert(ASSESSMENTS.includes(s.status),'invalid Signal assessment');evidence(s.sources);
    assert(['capability_delta','cost_intelligence','ecosystem_momentum','platform_shift','second_order_effect'].includes(s.type),'invalid Signal type');
    assert(s.sources.length > 0 && s.source_count === s.sources.length && s.source_organization_count === new Set(s.sources.map(x => x.publisher)).size,'source counts inconsistent');
    for (const key of ['id','type','title','summary','why_it_matters','second_order_effect','watch_next','registered_at','evidence_since']) assert(text(s[key]),`missing Signal ${key}`);
    for (const key of ['limitations','falsifiers']) assert(Array.isArray(s[key]) && s[key].length > 0 && s[key].every(text),`missing ${key}`);
  }
  for (const t of data.threads) {
    assert(ASSESSMENTS.includes(t.status),'invalid Thread assessment');
    for (const key of ['title','summary','thesis','created_at','evidence_since']) assert(text(t[key]),`missing Thread ${key}`);
    assert(Array.isArray(t.updates) && t.updates.length > 0,'Thread needs history');
    const linked=new Set(t.updates.flatMap(x => x.signal_ids));
    assert([...linked].every(id => records.get(id)?.type === 'signal'),'unknown Thread signal link');
    const relation=links[t.id];
    assert(relation && Array.isArray(relation.supporting) && Array.isArray(relation.contradicting),'missing Thread relations');
    const ids=[...relation.supporting,...relation.contradicting];
    assert(new Set(ids).size === ids.length && ids.every(id => records.get(id)?.type === 'signal'),'invalid/duplicate Thread relation');
    assert(ids.length === t.signal_count,'Thread signal_count mismatch');
    t.signal_ids=[...ids];t.signal_relations=structuredClone(relation);
    for (const update of t.updates) update.sources=normalizedEvidence(update.sources);
  }
  const signalThreadRelations=new Map(data.signals.map(s => [s.id,[]]));
  for (const t of data.threads) {
    for (const id of t.signal_relations.supporting) signalThreadRelations.get(id)?.push({thread_id:t.id,relationship:'supporting'});
    for (const id of t.signal_relations.contradicting) signalThreadRelations.get(id)?.push({thread_id:t.id,relationship:'contradicting'});
  }
  for (const s of data.signals) {s.sources=normalizedEvidence(s.sources);s.thread_relations=signalThreadRelations.get(s.id) ?? [];s.thread_ids=[...new Set(s.thread_relations.map(x => x.thread_id))];}
  for (const p of data.predictions) {forecast(p);for (const resolution of p.resolutions ?? []) resolution.evidence=normalizedEvidence(resolution.evidence);}
  data.stats={material_signals:data.signals.filter(x => x.lifecycle === 'active').length,active_threads:data.threads.filter(x => x.lifecycle === 'active').length,open_predictions:data.predictions.filter(x => ['open','unresolved'].includes(x.status) && x.lifecycle === 'active').length};
  const lastMaterial=changes.filter(x => !['review','publication'].includes(x.kind)).at(-1);
  if (lastMaterial) data.generated_at=lastMaterial.recorded_at;
  data.accountability={baseline_ref:journal.baseline_ref,initialized_at:journal.initialized_at,latest_sequence:changes.length,last_recorded_at:changes.at(-1)?.recorded_at ?? null};
  return {data,changes,links};
}
export function load(root=pathToFileURL(`${process.cwd()}/`)) {
  const raw=readFileSync(new URL('src/data/intelligence.json',root),'utf8');
  const journal=JSON.parse(readFileSync(new URL('src/data/history.json',root),'utf8'));
  const sha=createHash('sha1').update(`blob ${Buffer.byteLength(raw)}\0`).update(raw).digest('hex');
  assert(sha === journal.baseline_blob_sha,'legacy baseline changed; append an approved history event instead');
  const rawLinks=readFileSync(new URL('src/data/thread-links.json',root),'utf8');
  const linksSha=createHash('sha1').update(`blob ${Buffer.byteLength(rawLinks)}\0`).update(rawLinks).digest('hex');
  assert(linksSha === journal.baseline_links_blob_sha,'legacy Thread links changed; append a relation event instead');
  return replay(JSON.parse(raw),journal,JSON.parse(rawLinks));
}
export function changesSince(changes,after=0) {
  assert(Number.isSafeInteger(after) && after >= 0,'cursor must be a non-negative integer');
  return changes.filter(e => e.sequence > after);
}
export function asAtom(changes,site,initializedAt) {
  const base=new URL(site);assert(['https:','http:'].includes(base.protocol),'invalid feed base');
  const xml=s => String(s).replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const updated=changes.at(-1)?.recorded_at ?? initializedAt;
  const entries=[...changes].reverse().map(e => `<entry><id>urn:grepsignal:change:${xml(e.id)}</id><title>${xml(`${e.kind}: ${e.record_id}`)}</title><updated>${xml(e.recorded_at)}</updated><link href="${xml(new URL(`changes/#${e.id}`,base))}"/><summary>${xml(e.note)}</summary><author><name>GrepSignal</name></author></entry>`).join('');
  return `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><id>${xml(new URL('changes/',base))}</id><title>GrepSignal judgment changes</title><updated>${xml(updated)}</updated><link rel="self" href="${xml(new URL('atom.xml',base))}"/><link href="${xml(base)}"/><author><name>GrepSignal</name></author><subtitle>Approved judgment changes and review records; recorded time is not verified first publication time.</subtitle>${entries}</feed>`;
}
