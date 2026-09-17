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
  second_order_effect: string;
  watch_next: string;
  limitations: string[];
};

type ExplainTask = 'what_changed' | 'why_it_matters' | 'example';

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
    signal: ExplainSignal,
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

function normalizeWords(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function ngramReuseRatio(candidate: string, source: string, size = 4) {
  const candidateWords = normalizeWords(candidate);
  const sourceWords = normalizeWords(source);
  if (candidateWords.length < size || sourceWords.length < size) return 0;

  const sourceNgrams = new Set<string>();
  for (let index = 0; index <= sourceWords.length - size; index += 1) {
    sourceNgrams.add(sourceWords.slice(index, index + size).join(' '));
  }

  let reused = 0;
  let total = 0;
  for (let index = 0; index <= candidateWords.length - size; index += 1) {
    total += 1;
    if (sourceNgrams.has(candidateWords.slice(index, index + size).join(' '))) reused += 1;
  }
  return total ? reused / total : 0;
}

function assessExample(value: string, signal: ExplainSignal) {
  const text = value.trim();
  if (!text || text.toUpperCase() === 'NONE') return { usable: false, reason: 'none' };
  if (/\b(should|must|need(?:s)? to|important to|recommend(?:s|ed|ing|ation)?|ought to)\b/i.test(text)) {
    return { usable: false, reason: 'advice-like' };
  }
  if (!/\b(for example|imagine|suppose|hypothetical|consider (?:a|an|the)?\s*(?:scenario|case|situation))\b/i.test(text)) {
    return { usable: false, reason: 'not-clearly-hypothetical' };
  }

  const wordCount = normalizeWords(text).length;
  if (wordCount < 10) return { usable: false, reason: 'too-short' };
  if (wordCount > 70) return { usable: false, reason: 'too-long' };

  const published = [signal.summary, signal.why_it_matters, signal.second_order_effect].join(' ');
  const reuseRatio = ngramReuseRatio(text, published);
  if (reuseRatio >= 0.45) {
    return { usable: false, reason: 'too-close-to-published-text', reuseRatio };
  }

  return { usable: true, reason: 'ok', reuseRatio };
}

function finalizeTaskOutput(task: ExplainTask, signal: ExplainSignal, value: string) {
  if (task !== 'example') return value;
  const assessment = assessExample(value, signal);
  if (assessment.usable) return value;
  console.warn('[GrepSignal Local AI] example quality gate omitted output', {
    reason: assessment.reason,
    reuseRatio: assessment.reuseRatio ?? null,
    visible: value,
  });
  return 'NONE';
}

function taskDetail(task: ExplainTask) {
  if (task === 'what_changed') return 'Simplifying what changed locally…';
  if (task === 'why_it_matters') return 'Explaining why it could matter locally…';
  return 'Building a hypothetical example locally…';
}

function taskInstruction(task: ExplainTask) {
  if (task === 'what_changed') {
    return [
      'Rewrite the published summary in one or two short plain-English sentences.',
      'Simplify wording, not meaning. Explain only what changed.',
      'Preserve the direction of every comparison or causal statement: more versus less, increase versus decrease, scarce versus abundant, narrower versus broader, cause versus effect, and before versus after.',
      'Do not blur or invert directional claims. If the source says something becomes less scarce, more common, slower, faster, narrower, or broader, keep that same direction.',
      'Preserve source attribution, scope, population, and evidence boundaries. Do not generalize one company, provider, evaluation, or setting into an industry-wide or ordinary-production claim.',
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
      'Preserve scope and evidence boundaries. Do not broaden a claim from one organization, provider, evaluation, or setting to a wider population.',
      'Do not strengthen the claim and do not add recommendations or new facts.',
      'Return only the rewritten prose. No label, heading, bullet, preamble, or quote marks.',
    ].join('\n');
  }

  return [
    'Write one short, concrete hypothetical scenario that makes the supplied signal easier to picture.',
    'Create a small situation with a generic actor or system and one concrete action, choice, or outcome. Do not merely restate or paraphrase the signal thesis.',
    'The scenario must use only concepts already present in the supplied signal and must not introduce an external fact.',
    'Do not copy a full sentence or long phrase from the supplied text.',
    'Do not give advice or recommendations. Do not use phrases such as should, must, need to, important to, or recommend.',
    'Make it clearly hypothetical by using wording such as “For example, imagine…” or “Suppose…”.',
    'Keep it under 50 words.',
    'If a faithful concrete scenario is not possible, return exactly NONE.',
    'Return only the scenario or NONE. No label, heading, bullet, preamble, or quote marks.',
  ].join('\n');
}

function taskInput(task: ExplainTask, signal: ExplainSignal) {
  if (task === 'what_changed') {
    return [
      `/no_think`,
      `TITLE: ${signal.title}`,
      `PUBLISHED_SUMMARY: ${signal.summary}`,
    ].join('\n');
  }

  if (task === 'why_it_matters') {
    return [
      `/no_think`,
      `TITLE: ${signal.title}`,
      `PUBLISHED_SUMMARY_FOR_CONTEXT: ${signal.summary}`,
      `PUBLISHED_WHY_IT_MATTERS: ${signal.why_it_matters}`,
    ].join('\n');
  }

  return [
    `/no_think`,
    `TITLE: ${signal.title}`,
    `PUBLISHED_SUMMARY: ${signal.summary}`,
    `PUBLISHED_WHY_IT_MATTERS: ${signal.why_it_matters}`,
    `SECOND_ORDER_EFFECT: ${signal.second_order_effect}`,
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
  async generate(task, signal, onUpdate) {
    const active = await loadEngine();
    setState({ phase: 'running', detail: taskDetail(task) });

    try {
      const response = await active.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: [
              'You are GrepSignal Local Explain, a constrained reading aid.',
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
            content: taskInput(task, signal),
          },
        ],
        temperature: task === 'example' ? 0.6 : 0.3,
        top_p: 0.8,
        max_tokens: task === 'example' ? 80 : 140,
        stream: true,
        extra_body: {
          enable_thinking: false,
        },
      });

      if (!isCompletionStream(response)) {
        const raw = response.choices[0]?.message?.content?.trim() ?? '';
        const derived = visibleFromRaw(raw);
        const visible = finalizeTaskOutput(task, signal, derived.visible);
        onUpdate?.({ task, raw, visible, thinking: derived.thinking, done: true });
        return visible;
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
      const finalVisible = finalizeTaskOutput(task, signal, final.visible);
      onUpdate?.({ task, raw, visible: finalVisible, thinking: final.thinking, done: true });
      return finalVisible;
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
