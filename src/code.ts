// Bíblia PRO — lógica do plugin (roda isolada, sem DOM).
//
// O operador prepara, por PREGAÇÃO, uma lista de versículos favoritos; um
// clique projeta o versículo nas saídas escolhidas.
//
// De onde vem cada coisa:
// • TEXTO: a UI busca na Bíblia instalada no app (rotas locais /bible/*) e
//   manda para cá o texto já pronto — o favorito guarda o texto, então projetar
//   não depende de nada externo.
// • TEMA e CAMADA: os mesmos do painel de Bíblia do app. O plugin APRENDE os
//   dois sempre que um versículo projetado pelo app aparece no ar (por saída).
//   Antes de aprender, usa o tema padrão de Bíblia do próprio Spresenter.
// • Projeção: a mesma apresentação que o painel de Bíblia monta (asset do tipo
//   'bible' + props text/book/chapter/verse/version), então o tema do app, o
//   retorno e os tokens {verso}/{livro}/{capitulo}/{versiculo}/{versao} funcionam.

interface Verse { verse: number; text: string }

interface Fav {
  id: string;
  version: string;
  abbrev: string;
  book: string;
  chapter: number;
  verses: Verse[];
  /** Vários versículos: projetar juntos numa tela só (padrão) ou um por vez. */
  together?: boolean;
}

interface FavList {
  id: string;
  title: string;
  items: Fav[];
}

interface Learned {
  /** Tema de Bíblia por saída, copiado do que o app projetou. */
  themes: Record<string, Record<string, unknown>>;
  layer: number | null;
  /** Bíblia em uso no app. A "Bíblia padrão" (Configurações → Bíblia) mora no
   *  armazenamento da janela principal, fora do alcance de plugins — mas o
   *  painel de Bíblia abre nela e cada versículo projetado leva `version`. */
  version: string | null;
}

interface Settings {
  outputs: string[] | null; // null = todas
  layer: number | null; // null = a da Bíblia nas Configurações do app
  /** Duração do fade de entrada/saída do VERSÍCULO (ms). */
  verseFadeMs: number;
  /** Espera entre o fundo aparecer e o versículo entrar (ms). */
  verseDelayMs: number;
  /** Bíblia padrão do plugin — a "Bíblia padrão" do app não é visível para
   *  plugins, então o operador escolhe uma vez e fica guardada aqui. */
  bibleVersion: string | null;
  /** Preferências do painel, guardadas junto (o armazenamento do navegador do
   *  painel não sobrevive a reabrir o app). */
  zoom: number;
  history: unknown[];
  /** Onde o painel parou (livro, capítulo, versão, marcados, rolagem) — ao
   *  trocar de aba no app e voltar, o painel reabre exatamente ali. */
  lastRef: { abbrev: string; chapter: number; version?: string; picked?: number[]; scroll?: number } | null;
  /** Tamanhos das seções ajustados pelas divisórias do painel. */
  layout: {
    textW?: number;
    booksH?: number;
    gridH?: number;
    textH?: number;
  };
}

const DEFAULT_SETTINGS: Settings = { outputs: null, layer: null, verseFadeMs: 1000, verseDelayMs: 800, bibleVersion: null, zoom: 1, history: [], lastRef: null, layout: {} };

/** O que está no ar: um versículo de um capítulo (a UI navega pelo capítulo). */
interface Shown {
  /** Favorito de onde a leitura começou (destaque na lista); pode ficar para trás. */
  favId: string | null;
  version: string;
  abbrev: string;
  book: string;
  chapter: number;
  verse: Verse;
  /** Trecho projetado JUNTO (ex.: Jo 3:15-16): o texto de todos numa tela só. */
  verses?: Verse[];
  /** Próximo versículo do capítulo — o tema pode mostrar ({nextVerse}). */
  next?: Verse;
  /** Posição no capítulo (1-based) e total, para {currentIndex}/{totalCount}. */
  position: number;
  total: number;
}

/** Como o app projetaria AGORA (lido da config pela UI a cada projeção). */
interface Plan {
  layer: number;
  themes: Record<string, Record<string, unknown>>;
  backgrounds: Record<string, { layer: number; src: string; presentation: Record<string, unknown> } | null>;
}

interface LiveRef extends Shown {
  outputs: string[];
  layer: number;
}

interface UiMsg {
  type?: string;
  listId?: string;
  favId?: string;
  title?: string;
  fav?: Omit<Fav, 'id'>;
  shown?: Shown;
  plan?: Plan;
  dir?: -1 | 1;
  together?: boolean;
  at?: number;
  list?: FavList;
  settings?: Partial<Settings>;
}

