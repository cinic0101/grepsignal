const STORAGE_KEY = 'grepsignal.local-ai.enabled.v1';
const MODEL_CANDIDATES = [
  'Qwen3-0.6B-q4f16_1-MLC',
  'Llama-3.2-1B-Instruct-q4f16_1-MLC',
];

type Phase = 'idle' | 'loading' | 'ready' | 'running' | 'unsupported' | 'error';
type State = {
  enabled: boolean;
  phase: Phase;
  progress: number;
  detail: string;
  modelId: string | null;
};

type ExplainSignal = {
  title: string;
  summary: string;
  why_it_matters: string;
};

type ExplainThread = {
  title: string;
  summary: string;
  thesis: string;
  latest_change: string;
  latest_assessment: string;
  boundaries: string[];
  evidence_map: Array<{ title: string; summary: string }>;
};

type ExplainSelection = {
  selected_text: string;
  context: string;
};

type ExplainThreadDelta = {
  title: string;
  thesis: string;
  previous_revision_date: string | null;
  new_updates: Array<{
    date: string;
    assessment: string;
    change: string;
  }>;
};

type ExplainInput = ExplainSignal | ExplainThread | ExplainSelection | ExplainThreadDelta;
type ExplainTask =
  | 'what_changed'
  | 'why_it_matters'
  | 'thread_explain'
  | 'thread_latest_change'
  | 'selection_explain'
  | 'thread_since_visit';

type CompletionResponse = {
  choices: Array<{ message?: { content?: string | null } }>;
};
type CompletionChunk = {
  choices: Array<{ delta?: { content?: string | null } }>;
};
type CompletionStream = AsyncIterable<CompletionChunk>;
type CompletionResult = CompletionResponse | CompletionStream;

type LocalEngine = {
  chat: {
    completions: {
      create: (request: Record<string, unknown>) => Promise<CompletionResult>;
    };
  };
};

type ExplainStreamUpdate = {
  task: ExplainTask;
  raw: string;
  visible: string;
  thinking: boolean;
  done: boolean;
};

type LocalAIManager = {
  getState: () => State;
  enable: () => Promise<void>;
  disable: () => void;
  ensureReady: () => Promise<void>;
  generate: (
    task: ExplainTask,
    input: ExplainInput,
    onUpdate?: (update: ExplainStreamUpdate) => void,
  ) => Promise<string>;
};

declare global {
  interface Window {
    __grepsignalLocalAI?: LocalAIManager;
  }
}

let state: State = {
  enabled: false,
  phase: 'idle',
  progress: 0,
  detail: 'Local AI is off.',
  modelId: null,
};
let engine: LocalEngine | null = null;
let enginePromise: Promise<LocalEngine> | null = null;
let worker: Worker | null = null;
let webLLMPromise: Promise<typeof import('@mlc-ai/web-llm')> | null = null;

const snapshot = () => ({ ...state });
const emit = () => {
  window.dispatchEvent(new CustomEvent('grepsignal:local-ai-state', { detail: snapshot() }));
  renderControls();
};
const setState = (next: Partial<State>) => {
  state = { ...state, ...next };
  emit();
};

function loadWebLLM() {
  webLLMPromise ??= import('@mlc-ai/web-llm');
  return webLLMPromise;
}

function visibleFromRaw(raw: string) {
  let visible = raw.replace(/<think>[\s\S]*?<\/think>/gi, '');
  const openThink = visible.toLowerCase().lastIndexOf('<think>');
  const thinking = openThink >= 0;
  if (thinking) visible = visible.slice(0, openThink);
  visible = visible.replace(/<\/?think>/gi, '').trim();
  return { visible, thinking };
}

function isCompletionStream(value: CompletionResult): value is CompletionStream {
  return typeof (value as CompletionStream)?.[Symbol.asyncIterator] === 'function';
}

function taskDetail(task: ExplainTask) {
  if (task === 'selection_explain') return 'Explaining your selection locally…';
  if (task === 'thread_since_visit') return 'Summarizing new Thread revisions locally…';
  if (task === 'what_changed') return 'Simplifying what changed locally…';
  if (task === 'why_it_matters') return 'Explaining why it could matter locally…';
  if (task === 'thread_explain') return 'Explaining the current Thread locally…';
  return 'Explaining the latest Thread change locally…';
}

