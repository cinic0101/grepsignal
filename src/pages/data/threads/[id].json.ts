import intelligence from '../../../data/intelligence';
import { buildThreadRetrievalIdentity } from '../../../data/retrieval';

export const prerender = true;

export function getStaticPaths() {
  return intelligence.threads.map((record) => ({
    params: { id: record.id },
    props: { record },
  }));
}

export function GET({ props }) {
  const base = import.meta.env.BASE_URL;
  const record = props.record;
  return new Response(JSON.stringify({
    schema_version: intelligence.schema_version,
    publication_status: intelligence.publication_status,
    canonical_language: intelligence.canonical_language,
    generated_at: intelligence.generated_at,
    record_type: 'thread',
    projection_sequence: intelligence.accountability.latest_sequence,
    cite_as: `GrepSignal, "${record.title}", ${record.id} v${record.version}`,
    record_version_permalink: `${base}data/threads/${record.id}/versions/${record.version}.json`,
    schema_url: `${base}schema/intelligence.schema.json`,
    record_version_schema_url: `${base}schema/record-version.schema.json`,
    collection_url: `${base}data/intelligence.json`,
    content_license: intelligence.content_license,
    retrieval_identity: buildThreadRetrievalIdentity(record, intelligence.signals),
    record,
  }, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