// Asset do plugin — tipo 'bible' para o app tratar como Bíblia; guid próprio
// para não confundir o indicador "ao vivo" do painel de Bíblia do app.
const ASSET = { guid: 'plugin-versiculos-favoritos', title: 'Bíblia', author: '', type: 'bible', data: {} };

// Tema padrão de Bíblia do Spresenter ("Padrão — Bíblia"), usado até o plugin
// aprender o tema configurado no app.
const FALLBACK_THEME = {
  title: 'Padrão — Bíblia',
  css: {},
  elements: [
    {
      id: 'verso', type: 'TEXT', text: '{verso}', x: 0, y: 0, visible: true, locked: false,
      css: {
        position: 'absolute', left: '9%', top: '0', width: '82%', height: '80%', display: 'flex',
        'flex-direction': 'column', 'justify-content': 'center', 'text-align': 'center',
        'font-family': 'Arial', 'font-size': '62px', 'line-height': '1.3', color: '#ffffff',
      },
    },
    {
      id: 'referencia', type: 'TEXT', text: '{livro} {capitulo}:{versiculo}', x: 0, y: 0, visible: true, locked: false,
      css: {
        position: 'absolute', left: '9%', top: '82%', width: '82%', height: '10%', display: 'flex',
        'flex-direction': 'column', 'justify-content': 'center', 'text-align': 'center',
        'font-family': 'Arial', 'font-size': '34px', 'font-weight': '600', 'letter-spacing': '1px',
        color: 'rgba(255,255,255,0.92)',
      },
    },
    {
      id: 'versao', type: 'TEXT', text: '{versao}', x: 0, y: 0, visible: true, locked: false,
      css: {
        position: 'absolute', left: '9%', top: '92%', width: '82%', height: '6%', display: 'flex',
        'flex-direction': 'column', 'justify-content': 'center', 'text-align': 'center',
        'font-family': 'Arial', 'font-size': '20px', 'font-weight': '600', 'letter-spacing': '4px',
        color: 'rgba(255,255,255,0.5)',
      },
    },
  ],
};

const STORE = { lists: 'lists', activeList: 'activeList', learned: 'learned', settings: 'settings' };
// Folga depois do fade antes de limpar o conteúdo (o fade dura o transitionMs
// da camada, configurado no app).
const CLEAR_MARGIN_MS = 150;
// Conteúdo novo passa por uma sincronização entre as telas antes de aparecer
// (~120-150 ms). Camada escondida só é revelada depois disso — senão o fade
// corre com a camada vazia e o versículo "pula" na tela já opaco.
const REVEAL_AFTER_MS = 250;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ── Estado ────────────────────────────────────────────────────────────────
let lists: FavList[] = [];
let activeListId = '';
let learned: Learned = { themes: {}, layer: null, version: null };
let settings: Settings = { ...DEFAULT_SETTINGS };
let live: LiveRef | null = null;
let outputs: { index: number; name: string }[] = [];
let layers: { index: number; name?: string }[] = [];

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// Camada "Conteúdo" (ou a 1) — o mesmo critério que o app usa sem configuração.
function defaultContentLayer(): number {
  const byName = layers.findIndex((l) => l.name === 'Conteúdo');
  if (byName >= 0) return layers[byName].index;
  return Math.min(1, Math.max(0, layers.length - 1));
}

const targetLayer = () => settings.layer ?? learned.layer ?? defaultContentLayer();
const targetOutputs = () => settings.outputs ?? outputs.map((o) => String(o.index));

// ── Persistência ──────────────────────────────────────────────────────────
async function save(...keys: (keyof typeof STORE)[]) {
  for (const k of keys) {
    const value = { lists, activeList: activeListId, learned, settings }[k];
    await spresenter.storage.set(STORE[k], value);
  }
}

async function load() {
  const [l, a, le, s] = await Promise.all([
    spresenter.storage.get<FavList[]>(STORE.lists),
    spresenter.storage.get<string>(STORE.activeList),
    spresenter.storage.get<Learned>(STORE.learned),
    spresenter.storage.get<Settings>(STORE.settings),
  ]);
  lists = Array.isArray(l) && l.length ? l : [{ id: uid(), title: 'Minha pregação', items: [] }];
  activeListId = a && lists.some((x) => x.id === a) ? a : lists[0].id;
  if (le) learned = { themes: le.themes ?? {}, layer: le.layer ?? null, version: le.version ?? null };
  if (s) settings = { ...DEFAULT_SETTINGS, ...s };

  [outputs, layers] = await Promise.all([spresenter.outputs.list(), spresenter.layers.list()]);
  for (const o of outputs) await learnFrom(String(o.index));
}

