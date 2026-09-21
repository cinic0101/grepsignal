export type RetrievalSource = {
  publisher?: string | null;
  role?: string | null;
};

export type RetrievalIdentity = {
  entity_names: string[];
  about_entity_names: string[];
  mention_entity_names: string[];
  entity_label: string | null;
  derivation: 'accepted_evidence_metadata';
};

const ABOUT_ROLE = /^(?:primary_|affected_party(?:_|$)|independent_(?:implementation|reproduction)(?:_|$))/;

function cleanName(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLocaleLowerCase('en');
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sourceEntities(sources: RetrievalSource[]) {
  const normalized = sources
    .map((source) => ({
      name: cleanName(source.publisher),
      about: ABOUT_ROLE.test(cleanName(source.role)),
    }))
    .filter((item) => item.name);

  const entityNames = unique(normalized.map((item) => item.name));
  const aboutNames = unique(normalized.filter((item) => item.about).map((item) => item.name));
  const effectiveAbout = aboutNames.length > 0 ? aboutNames : entityNames;
  const aboutKeys = new Set(effectiveAbout.map((name) => name.toLocaleLowerCase('en')));
  const mentionNames = entityNames.filter((name) => !aboutKeys.has(name.toLocaleLowerCase('en')));

  return { entityNames, aboutNames: effectiveAbout, mentionNames };
}

function label(names: string[]) {
  if (names.length === 0) return null;
  const shown = names.slice(0, 4);
  const remainder = names.length - shown.length;
  return `${shown.join(' × ')}${remainder > 0 ? ` +${remainder}` : ''}`;
}

function identityFromSources(sources: RetrievalSource[]): RetrievalIdentity {
  const { entityNames, aboutNames, mentionNames } = sourceEntities(sources);
  return {
    entity_names: entityNames,
    about_entity_names: aboutNames,
    mention_entity_names: mentionNames,
    entity_label: label(aboutNames),
    derivation: 'accepted_evidence_metadata',
  };
}

export function buildSignalRetrievalIdentity(signal: { sources?: RetrievalSource[] }) {
  return identityFromSources(signal.sources ?? []);
}

export function buildThreadRetrievalIdentity(
  thread: {
    updates?: Array<{ sources?: RetrievalSource[] }>;
    signal_relations?: { supporting?: string[]; contradicting?: string[] };
  },
  signals: Array<{ id: string; sources?: RetrievalSource[] }>,
) {
  const relatedIds = new Set([
    ...(thread.signal_relations?.supporting ?? []),
    ...(thread.signal_relations?.contradicting ?? []),
  ]);
  const linkedSources = signals
    .filter((signal) => relatedIds.has(signal.id))
    .flatMap((signal) => signal.sources ?? []);
  const updateSources = (thread.updates ?? []).flatMap((update) => update.sources ?? []);
  return identityFromSources([...linkedSources, ...updateSources]);
}

export function buildPredictionRetrievalIdentity(
  prediction: { thread_id?: string | null },
  thread: {
    updates?: Array<{ sources?: RetrievalSource[] }>;
    signal_relations?: { supporting?: string[]; contradicting?: string[] };
  } | null | undefined,
  signals: Array<{ id: string; sources?: RetrievalSource[] }>,
) {
  if (!prediction.thread_id || !thread) return identityFromSources([]);
  return buildThreadRetrievalIdentity(thread, signals);
}

export function buildSearchTitle(
  editorialTitle: string,
  retrieval: RetrievalIdentity,
  brand = 'GrepSignal',
) {
  const entities = retrieval.about_entity_names.slice(0, 3).join(' · ');
  return entities
    ? `${entities} — ${editorialTitle} | ${brand}`
    : `${editorialTitle} | ${brand}`;
}

export function buildAlternativeHeadline(
  editorialTitle: string,
  retrieval: RetrievalIdentity,
) {
  return retrieval.entity_label
    ? `${retrieval.entity_label} — ${editorialTitle}`
    : editorialTitle;
}

export function jsonLdThings(names: string[]) {
  return names.map((name) => ({ '@type': 'Thing', name }));
}
