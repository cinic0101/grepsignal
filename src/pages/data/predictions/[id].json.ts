import intelligence from '../../../data/intelligence';

export const prerender = true;

export function getStaticPaths() {
  return intelligence.predictions.map((record) => ({
    params: { id: record.id },
    props: { record },
  }));
}

export function GET({ props }) {
  const base = import.meta.env.BASE_URL;
  return new Response(JSON.stringify({
    schema_version: intelligence.schema_version,
    publication_status: intelligence.publication_status,
    canonical_language: intelligence.canonical_language,
    generated_at: intelligence.generated_at,
    record_type: 'prediction',
    schema_url: `${base}schema/intelligence.schema.json`,
    collection_url: `${base}data/intelligence.json`,
    content_license: intelligence.content_license,
    record: props.record,
  }, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
