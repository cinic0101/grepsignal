/** Public accepted-event reducer: contracts, never truth or editor identity. */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const TYPES = {signal:'signals', thread:'threads', prediction:'predictions'};
const ASSESSMENTS = ['emerging','strengthening','stable','weakening','falsified'];
const THESIS_EFFECTS = ['unchanged','strengthened','weakened','revised','falsified'];
const THREAD_REVIEW_INTERVAL_MS = 7*24*60*60*1000;
// Frozen compatibility boundary: exact accepted event prefixes at public 7b688e3.
// Never extend/regenerate this list for new events. It preserves published snapshots,
// not permission to clear future warnings. Prefix binding rejects copied IDs, changed
// payloads, inserted events and timestamp-based attempts to claim legacy behavior.
const LEGACY_THREAD_REVIEW_PREFIXES = new Map([
  [2,'037c996bd9608b6dffb779c798b9a18ca9e677ede114f659cc98b4b5a9e86129'], // evt-thread-decision-native-runtimes-2026-09-20
  [3,'d09e009456ace7653c6df24f1782f53caf8b15b4e1107a7207c62db34801c92b'], // evt-thread-research-automation-bottlenecks-2026-09-21
  [4,'4f10187d7b6b2f65844232541abd724f64cc508bed53a06a2df208b64f69f19b'], // evt-thread-research-automation-analysis-2026-09-21
  [7,'2430deb867ff09e4a6913d59736d23253931ad8f1a3caec35d877f7b9d95c365'], // evt-thread-agent-runtime-containment-2026-09-22
  [8,'075f0dba89ca095c24d3aa39a1c95c39b2b9df5d6774ca7de04ce5f8086276db'], // evt-thread-research-automation-bottlenecks-2026-09-22
  [11,'a7b7bce431d58a81fbd8606d48e08617449ab40e2e3a8bd21a6a8060f528cbfc'], // evt-thread-decision-native-runtimes-2026-09-23
  [12,'fa7da2c4f2e3c963f2fee7e782b2a2011a0da9f3c692a57a7b9d899bc8e4e961'], // evt-thread-open-weight-capability-cost-frontier-2026-09-23
  [13,'b7abb103cf85313508983c9449b33cb2932c139a132eeb249e7226f051d56f4e'], // evt-thread-open-weight-capability-cost-frontier-boundary-2026-09-23
  [14,'957ee7c91e43e231b4fa31d96a7321a9d4d70ff2fb9afb1ba35340bb765d3469'], // evt-thread-research-automation-bottlenecks-challenge-readiness-2026-09-23
  [15,'35be81a99bcaf30772b921066b4308baadd999715487589fecaefbbdf9fa73d1'], // evt-thread-agent-runtime-containment-challenge-readiness-2026-09-23
  [17,'7dbbcc820470dcd7d62fa965e279697c5207c4c9b2612c63a316cd0e025d9484'], // evt-thread-research-automation-bottlenecks-self-improvement-2026-09-23
  [20,'d539253e0aff6151b5cd78aa015c929e6504b15f164b68aeff451eefc03bf27e'], // evt-thread-agent-runtime-containment-plugin-supply-chain-2026-09-23
  [24,'519fcd22395eebcc85696e61233fbbffdec9cce81a29a12c8dbd149b88800c51'], // evt-thread-decision-native-runtimes-boundary-economics-2026-09-24
  [25,'177c34e942b513a83c2542a845cbca4910c195062b8b129ba6e95765e6853e85'], // evt-thread-research-automation-bottlenecks-enzyme-search-2026-09-24
  [26,'720576cea3f4ccf1dda1bf8ab81f21b3c8f9f91e69ae0faa029b62b416eeb5b5'], // evt-thread-agent-runtime-containment-agent-probing-2026-09-25
  [27,'21db31e77ed7ae77c8e7d3e15c689416ed87821e51a67458fb1d7f4fddedf0bd'], // evt-thread-decision-native-runtimes-workflow-adoption-2026-09-25
  [28,'f104b40f90cefc53c6ee290f816ef9e6100c95eecc07c92d7b9524f6a862f27d'], // evt-thread-research-automation-bottlenecks-security-auditing-2026-09-25
  [29,'212069d36a378d6bcd604aad404ccd95dd5e21890c06086dca067fbf3d5200dd'], // evt-thread-agent-runtime-containment-loopjacking-2026-09-26
  [30,'c59510bc6f47ede1c8a0a7bf4b4bf4dcc2aebccbccdd7a8dd2fc27b10b356df7'], // evt-thread-agent-runtime-containment-dns-escape-2026-09-27
  [31,'daa897893d15fcc8c71e382a38c13dbc8103a1ea2ccd5e8a9fc97d9faba3aa4f'], // evt-thread-decision-native-runtimes-glm-interface-2026-09-27
  [32,'1ed12448c28df904d468b7756122766b4d67c814c285ea4a9c9c23cd23e8b7d4'], // evt-thread-agent-harness-economics-agent-native-interfaces-2026-09-29
  [33,'8c7df27930b63fccc52bf45a843fa4363e626db7d6e709ceab1457fd08585f16'], // evt-thread-agent-runtime-containment-productization-2026-09-29
  [34,'90833c174a969b436f1287f898545993a5888a78d21313fd979f5856978c4102'], // evt-thread-open-weight-capability-cost-frontier-closed-efficiency-2026-09-29
  [38,'068cb0dea001d39ab4b89c6204360f71390e6ba6a9cc7edff9aff9e8f94fa6da'], // evt-thread-agent-runtime-containment-semantic-authorization-2026-09-29
  [39,'2111a9d3f0599799fb67fade4e97b76f244b9c6c7b2764795dd0c9e4466ee1b5'], // evt-thread-decision-native-runtimes-jev-27b-2026-09-29
  [52,'c47dda4fe8b261d2c0c3f6b64af8630e540d5ebee705dc2014c4181e41d62e9b'], // evt-thread-decision-native-runtimes-decisions-api-2026-09-30
  [54,'92138d0d3e9cffc9cb511c6768ff55fdca3f1777cc71779d158a2603ba870f85'], // evt-thread-agent-harness-economics-managed-agents-api-2026-09-30
  [55,'846d089849d8b5de0500af726527e6d8b8c5392188ce24be8cd24065e0f29e13'], // evt-thread-agent-runtime-containment-egress-semantics-2026-09-30
  [57,'12f4b979fcbd0e2743ee81a5659b3458ec2e0effc6aafee5c82d5fd961aef207'], // evt-thread-agent-runtime-containment-argon-controls-2026-10-01
  [58,'1822f4db58e8433a0e3752ba6624b9ba5a8d8228cc70654fb7e6a8c9f2f8e6bc'], // evt-thread-decision-native-runtimes-pi-jev-codemode-2026-10-01
  [59,'7b358e2a2d55482f4553b34b5052804e0346c64f62a10d47fcda08d40fb696bf'], // evt-thread-research-automation-bottlenecks-argon-engineering-2026-10-01
  [60,'64c1b0ebcc39e24e47a33566d942bf3cebc0eb48614a871b7713e81c2efc3e10'], // evt-thread-offensive-cyber-economics-glm53-supplement-2026-10-01
  [61,'7ce9bb72e266710fe5f698d2d5a297e1f4ec1374f9d36c75269c2f89728879d1'], // evt-thread-agent-harness-economics-pi-codemode-2026-10-01
  [71,'8636ab053e4a85ca480ff048c91a76cad471416feaa8f6e008142b79a5cc6c33'], // evt-thread-agent-runtime-containment-apple-consent-2026-10-04
  [73,'ff57ffda4d8b563d8cef47d92a7d9acabb3e3e8feecf955deae8acc6e3d9982d'], // evt-thread-agent-harness-economics-jetbrains-retrieval-2026-10-05
  [74,'0959bedd5adf21d4a974abf0f77890c19f6a5c34873633a2bd26cf9c1d37d692'], // evt-thread-agent-harness-economics-cloudflare-search-2026-10-06
  [78,'376e01f42963186f7481daa18b5745d2e4dfe4b5a3ecc5a7638f58d744ffe6a0'], // evt-thread-decision-native-documented-probabilities-2026-10-07
  [80,'02745065e6262afbc12ffa346ab35fdacd4dca857d74d8b6944308c7e6e74505'], // evt-thread-research-automation-math-verification-2026-10-07
  [82,'25e9985d56d55806df1a249c9559a3a801538bf85761a14ff79164464522e363'], // evt-thread-research-automation-semantic-fidelity-2026-10-08
]);
const KINDS = ['register','revise','review','supersede','retract','resolve','publication','relate','forecast_basis','forecast_review'];
const ID = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,95}$/;
const FORBIDDEN = /^(raw_html|raw_text|source_text|source_body|image_bytes|screenshot|prompt|private_notes|cache_file|secret|token|__proto__|constructor|prototype)$/;
const patchKeys = {
  signal:['title','summary','why_it_matters','our_read','second_order_effect','watch_next','status','falsifiers','limitations','sources','source_count','source_organization_count'],
  thread:['title','summary','thesis','status','analysis','effect_on_thesis'],
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
function snapshotProjection(type,r,links) {
  const out=structuredClone(r);
  if (type === 'signal') {
    out.sources=normalizedEvidence(out.sources);
    const rels=[];
    for (const [thread_id,relation] of Object.entries(links)) {
      if (relation.supporting.includes(r.id)) rels.push({thread_id,relationship:'supporting'});
      if (relation.contradicting.includes(r.id)) rels.push({thread_id,relationship:'contradicting'});
    }
    out.thread_relations=rels;
    out.thread_ids=[...new Set(rels.map(x => x.thread_id))];
  } else if (type === 'thread') {
    const relation=links[r.id] ?? {supporting:[],contradicting:[]};
    out.signal_relations=structuredClone(relation);
    out.signal_ids=[...relation.supporting,...relation.contradicting];
    for (const update of out.updates ?? []) update.sources=normalizedEvidence(update.sources ?? []);
  } else if (type === 'prediction') {
    if (out.forecast_basis) out.forecast_basis.evidence=normalizedEvidence(out.forecast_basis.evidence ?? []);
    for (const review of out.reviews ?? []) review.evidence=normalizedEvidence(review.evidence ?? []);
    for (const resolution of out.resolutions ?? []) resolution.evidence=normalizedEvidence(resolution.evidence ?? []);
  }
  return out;
}
function citationLabel(type,r) {
  const title=type === 'prediction' ? r.claim : r.title;
  return `GrepSignal, "${title}", ${r.id} v${r.version}`;
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
  // Track why a Prediction was flagged while replaying the immutable journal.
  // A parent-bound review must not erase an unrelated dependency's warning.
  const predictionReviewCauses=new Map();
  const incompleteForecastReview=Symbol('incomplete forecast review');
  const reviewCauses=id => {
    if (!predictionReviewCauses.has(id)) predictionReviewCauses.set(id,new Set());
    return predictionReviewCauses.get(id);
  };
  for (const [type,key] of Object.entries(TYPES)) {
    data[key]=(baseline[key] ?? []).map(r => bootstrap(r,type,journal));
    for (const r of data[key]) {assert(!records.has(r.id),'duplicate record ID');records.set(r.id,{type,r});}
  }
  const versions=Object.fromEntries(Object.values(TYPES).map(key => [key,{}]));
  const captureVersion=(type,r,sequence,eventId,recordedAt,origin,eventSha256=null) => {
    const bucket=versions[TYPES[type]];
    bucket[r.id] ??={};
    assert(!Object.hasOwn(bucket[r.id],String(r.version)),`duplicate snapshot for ${r.id} v${r.version}`);
    bucket[r.id][String(r.version)]={
      schema_version:1,
      record_type:type,
      record_id:r.id,
      record_version:r.version,
      snapshot_sequence:sequence,
      snapshot_event_id:eventId,
      snapshot_recorded_at:recordedAt,
      snapshot_origin:origin,
      event_sha256:eventSha256,
      immutable:true,
      cite_as:citationLabel(type,r),
      record:snapshotProjection(type,r,links),
    };
  };
  for (const {type,r} of records.values()) captureVersion(type,r,0,null,journal.initialized_at,'legacy_snapshot',null);
  const seen=new Set();const changes=[];let priorTime=timestamp(journal.initialized_at);
  for (const raw of journal.events) {
    const e=validateEvent(raw);assert(!seen.has(e.id),'duplicate event ID');seen.add(e.id);
    assert(timestamp(e.recorded_at) >= priorTime,'journal time reversal');priorTime=timestamp(e.recorded_at);
    const p=e.payload;let item=records.get(e.record_id);
    if (e.kind === 'register') {
      assert(!item && e.expected_version === 0,'record already registered');
      const allowed=e.record_type === 'signal' ? ['id','type','status','title','summary','why_it_matters','our_read','second_order_effect','watch_next','source_count','source_organization_count','registered_at','evidence_since','falsifiers','limitations','sources'] : e.record_type === 'thread' ? ['id','title','status','summary','thesis','created_at','last_updated','evidence_since','signal_count','updates','analysis','signal_relations'] : ['id','thread_id','claim','created_at','deadline','success_criterion','failure_criterion','insufficient_evidence_policy','resolution_sources','initial_probability'];
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
        r.next_review_at=new Date(timestamp(e.recorded_at)+THREAD_REVIEW_INTERVAL_MS).toISOString();r.review_due_since=r.next_review_at;
      }
      if (p.first_observed_at != null) assert(timestamp(p.first_observed_at) <= timestamp(e.recorded_at),'observation cannot be in the future');
      r.first_observed_at=p.first_observed_at ?? null;r.last_changed_at=e.recorded_at;
      if (e.record_type === 'prediction') {r.status='unregistered';r.reviews=[];r.resolutions=[];r.brier_score=null;r.forecast_basis=null;}
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
      const patch=structuredClone(p);
      const explicitThreadEffect=e.record_type === 'thread' ? (patch.effect_on_thesis ?? null) : null;
      if (e.record_type === 'thread') {
        if (explicitThreadEffect != null) assert(THESIS_EFFECTS.includes(explicitThreadEffect),'invalid effect_on_thesis');
        delete patch.effect_on_thesis;
      }
      if ('status' in patch) assert(ASSESSMENTS.includes(patch.status),'invalid assessment');
      changedFields=Object.fromEntries(Object.entries(patch).filter(([key,value]) => JSON.stringify(canonical(r[key])) !== JSON.stringify(canonical(value))).map(([key,value]) => [key,{before:structuredClone(r[key] ?? null),after:structuredClone(value)}]));
      assert(Object.keys(changedFields).length > 0 || explicitThreadEffect !== null,'revision must materially change a field or record an explicit Thread evidence delta');
      const previousStatus=r.status;
      Object.assign(r,patch);r.last_changed_at=e.recorded_at;
      if (e.record_type === 'thread') {
        const inferredThreadEffect=explicitThreadEffect
          ?? (Object.hasOwn(changedFields,'thesis') ? 'revised'
            : Object.hasOwn(changedFields,'status') && r.status === 'falsified' ? 'falsified'
            : Object.hasOwn(changedFields,'status') && r.status === 'weakening' ? 'weakened'
            : Object.hasOwn(changedFields,'status') && r.status === 'strengthening' && previousStatus !== 'strengthening' ? 'strengthened'
            : 'unchanged');
        r.last_updated=e.recorded_at.slice(0,10);
        r.updates.push({id:e.id,date:r.last_updated,assessment:r.status,effect_on_thesis:inferredThreadEffect,change:e.note,signal_ids:[],sources:structuredClone(e.evidence)});
        // Ordinary revisions do not attest that all outstanding counterevidence and
        // dependency work is complete. Preserve review metadata, warnings and due origin.
        // Only exact historical prefixes keep their already-published legacy projection.
        const legacyPrefix=LEGACY_THREAD_REVIEW_PREFIXES.get(changes.length+1);
        if (legacyPrefix && sha256(journal.events.slice(0,changes.length+1)) === legacyPrefix) {
          r.last_reviewed_at=e.recorded_at;
          r.last_review_outcome='revised';
          r.next_review_at=new Date(timestamp(e.recorded_at)+THREAD_REVIEW_INTERVAL_MS).toISOString();
          r.review_due_since=r.next_review_at;
          r.review_required=false;
        }
      }
    } else if (e.kind === 'review') {
      assert(e.record_type !== 'prediction','predictions use forecast_review');
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
    } else if (e.kind === 'forecast_basis') {
      exact(p,['method','rationale','supporting_factors','counter_factors','thread_snapshot_version','calibration_note'],'forecast basis');
      assert(e.record_type === 'prediction','forecast basis applies only to predictions');
      assert(r.forecast_basis === null,'forecast basis is immutable once recorded');
      assert(timestamp(e.recorded_at) < timestamp(r.deadline),'forecast basis must be recorded before deadline');
      assert(e.evidence.length > 0,'forecast basis requires evidence');
      assert(text(p.method) && text(p.rationale) && text(p.calibration_note),'forecast basis prose required');
      assert(Array.isArray(p.supporting_factors) && p.supporting_factors.length > 0 && p.supporting_factors.every(text),'forecast basis supporting factors required');
      assert(Array.isArray(p.counter_factors) && p.counter_factors.length > 0 && p.counter_factors.every(text),'forecast basis counter factors required');
      assert(Number.isInteger(p.thread_snapshot_version) && p.thread_snapshot_version >= 0,'forecast basis Thread snapshot version required');
      assert(versions.threads?.[r.thread_id]?.[String(p.thread_snapshot_version)],'forecast basis references unknown Thread snapshot');
      r.forecast_basis={
        ...structuredClone(p),
        evidence:structuredClone(e.evidence),
        recorded_at:e.recorded_at,
        event_id:e.id,
      };
    } else if (e.kind === 'forecast_review') {
      exact(p,['assessment','counterevidence_checked','thread_snapshot_version','next_review_at','review_completion'],'forecast review');
      const hasCompletion=Object.hasOwn(p,'review_completion');
      if (hasCompletion) assert(['complete','incomplete'].includes(p.review_completion),'invalid forecast review completion');
      assert(e.record_type === 'prediction','forecast review applies only to predictions');
      assert(r.first_public_at !== null && r.status === 'open','forecast review requires an open publicly registered prediction');
      assert(timestamp(e.recorded_at) < timestamp(r.deadline),'forecast review must be recorded before deadline');
      assert(['supporting','challenging','neutral','inconclusive'].includes(p.assessment),'invalid forecast review assessment');
      assert(Array.isArray(p.counterevidence_checked) && p.counterevidence_checked.length > 0 && p.counterevidence_checked.every(text),'forecast review counter-evidence work must be recorded');
      assert(Number.isInteger(p.thread_snapshot_version) && p.thread_snapshot_version >= 0,'forecast review Thread snapshot version required');
      assert(versions.threads?.[r.thread_id]?.[String(p.thread_snapshot_version)],'forecast review references unknown Thread snapshot');
      if (['supporting','challenging'].includes(p.assessment)) assert(e.evidence.length > 0,'directional forecast review requires evidence');
      if (p.next_review_at != null) {
        assert(timestamp(p.next_review_at) > timestamp(e.recorded_at) && timestamp(p.next_review_at) < timestamp(r.deadline),'next forecast review must be after this review and before deadline');
      }
      r.reviews.push({
        id:e.id,
        assessment:p.assessment,
        recorded_at:e.recorded_at,
        note:e.note,
        evidence:structuredClone(e.evidence),
        counterevidence_checked:structuredClone(p.counterevidence_checked),
        thread_snapshot_version:p.thread_snapshot_version,
        next_review_at:p.next_review_at ?? null,
        original_probability:r.initial_probability,
        ...(hasCompletion ? {review_completion:p.review_completion} : {}),
      });
      r.last_reviewed_at=e.recorded_at;
      r.last_review_outcome=p.assessment;
      r.next_review_at=p.next_review_at ?? null;
      if (!hasCompletion) {
        // Backward compatibility: old reviews did not attest completion, so retain
        // their historic scheduling behavior without retroactively clearing flags.
        r.review_due_since=p.next_review_at ?? null;
      } else {
        const parent=records.get(r.thread_id)?.r;
        const currentParent=parent && parent.version === p.thread_snapshot_version;
        const parentReady=currentParent && parent.lifecycle === 'active' && !parent.review_required
          && (parent.next_review_at == null || timestamp(parent.next_review_at) > timestamp(e.recorded_at));
        const causes=reviewCauses(r.id);
        if (p.review_completion === 'complete' && parentReady) {
          causes.delete(r.thread_id);
          causes.delete(incompleteForecastReview);
          r.review_required=causes.size > 0;
          if (!r.review_required) r.review_due_since=p.next_review_at ?? null;
        } else {
          // An incomplete or stale-bound review is useful history, not clearance.
          causes.add(incompleteForecastReview);
          r.review_required=true;
        }
      }
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
      if (other.id !== r.id && linked) {
        other.review_required=true;
        if (records.get(other.id).type === 'prediction') reviewCauses(other.id).add(r.id);
      }
    }
    // Explicit evidence/dependency relation edits change a Thread's accepted
    // context just like a revision. Reflag its Predictions, not mere metadata reviews.
    if (e.record_type === 'thread' && e.kind === 'relate') for (const {type,r:other} of records.values()) {
      if (type === 'prediction' && (other.thread_id === r.id || other.relations?.some(x => x.target_id === r.id))) {
        other.review_required=true;
        reviewCauses(other.id).add(r.id);
      }
    }
    const sequence=changes.length+1;
    const change=structuredClone(e);change.evidence=normalizedEvidence(change.evidence);
    const proposal=e.proposal ? {...structuredClone(e.proposal),display_name:e.proposed_by} : proposalAttribution(e.proposed_by);
    const acceptanceReceipt=publicAcceptanceReceipt(e,sequence,r.version);
    changes.push({...change,sequence,version:r.version,proposal,changed_fields:changedFields,acceptance_receipt:acceptanceReceipt});
    captureVersion(e.record_type,r,sequence,e.id,e.recorded_at,'journal_event',acceptanceReceipt.event_sha256);
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
  for (const p of data.predictions) {
    forecast(p);
    if (p.forecast_basis) {
      evidence(p.forecast_basis.evidence ?? []);
      for (const key of ['method','rationale','calibration_note']) assert(text(p.forecast_basis[key]),`invalid forecast basis ${key}`);
      for (const key of ['supporting_factors','counter_factors']) assert(Array.isArray(p.forecast_basis[key]) && p.forecast_basis[key].length > 0 && p.forecast_basis[key].every(text),`invalid forecast basis ${key}`);
    }
    for (const review of p.reviews ?? []) review.evidence=normalizedEvidence(review.evidence);
    for (const resolution of p.resolutions ?? []) resolution.evidence=normalizedEvidence(resolution.evidence);
  }
  data.stats={material_signals:data.signals.filter(x => x.lifecycle === 'active').length,active_threads:data.threads.filter(x => x.lifecycle === 'active').length,open_predictions:data.predictions.filter(x => ['open','unresolved'].includes(x.status) && x.lifecycle === 'active').length};
  const lastMaterial=changes.filter(x => !['review','forecast_review','publication'].includes(x.kind)).at(-1);
  if (lastMaterial) data.generated_at=lastMaterial.recorded_at;
  data.accountability={baseline_ref:journal.baseline_ref,initialized_at:journal.initialized_at,latest_sequence:changes.length,last_recorded_at:changes.at(-1)?.recorded_at ?? null};
  return {data,changes,links,versions};
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