// ── Aprender tema/camada com o painel de Bíblia do app ───────────────────
async function learnFrom(output: string) {
  try {
    const arr = await spresenter.live.read(output);
    arr.forEach((p, layer) => {
      const pres = p as {
        asset?: { type?: string; guid?: string };
        theme?: Record<string, unknown>;
        props?: { version?: string };
      } | null;
      if (!pres?.asset || pres.asset.type !== 'bible' || pres.asset.guid === ASSET.guid || !pres.theme) return;
      const version = pres.props?.version || learned.version;
      const changed = JSON.stringify(learned.themes[output]) !== JSON.stringify(pres.theme)
        || learned.layer !== layer || learned.version !== version;
      if (!changed) return;
      learned.themes[output] = pres.theme;
      learned.layer = layer;
      learned.version = version ?? null;
      void save('learned');
      pushState();
    });
  } catch { /* saída sumiu; ignora */ }
}

spresenter.on('live', (e) => {
  const output = (e as { output?: string | number } | undefined)?.output;
  if (output !== undefined) void learnFrom(String(output));
});

// ── Projeção ──────────────────────────────────────────────────────────────
// A UI lê a Bíblia e decide QUAL versículo mostrar (inclusive avançar pelo
// capítulo além do favorito); aqui só monta e aplica a apresentação.
/** "15-16", "15,17", "1-3,5" — números de um trecho para {versiculo}. */
function verseLabel(vs: Verse[]): string {
  const nums = vs.map((v) => v.verse).sort((a, b) => a - b);
  const parts: string[] = [];
  let start = nums[0];
  let prev = nums[0];
  for (const n of [...nums.slice(1), Infinity]) {
    if (n === prev + 1) { prev = n; continue; }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = prev = n;
  }
  return parts.join(',');
}

/** 22 → "²²": número pequeno antes de cada versículo do trecho. Caracteres
 *  Unicode (não HTML), então aparece em qualquer tema. */
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const superscript = (n: number) => String(n).replace(/\d/g, (d) => SUP[Number(d)]);

function buildPresentation(sh: Shown, output: string, plan: Plan | null) {
  const group = sh.verses && sh.verses.length > 1 ? sh.verses : null;
  return {
    asset: ASSET,
    // Tema da saída nas Configurações do app; sem config, o último que o app usou.
    theme: plan?.themes[output] ?? learned.themes[output] ?? (FALLBACK_THEME as Record<string, unknown>),
    props: {
      index: sh.position - 1,
      // Trecho junto: os textos em sequência e o número como "15-16".
      text: group ? group.map((v) => `${superscript(v.verse)}\u2009${v.text}`).join(' ') : sh.verse.text,
      book: sh.book,
      chapter: sh.chapter,
      verse: group ? verseLabel(group) : sh.verse.verse,
      version: sh.version,
      nextVerse: sh.next ? sh.next.text.replace(/<[^>]*>/g, '') : '',
      currentIndex: String(sh.position),
      totalCount: String(sh.total),
    },
  };
}

/** Fundo por tipo da Bíblia (Configurações › Camadas), como o app faz ao ir ao
 *  ar: vai para a camada de fundo e não é reenviado se já está lá — senão o
 *  vídeo reiniciaria a cada versículo. */
// Fundo por tipo que está no ar junto com o versículo, por saída — sai junto
// no "Tirar do ar"/Esc.
const bgOnAir = new Map<string, { layer: number; src: string }>();

const srcAt = async (output: string, layer: number) => {
  const p = (await spresenter.live.read(output))[layer] as { asset?: { data?: { src?: string } } } | null;
  return p?.asset?.data?.src;
};

async function applyTypeBackground(output: string, layer: number, plan: Plan | null): Promise<number | null> {
  const bg = plan?.backgrounds[output];
  if (!bg || bg.layer === layer) return null;
  bgOnAir.set(output, { layer: bg.layer, src: bg.src });
  try {
    const current = (await spresenter.live.read(output))[bg.layer] as { asset?: { data?: { src?: string } } } | null;
    const state = (await spresenter.live.readState(output))[bg.layer];
    if (current?.asset?.data?.src === bg.src && state?.show !== false) return null;
  } catch { /* sem leitura: aplica */ }
  // Entra escondido; `show` revela junto com o versículo (fade).
  await spresenter.live.apply(output, bg.layer, bg.presentation as never);
  return bg.layer;
}

// Último plano recebido — reaplicar (troca de telas/camada) usa o mesmo.
let lastPlan: Plan | null = null;

