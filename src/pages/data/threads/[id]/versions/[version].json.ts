import intelligence, { versions } from '../../../../../data/intelligence';

export const prerender = true;

export function getStaticPaths() {
  const bucket = versions.threads;
  return Object.entries(bucket).flatMap(([id, byVersion]) =>
    Object.entries(byVersion).map(([version, snapshot]) => ({
      params: { id, version },
      props: { snapshot },
    })),
  );
}

export function GET({ props }) {
  const base = import.meta.env.BASE_URL;
  const snapshot = props.snapshot;
  return new Response(JSON.stringify({
    ...snapshot,
    current_record_url: `${base}data/threads/${snapshot.record_id}.json`,
    collection_url: `${base}data/intelligence.json`,
    schema_url: `${base}schema/record-version.schema.json`,
    version_permalink: `${base}data/threads/${snapshot.record_id}/versions/${snapshot.record_version}.json`,
    content_license: intelligence.content_license,
  }, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