function taskInstruction(task: ExplainTask) {
  if (task === 'what_changed') {
    return [
      'Rewrite the published summary in one or two short plain-English sentences.',
      'Simplify wording, not meaning. Explain only what changed.',
      'Preserve the direction of every comparison or causal statement: more versus less, increase versus decrease, scarce versus abundant, narrower versus broader, cause versus effect, and before versus after.',
      'Do not blur or invert directional claims. If the source says something becomes less scarce, more common, slower, faster, narrower, or broader, keep that same direction.',
      'Preserve source attribution, scope, population, and evidence boundaries. Do not generalize one company, provider, evaluation, incident class, or setting into an industry-wide or ordinary-production claim.',
      'Do not invent a trend, adoption claim, deployment pattern, causal background, or motivation that is not explicitly stated in the published summary.',
      'Do not add implications, recommendations, or new facts.',
      'Return only the rewritten prose. No label, heading, bullet, preamble, or quote marks.',
    ].join('\n');
  }

  if (task === 'why_it_matters') {
    return [
      'Rewrite the published why-it-matters text in one or two short plain-English sentences.',
      'Simplify wording, not the thesis. Preserve the causal chain and the direction of every relationship.',
      'Preserve every uncertainty qualifier such as if, may, could, or might.',
      'Keep the specific mechanisms, bottlenecks, constraints, or architectural consequences named in the source instead of replacing them with generic wording such as “this may affect how things are managed”.',
      'Preserve scope and evidence boundaries. Do not broaden a claim from one organization, provider, evaluation, incident class, or setting to a wider population.',
      'Do not invent a trend, adoption claim, deployment pattern, causal background, or motivation that is not explicitly stated in the published why-it-matters text.',
      'Do not strengthen the claim and do not add recommendations or new facts.',
      'Return only the rewritten prose. No label, heading, bullet, preamble, or quote marks.',
    ].join('\n');
  }

  if (task === 'selection_explain') {
    return [
      'Explain the selected text in one to three short plain-English sentences.',
      'Use the surrounding passage only to resolve what the selected words mean in this page.',
      'Define technical wording simply when needed, but do not add background knowledge that is not supported by the supplied passage.',
      'Preserve qualifiers, attribution, scope, comparisons, and causal direction.',
      'If the passage is not sufficient to explain a claim safely, say that the surrounding text does not establish more than it does.',
      'Do not add recommendations, forecasts, names, numbers, examples, or external facts.',
      'Return only the explanation. No heading, bullets, preamble, or quote marks.',
    ].join('\n');
  }

  if (task === 'thread_since_visit') {
    return [
      'Summarize only the published Thread revisions that are new since the reader last saw this Thread.',
      'Use two to four concise plain-English sentences. Lead with the material delta instead of restating the whole Thread.',
      'Preserve each revision assessment direction and any uncertainty or scope in the supplied change notes.',
      'Use the current thesis only as context for understanding the delta.',
      'Do not invent causes, evidence, actors, trends, recommendations, forecasts, or changes that are not in NEW_REVISIONS.',
      'Do not treat multiple revisions as independent evidence unless the supplied revisions explicitly establish that.',
      'Return only the delta summary. No heading, bullets, preamble, or quote marks.',
    ].join('\n');
  }

  if (task === 'thread_explain') {
    return [
      'Explain the published Thread thesis in two or three short plain-English sentences.',
      'Use the current thesis, summary, and evidence-map descriptions only.',
      'Describe this as an ongoing tracked interpretation, not a settled universal fact.',
      'Preserve scope, uncertainty, and the difference between incidents, mechanisms, and platform responses.',
      'Do not add external facts, recommendations, forecasts, or evidence.',
      'Do not claim that repeated coverage is independent evidence unless the supplied text says so.',
      'Return only the explanation. No label, heading, bullets, preamble, or quote marks.',
    ].join('\n');
  }

  return [
    'Explain the latest published Thread change in one or two short plain-English sentences.',
    'State how the published view changed and preserve the supplied assessment direction.',
    'Use only the latest change note and current thesis for context.',
    'Do not invent causes, actors, event relationships, or evidence not present in the supplied text.',
    'Do not turn a Thread update into a new Signal, recommendation, or forecast.',
    'Return only the explanation. No label, heading, bullets, preamble, or quote marks.',
  ].join('\n');
}

