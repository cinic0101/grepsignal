import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {replay} from '../scripts/accountability.mjs';
import {reviewContext} from '../src/data/review-context.mjs';
const read=name=>JSON.parse(readFileSync(new URL(`../src/data/${name}.json`,import.meta.url),'utf8'));
const baseline=read('intelligence'), links=read('thread-links'), journal=read('history');
const replayPrefix=count=>replay(baseline,{...journal,events:journal.events.slice(0,count)},links);
const eventIndex=id=>{
  const index=journal.events.findIndex(event=>event.id===id);
  assert.notEqual(index,-1,`Missing historical boundary: ${id}`);
  return index;
};
const now='2026-10-14T05:00:00Z';
const record={id:'thread-example',lifecycle:'active',review_required:false,review_due_since:null,last_reviewed_at:null};
test('absent record and missing review metadata do not invent a review',()=>{
  assert.equal(reviewContext(undefined,[],now).pending,false);
  const result=reviewContext({...record,review_required:true},[],now);
  assert.equal(result.pending,true);assert.equal(result.overdue,false);assert.equal(result.review,null);
  assert.equal(result.title,'Review remains unresolved');
});
test('overdue origin is independent of a future planned retry',()=>{
  const input={...record,review_due_since:'2026-10-08T00:00:00Z',next_review_at:'2026-10-16T00:00:00Z'};
  const before=structuredClone(input), result=reviewContext(input,[],now);
  assert.equal(result.overdue,true);assert.equal(result.pending,true);
  assert.equal(result.title,'Scheduled review is overdue');assert.deepEqual(input,before);
});
test('future dates, invalid dates and inactive lifecycle do not invent overdue status',()=>{
  for(const patch of [{review_due_since:'2026-10-16T00:00:00Z'},{review_due_since:'invalid'},{review_due_since:'2026-10-08T00:00:00Z',lifecycle:'retracted'}])
    assert.equal(reviewContext({...record,...patch},[],now).overdue,false);
});
test('a changed linked judgment cannot be presented as a fresh unchanged review',()=>{
  const input={...record,review_required:true,last_review_outcome:'unchanged',last_reviewed_at:'2026-10-01T00:00:00Z'};
  const review={id:'review',record_id:record.id,kind:'review',recorded_at:input.last_reviewed_at,note:'The earlier review was unchanged.'};
  const result=reviewContext(input,[review,{record_id:'linked',kind:'revise',recorded_at:now}],now);
  assert.equal(result.pending,true);assert.equal(result.title,'Review remains unresolved');
  assert.equal(result.review,review);assert.match(result.explanation,/Changed linked judgments/);
});
test('only a matching actual review supplies the rationale, never a revision or another record',()=>{
  const input={...record,review_required:true,last_reviewed_at:now,last_review_outcome:'revised'};
  const events=[{record_id:record.id,kind:'review',recorded_at:'2026-10-01T00:00:00Z'},
    {record_id:record.id,kind:'revise',recorded_at:now},{record_id:'other',kind:'review',recorded_at:now}];
  assert.equal(reviewContext(input,events,now).review,null);
});
test('same-time reviews respect journal append order',()=>{
  const input={...record,review_required:true,last_reviewed_at:now,last_review_outcome:'inconclusive'};
  const events=[1,2].map(i=>({id:`review-${i}`,record_id:record.id,kind:'review',recorded_at:now}));
  assert.equal(reviewContext(input,events,now).review.id,'review-2');
});
test('Cyber retains its real inconclusive review and original overdue date after October 14 revision',()=>{
  const projection=replayPrefix(eventIndex('evt-xbow-bounded-cyber-cost-2026-10-14')+1), before=JSON.stringify(projection);
  const cyber=projection.data.threads.find(r=>r.id==='thread-offensive-cyber-economics');
  const result=reviewContext(cyber,projection.changes,now);
  assert.equal(result.title,'Last review inconclusive');assert.equal(result.overdue,true);
  assert.equal(result.review.id,'evt-thread-cyber-formal-review-2026-10-09');
  assert.equal(cyber.last_reviewed_at,'2026-10-09T02:33:40Z');
  assert.equal(cyber.next_review_at,'2026-10-16T02:10:00Z');
  assert.match(cyber.review_due_since,/^2026-10-08/);
  assert.match(result.review.note,/operator-hours/);assert.match(result.review.note,/full costs/);
  assert.equal(JSON.stringify(projection),before);
});
for(const [name,eventId,recordId,dueSince] of [
  ['Cyber','evt-thread-cyber-bounded-review-2026-10-17','thread-offensive-cyber-economics','2026-10-08T09:19:09.824Z'],
  ['Decision','evt-thread-decision-bounded-review-2026-10-17','thread-decision-native-runtimes','2026-10-14T02:04:22.318Z'],
  ['Research','evt-thread-research-automation-bounded-review-2026-10-17','thread-research-automation-bottlenecks','2026-10-15T01:24:03.132Z'],
]) test(`${name}'s October 17 inconclusive review retains its overdue origin despite the future retry`,()=>{
  const index=eventIndex(eventId), event=journal.events[index];
  const previous=replayPrefix(index), projection=replayPrefix(index+1);
  const before=previous.data.threads.find(r=>r.id===recordId);
  const after=projection.data.threads.find(r=>r.id===recordId);
  const result=reviewContext(after,projection.changes,event.recorded_at);
  assert.equal(event.kind,'review');assert.equal(event.record_id,recordId);
  assert.equal(event.payload.outcome,'inconclusive');assert.ok(event.payload.counterevidence_checked.length>0);
  assert.equal(before.review_due_since,dueSince);assert.equal(after.review_due_since,dueSince);
  assert.equal(after.review_required,true);assert.equal(after.last_review_outcome,'inconclusive');
  assert.equal(after.last_reviewed_at,event.recorded_at);assert.equal(result.review.id,eventId);
  assert.equal(after.next_review_at,'2026-10-24T02:10:00Z');
  assert.ok(Date.parse(after.next_review_at)>Date.parse(event.recorded_at));
  assert.equal(result.pending,true);assert.equal(result.overdue,true);
  assert.equal(result.title,'Last review inconclusive');assert.equal(result.nextLabel,'Next planned check');
  assert.equal(after.last_changed_at,before.last_changed_at);
  assert.equal(projection.data.generated_at,previous.data.generated_at);
});
test('native accessible disclosure preserves explicit lifecycle and falsification warnings',()=>{
  const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
  const alert=read('src/components/RecordAlert.astro');
  assert.match(alert,/<details>/);assert.match(alert,/<summary>Review context and dates<\/summary>/);
  assert.match(alert,/aria-labelledby="review-context-title"/);assert.match(alert,/THESIS FALSIFIED/);
  assert.match(alert,/record.lifecycle !== 'active'/);assert.match(alert,/record.superseded_by/);
  assert.match(alert,/context.review.note/);assert.match(alert,/changes\/#\$\{context.review.id\}/);
  assert.match(read('src/components/RecordHistory.astro'),/id="record-history"/);
  const thread=read('src/pages/threads/[id].astro');
  assert.match(thread,/not a confidence score or a completed review/);
  assert.match(thread,/flex-wrap: wrap/);assert.match(thread,/min-height: 44px/);
});

test('completed inconclusive forecast assessment is not unfinished review work',()=>{
  const input={...record,review_required:true,last_reviewed_at:now,last_review_outcome:'inconclusive'};
  const review={record_id:record.id,kind:'forecast_review',recorded_at:now,payload:{review_completion:'complete'}};
  const result=reviewContext(input,[review],now);
  assert.equal(result.title,'Review remains unresolved');
  assert.match(result.explanation,/Changed linked judgments/);
});