async function show(sh: Shown, plan: Plan | null) {
  if (plan) lastPlan = plan;
  const p = plan ?? lastPlan;
  const outs = targetOutputs();
  // Camada fixada pelo operador > camada da Bíblia nas Configurações do app.
  const layer = settings.layer ?? p?.layer ?? targetLayer();

  // Mudou de saída/camada desde o último: limpa onde estava.
  if (live && (live.layer !== layer || live.outputs.some((o) => !outs.includes(o)))) {
    for (const o of live.outputs) {
      if (live.layer !== layer || !outs.includes(o)) await spresenter.live.clear(o, live.layer);
    }
  }

  const seq = ++fadeSeq;
  // Camadas a revelar (estavam escondidas). Ordem de entrada: FUNDO primeiro,
  // VERSÍCULO depois — e só após o conteúdo chegar às telas, para o fade
  // acontecer com o conteúdo e não com a camada vazia.
  const verses: string[] = [];
  const bgs: { output: string; layer: number }[] = [];
  for (const o of outs) {
    let hidden = true;
    try { hidden = (await spresenter.live.readState(o))[layer]?.show !== true; } catch { /* assume escondida */ }
    await spresenter.live.apply(o, layer, buildPresentation(sh, o, p));
    if (hidden) verses.push(o);
    const bgLayer = await applyTypeBackground(o, layer, p);
    if (bgLayer !== null) bgs.push({ output: o, layer: bgLayer });
  }
  live = { ...sh, outputs: outs, layer };
  if (!verses.length && !bgs.length) return;

  // Em segundo plano: o painel já mostra o versículo "no ar" enquanto a
  // sequência de fades acontece na tela.
  void (async () => {
    await sleep(REVEAL_AFTER_MS);
    if (seq !== fadeSeq) return; // outro versículo/Esc no meio-tempo
    for (const b of bgs) await spresenter.live.setState(b.output, b.layer, { show: true });
    if (bgs.length) {
      await sleep(settings.verseDelayMs);
      if (seq !== fadeSeq) return;
    }
    await fadeVerses(verses, layer, true);
  })();
}

// Cada entrada/saída ganha um número; uma etapa atrasada de uma sequência
// antiga não mexe na tela se outra já começou.
let fadeSeq = 0;

/** Fade do VERSÍCULO com a duração escolhida no plugin. O `transitionMs` da
 *  camada é trocado só durante o fade e depois volta ao valor do app — a troca
 *  de versículo a versículo continua na velocidade normal. */
async function fadeVerses(outputs: string[], layer: number, show: boolean) {
  const ms = settings.verseFadeMs;
  const original: Record<string, number | undefined> = {};
  for (const o of outputs) {
    try { original[o] = (await spresenter.live.readState(o))[layer]?.transitionMs; } catch { /* sem leitura */ }
    await spresenter.live.setState(o, layer, { show, transitionMs: ms });
  }
  setTimeout(async () => {
    for (const o of outputs) {
      const back = original[o];
      if (typeof back === 'number' && back !== ms) await spresenter.live.setState(o, layer, { transitionMs: back });
    }
  }, ms + 100);
}

async function clearLive() {
  if (!live) return;
  const { outputs: outs, layer } = live;
  live = null;

  // Fundo por tipo: só sai se ainda for o que entrou com o versículo (o
  // operador pode ter trocado o fundo à mão no meio-tempo).
  const bgs: { output: string; layer: number }[] = [];
  for (const [o, bg] of bgOnAir) {
    try { if ((await srcAt(o, bg.layer)) === bg.src) bgs.push({ output: o, layer: bg.layer }); } catch { /* ignora */ }
  }
  bgOnAir.clear();

  // Saída na ordem inversa da entrada: VERSÍCULO sai (fade), depois o FUNDO.
  // Só limpa o conteúdo depois que cada fade terminou. Roda em segundo plano.
  const seq = ++fadeSeq;
  void fadeOut(seq, outs, layer, bgs);
}

async function fadeOut(seq: number, outs: string[], layer: number, bgs: { output: string; layer: number }[]) {
  await fadeVerses(outs, layer, false);
  await sleep(settings.verseFadeMs + CLEAR_MARGIN_MS);
  if (seq !== fadeSeq) return; // algo novo entrou no meio-tempo
  for (const o of outs) await spresenter.live.clear(o, layer);
  if (!bgs.length) return;

  let bgFadeMs = 500;
  for (const b of bgs) {
    try {
      const ms = (await spresenter.live.readState(b.output))[b.layer]?.transitionMs;
      if (typeof ms === 'number') bgFadeMs = Math.max(bgFadeMs, ms);
    } catch { /* fica o padrão */ }
    await spresenter.live.setState(b.output, b.layer, { show: false });
  }
  await sleep(bgFadeMs + CLEAR_MARGIN_MS);
  if (seq !== fadeSeq) return;
  for (const b of bgs) await spresenter.live.clear(b.output, b.layer);
}

