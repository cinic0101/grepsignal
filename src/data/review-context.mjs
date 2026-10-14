// Presentation only: warnings and dates remain owned by the accepted projection.
// Never infer evidence gaps from a status label or turn a revision into a review.
export function reviewContext(record, changes = [], builtAt = new Date().toISOString()) {
  const overdue = record?.lifecycle === 'active' && Boolean(record.review_due_since)
    && Date.parse(record.review_due_since) <= Date.parse(builtAt);
  const pending = Boolean(record?.review_required || overdue);
  const lastReview = changes.filter(event => event.record_id === record?.id
    && ['review', 'forecast_review'].includes(event.kind)).at(-1);
  // A legacy revision can carry last_reviewed_at. Only match an actual review
  // event; do not present a different or older event as the latest review.
  const review = lastReview?.recorded_at === record?.last_reviewed_at ? lastReview : null;
  const inconclusive = Boolean(record?.review_required && record.last_review_outcome === 'inconclusive'
    && !(review?.kind === 'forecast_review' && review.payload?.review_completion === 'complete'));
  return {
    pending,
    overdue,
    review,
    title: inconclusive ? 'Last review inconclusive' : record?.review_required
      ? 'Review remains unresolved' : 'Scheduled review is overdue',
    explanation: inconclusive
      ? 'The last review did not settle the outstanding questions. The retained judgment is not a fresh endorsement or an automatic reversal.'
      : record?.review_required
        ? 'This record has an unresolved review flag. Changed linked judgments or unfinished review work may affect how it should be read; the flag does not automatically reverse the judgment.'
        : 'The scheduled review date has passed. This record has not received a fresh endorsement simply because it remains published.',
    nextLabel: pending ? 'Next planned check' : 'Next review',
  };
}