function taskInput(task: ExplainTask, input: ExplainInput) {
  if (task === 'what_changed') {
    const signal = input as ExplainSignal;
    return [
      '/no_think',
      `TITLE: ${signal.title}`,
      `PUBLISHED_SUMMARY: ${signal.summary}`,
    ].join('\n');
  }

  if (task === 'why_it_matters') {
    const signal = input as ExplainSignal;
    return [
      '/no_think',
      `TITLE: ${signal.title}`,
      `PUBLISHED_SUMMARY_FOR_CONTEXT: ${signal.summary}`,
      `PUBLISHED_WHY_IT_MATTERS: ${signal.why_it_matters}`,
    ].join('\n');
  }

  if (task === 'selection_explain') {
    const selection = input as ExplainSelection;
    return [
      '/no_think',
      `SELECTED_TEXT: ${selection.selected_text}`,
      `SURROUNDING_PASSAGE: ${selection.context}`,
    ].join('\n');
  }

  if (task === 'thread_since_visit') {
    const delta = input as ExplainThreadDelta;
    return [
      '/no_think',
      `THREAD: ${delta.title}`,
      `CURRENT_THESIS: ${delta.thesis}`,
      `PREVIOUS_REVISION_DATE: ${delta.previous_revision_date ?? 'unknown'}`,
      `NEW_REVISIONS: ${delta.new_updates.map((item) => `${item.date} [${item.assessment}]: ${item.change}`).join(' | ')}`,
    ].join('\n');
  }

  const thread = input as ExplainThread;
  if (task === 'thread_explain') {
    return [
      '/no_think',
      `THREAD: ${thread.title}`,
      `PUBLISHED_SUMMARY: ${thread.summary}`,
      `CURRENT_THESIS: ${thread.thesis}`,
      `EVIDENCE_MAP: ${thread.evidence_map.map((item) => `${item.title}: ${item.summary}`).join(' | ')}`,
      `PUBLISHED_BOUNDARIES: ${thread.boundaries.join(' | ')}`,
    ].join('\n');
  }

  return [
    '/no_think',
    `THREAD: ${thread.title}`,
    `CURRENT_THESIS: ${thread.thesis}`,
    `LATEST_ASSESSMENT: ${thread.latest_assessment}`,
    `LATEST_PUBLISHED_CHANGE: ${thread.latest_change}`,
  ].join('\n');
}

async function loadEngine() {
  if (engine) return engine;
  if (enginePromise) return enginePromise;
  if (!('gpu' in navigator)) {
    setState({ phase: 'unsupported', detail: 'WebGPU is unavailable in this browser.' });
    throw new Error('WebGPU unavailable');
  }

  setState({ enabled: true, phase: 'loading', progress: 0, detail: 'Loading Local AI runtime…' });
  enginePromise = (async () => {
    const { CreateWebWorkerMLCEngine, prebuiltAppConfig } = await loadWebLLM();
    const available = new Set(prebuiltAppConfig.model_list.map((item) => item.model_id));
    const modelId = MODEL_CANDIDATES.find((candidate) => available.has(candidate))
      ?? prebuiltAppConfig.model_list.find((item) =>
        item.model_id.includes('Llama-3.2-1B-Instruct-q4f16_1-MLC')
      )?.model_id;
    if (!modelId) throw new Error('No supported lightweight local model is available.');

    console.info('[GrepSignal Local AI] selected model', modelId);
    setState({ progress: 0, detail: 'Preparing local model…', modelId });
    worker = new Worker(new URL('../workers/local-ai.worker.ts', import.meta.url), { type: 'module' });
    const loaded = await CreateWebWorkerMLCEngine(worker, modelId, {
      initProgressCallback: (report) => {
        const raw = typeof report.progress === 'number' ? report.progress : 0;
        setState({
          phase: 'loading',
          progress: Math.max(0, Math.min(100, Math.round(raw * 100))),
          detail: report.text || 'Downloading local model…',
        });
      },
    });
    engine = loaded as LocalEngine;
    setState({ phase: 'ready', progress: 100, detail: 'Local AI is ready.' });
    return engine;
  })().catch((error) => {
    enginePromise = null;
    worker?.terminate();
    worker = null;
    setState({ phase: 'error', detail: error instanceof Error ? error.message : 'Local model failed to load.' });
    throw error;
  });

  try {
    await navigator.storage?.persist?.();
  } catch {
    // Best-effort cache persistence only.
  }
  return enginePromise;
}