// ── UI ────────────────────────────────────────────────────────────────────
function pushState() {
  spresenter.ui.postMessage({
    type: 'state',
    lists,
    activeListId,
    live,
    settings,
    outputs,
    layers,
    effective: { outputs: targetOutputs(), layer: targetLayer() },
    learnedOutputs: Object.keys(learned.themes),
    learnedLayer: learned.layer,
    learnedVersion: learned.version,
  });
}

const activeList = () => lists.find((l) => l.id === activeListId) ?? lists[0];

const ready = load().catch(() => {
  lists = [{ id: uid(), title: 'Minha pregação', items: [] }];
  activeListId = lists[0].id;
});

spresenter.ui.onmessage = async (raw: unknown) => {
  const msg = raw as UiMsg;
  if (!msg || typeof msg !== 'object') return;
  await ready;

  switch (msg.type) {
    case 'init':
      break;

    // Listas (pregações)
    case 'list-add': {
      const list = { id: uid(), title: msg.title?.trim() || 'Nova pregação', items: [] };
      lists.push(list);
      activeListId = list.id;
      await save('lists', 'activeList');
      break;
    }
    case 'list-select':
      if (msg.listId && lists.some((l) => l.id === msg.listId)) activeListId = msg.listId;
      await save('activeList');
      break;
    case 'list-rename': {
      const l = lists.find((x) => x.id === msg.listId);
      if (l && msg.title?.trim()) l.title = msg.title.trim();
      await save('lists');
      break;
    }
    case 'list-delete': {
      lists = lists.filter((l) => l.id !== msg.listId);
      if (!lists.length) lists = [{ id: uid(), title: 'Minha pregação', items: [] }];
      if (!lists.some((l) => l.id === activeListId)) activeListId = lists[0].id;
      await save('lists', 'activeList');
      break;
    }
    case 'list-restore': {
      // Desfazer exclusão de uma lista inteira.
      if (msg.list && !lists.some((l) => l.id === msg.list!.id)) {
        lists.splice(Math.min(msg.at ?? lists.length, lists.length), 0, msg.list);
        activeListId = msg.list.id;
        await save('lists', 'activeList');
      }
      break;
    }

    // Favoritos
    case 'fav-add': {
      if (!msg.fav?.verses?.length) break;
      activeList().items.push({ ...msg.fav, id: uid() });
      await save('lists');
      break;
    }
    case 'fav-delete': {
      const l = activeList();
      l.items = l.items.filter((f) => f.id !== msg.favId);
      if (live?.favId === msg.favId) await clearLive();
      await save('lists');
      break;
    }
    case 'fav-restore': {
      // Desfazer: volta o favorito para a mesma posição.
      const l = lists.find((x) => x.id === msg.listId) ?? activeList();
      const fav = msg.fav as Fav | undefined;
      if (fav && !l.items.some((f) => f.id === fav.id)) {
        l.items.splice(Math.min(msg.at ?? l.items.length, l.items.length), 0, fav);
        await save('lists');
      }
      break;
    }
    case 'fav-together': {
      const f = activeList().items.find((x) => x.id === msg.favId);
      if (f) {
        f.together = !!msg.together;
        await save('lists');
      }
      break;
    }
    case 'fav-move': {
      const l = activeList();
      const i = l.items.findIndex((f) => f.id === msg.favId);
      const j = i + (msg.dir ?? 0);
      if (i >= 0 && j >= 0 && j < l.items.length) {
        [l.items[i], l.items[j]] = [l.items[j], l.items[i]];
        await save('lists');
      }
      break;
    }

    // Projeção
    case 'show':
      if (msg.shown?.verse) await show(msg.shown, msg.plan ?? null);
      break;
    case 'clear':
      await clearLive();
      break;

    // Configurações de projeção
    case 'settings': {
      const before = JSON.stringify([settings.outputs, settings.layer]);
      settings = { ...settings, ...msg.settings };
      await save('settings');
      // No ar: reaplica só se mudaram as telas ou a camada (tempos de fade não).
      if (live && JSON.stringify([settings.outputs, settings.layer]) !== before) await show(live, null);
      break;
    }
    case 'forget-theme':
      learned = { themes: {}, layer: null, version: null };
      await save('learned');
      break;
  }

  pushState();
};

// eslint-disable-next-line no-console
console.log('Plugin loaded:', spresenter.manifest.name);