const manager: LocalAIManager = {
  getState: snapshot,
  async enable() {
    localStorage.setItem(STORAGE_KEY, '1');
    setState({ enabled: true });
    await loadEngine();
  },
  disable() {
    localStorage.removeItem(STORAGE_KEY);
    worker?.terminate();
    worker = null;
    engine = null;
    enginePromise = null;
    state = { enabled: false, phase: 'idle', progress: 0, detail: 'Local AI is off.', modelId: null };
    emit();
  },
  async ensureReady() {
    if (!state.enabled) throw new Error('Local AI has not been enabled.');
    await loadEngine();
  },
  async generate(task, input, onUpdate) {
    const active = await loadEngine();
    setState({ phase: 'running', detail: taskDetail(task) });

    try {
      const response = await active.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: [
              'You are GrepSignal Local AI, a constrained reading aid.',
              'Use only the supplied approved intelligence.',
              'Simplify wording, not meaning.',
              'Do not add external facts, recommendations, forecasts, names, numbers, or background knowledge.',
              'Preserve uncertainty, scope, attribution, and the direction of causal or comparative claims.',
              'Do not output chain-of-thought, hidden reasoning, analysis, or a preamble.',
              taskInstruction(task),
            ].join('\n'),
          },
          {
            role: 'user',
            content: taskInput(task, input),
          },
        ],
        temperature: 0.3,
        top_p: 0.8,
        max_tokens: task === 'thread_since_visit' ? 220 : task === 'selection_explain' ? 160 : task.startsWith('thread_') ? 180 : 140,
        stream: true,
        extra_body: {
          enable_thinking: false,
        },
      });

      if (!isCompletionStream(response)) {
        const raw = response.choices[0]?.message?.content?.trim() ?? '';
        const derived = visibleFromRaw(raw);
        onUpdate?.({ task, raw, visible: derived.visible, thinking: derived.thinking, done: true });
        return derived.visible;
      }

      let raw = '';
      let visible = '';
      for await (const chunk of response) {
        const delta = chunk.choices[0]?.delta?.content ?? '';
        if (!delta) continue;
        raw += delta;
        const derived = visibleFromRaw(raw);
        visible = derived.visible;
        onUpdate?.({ task, raw, visible, thinking: derived.thinking, done: false });
      }

      const final = visibleFromRaw(raw);
      onUpdate?.({ task, raw, visible: final.visible, thinking: final.thinking, done: true });
      return final.visible;
    } finally {
      setState({ phase: 'ready', detail: 'Local AI is ready.' });
    }
  },
};

window.__grepsignalLocalAI = manager;
window.dispatchEvent(new CustomEvent('grepsignal:local-ai-manager-ready'));

function renderControls() {
  const current = snapshot();
  document.querySelectorAll<HTMLButtonElement>('[data-local-ai-enable]').forEach((button) => {
    button.disabled = current.phase === 'loading' || current.phase === 'running' || current.phase === 'ready';
    button.textContent = current.phase === 'ready'
      ? 'Local AI ready'
      : current.phase === 'loading'
        ? `Preparing Local AI · ${current.progress}%`
        : current.phase === 'unsupported'
          ? 'Local AI unavailable'
          : current.phase === 'error'
            ? 'Retry Local AI'
            : 'Enable Local AI';
  });

  document.querySelectorAll<HTMLElement>('[data-local-ai-status]').forEach((panel) => {
    panel.hidden = !current.enabled && current.phase === 'idle';
    const label = panel.querySelector<HTMLElement>('[data-local-ai-status-label]');
    const detail = panel.querySelector<HTMLElement>('[data-local-ai-status-detail]');
    const progress = panel.querySelector<HTMLProgressElement>('[data-local-ai-progress]');
    if (label) label.textContent = current.phase === 'ready' ? 'Local AI ready' : current.phase === 'running' ? 'Local AI working' : 'Local AI';
    if (detail) detail.textContent = current.detail;
    if (progress) {
      progress.hidden = current.phase !== 'loading';
      progress.value = current.progress;
    }
  });
}

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const enable = target.closest<HTMLButtonElement>('[data-local-ai-enable]');
  if (enable) {
    manager.enable().catch(() => undefined);
    return;
  }
  const disable = target.closest<HTMLButtonElement>('[data-local-ai-disable]');
  if (disable) manager.disable();
});

renderControls();
if (localStorage.getItem(STORAGE_KEY) === '1') {
  setState({ enabled: true });
  loadEngine().catch(() => undefined);
}
