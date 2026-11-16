import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode, type CSSProperties, type UIEvent as ReactUIEvent } from 'react';
import { postMessage, onMessage } from '@spresenter/plugin-sdk/ui';
import { planFor, type OutputPlan } from './appConfig';
import { TypeToJump } from './TypeToJump';
import { Grip } from './Resizer';
import { useGridColumns } from './useGridColumns';

// IMPORTANTE: o app abre esta UI num iframe `sandbox="allow-scripts"` — SEM
// `allow-forms`. Envio de <form> é bloqueado ali (nem o onSubmit dispara), então
// nada aqui usa <form>: Enter é tratado no onKeyDown e o resto é onClick.

interface Verse { verse: number; text: string }
interface Fav { id: string; version: string; abbrev: string; book: string; chapter: number; verses: Verse[]; together?: boolean }
/** Favorito de vários versículos vai ao ar com todos juntos (a menos que o operador peça um por vez). */
const isTogether = (f: Fav) => f.verses.length > 1 && f.together !== false;
interface FavList { id: string; title: string; items: Fav[] }
/** Versículo no ar (vem do code.ts). */
interface LiveRef {
  favId: string | null;
  version: string;
  abbrev: string;
  book: string;
  chapter: number;
  verse: Verse;
  /** Trecho no ar junto (ex.: 15-16). */
  verses?: Verse[];
  position: number;
  total: number;
  outputs: string[];
  layer: number;
}
/** Onde a leitura está — atualizado na hora do clique (antes da resposta). */
interface Cursor { favId: string | null; version: string; abbrev: string; book: string; chapter: number; verse: number; group?: number[] }
interface Settings {
  outputs: string[] | null; layer: number | null; verseFadeMs?: number; verseDelayMs?: number; bibleVersion?: string | null;
  zoom?: number; history?: HistItem[]; lastRef?: LastRef | null; layout?: LayoutSizes;
}
/** Tamanhos escolhidos para as seções (px sem zoom; largura do Texto em %). */
interface LayoutSizes {
  textW?: number;
  booksH?: number;
  gridH?: number;
  textH?: number;
}
interface Output { index: number; name: string }
interface Layer { index: number; name?: string }
interface State {
  lists: FavList[];
  activeListId: string;
  live: LiveRef | null;
  settings: Settings;
  outputs: Output[];
  layers: Layer[];
  effective: { outputs: string[]; layer: number };
  learnedOutputs: string[];
  learnedLayer: number | null;
  /** Bíblia em uso no painel de Bíblia do app (aprendida do que ele projetou). */
  learnedVersion: string | null;
}

interface Book { abbrev: string; name: string; chapters: number }
interface Hit { version: string; abbrev: string; bookName: string; chapter: number; verse: number; text: string }

// ── Bíblia instalada no app ───────────────────────────────────────────────
// A UI é servida pelo próprio servidor do Spresenter, que libera CORS — as
// rotas locais da Bíblia respondem daqui direto.
const bibleUrl = (path: string) => new URL(path, window.location.href).toString();

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(bibleUrl(path));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

const getBooks = (version: string) => getJson<Book[]>(`/bible/${encodeURIComponent(version)}`);

async function getChapter(version: string, abbrev: string, chapter: number): Promise<Verse[]> {
  const book = await getJson<{ verses?: Verse[] }>(
    `/bible/${encodeURIComponent(version)}/${encodeURIComponent(abbrev)}/${chapter}`,
  );
  return (book.verses ?? []).map((v) => ({ verse: v.verse, text: v.text }));
}

// Capítulos e livros já lidos — avançar versículo a versículo não refaz busca.
const chapterCache = new Map<string, Promise<Verse[]>>();
const booksCache = new Map<string, Promise<Book[]>>();

function cachedChapter(version: string, abbrev: string, chapter: number): Promise<Verse[]> {
  const key = `${version}|${abbrev}|${chapter}`;
  if (!chapterCache.has(key)) {
    chapterCache.set(key, getChapter(version, abbrev, chapter).catch((e) => { chapterCache.delete(key); throw e; }));
  }
  return chapterCache.get(key)!;
}

function cachedBooks(version: string): Promise<Book[]> {
  if (!booksCache.has(version)) {
    booksCache.set(version, getBooks(version).catch((e) => { booksCache.delete(version); throw e; }));
  }
  return booksCache.get(version)!;
}

/** Versão curta para a etiqueta: "King James 1911" → "KJ1911"; "NVI" fica. */
const shortVersion = (v: string) =>
  v.length <= 5 ? v : v.split(/\s+/).map((w) => (/\d/.test(w) ? w : w[0].toUpperCase())).join('');

const stripTags = (s: string) => s.replace(/<[^>]*>/g, '');

/** "Salmos 23:1-3,5" — junta números seguidos em intervalos. */
function refLabel(book: string, chapter: number, verses: { verse: number }[]): string {
  if (!verses.length) return `${book} ${chapter}`;
  const nums = [...verses.map((v) => v.verse)].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = nums[0];
  let prev = nums[0];
  for (const n of [...nums.slice(1), Infinity]) {
    if (n === prev + 1) { prev = n; continue; }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = prev = n;
  }
  return `${book} ${chapter}:${parts.join(',')}`;
}

// ── Ícones ────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }: { d: ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const IcBook = <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>;
const IcPlay = <path d="M7 4l13 8-13 8z" fill="currentColor" />;
const IcStar = <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />;
const IcTrash = <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></>;
const IcLeft = <path d="M15 18l-6-6 6-6" />;
const IcRight = <path d="M9 18l6-6-6-6" />;
const IcPlus = <path d="M12 5v14M5 12h14" />;
const IcEdit = <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>;
const IcX = <path d="M18 6L6 18M6 6l12 12" />;
const IcCheck = <path d="M20 6L9 17l-5-5" />;
const IcList = <><path d="M10 6h11M10 12h11M10 18h11" /><path d="M4 6h1M4 12h1M4 18h1" /></>;
const IcSearch = <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>;

type Undo =
  | { kind: 'fav'; listId: string; fav: Fav; at: number }
  | { kind: 'list'; list: FavList; at: number }
  | { kind: 'history'; prev: HistItem[]; text: string; at: number };


// Cores por grupo de livros (estilo Holyrics, em tom suave). Só para Bíblias
// de 66 livros; outras usam a cor do app.
const BOOK_GROUPS = [
  { to: 5, color: '#c06a2b' }, // Pentateuco
  { to: 17, color: '#e3902f' }, // Históricos
  { to: 22, color: '#d9484b' }, // Poéticos
  { to: 39, color: '#9b52c9' }, // Profetas
  { to: 43, color: '#4062d8' }, // Evangelhos
  { to: 44, color: '#2ba8d2' }, // Atos
  { to: 65, color: '#3ba35e' }, // Epístolas
  { to: 66, color: '#a3bd2c' }, // Apocalipse
];
const bookColor = (i: number, total: number) =>
  total === 66 ? BOOK_GROUPS.find((g) => i < g.to)?.color ?? 'var(--sp-primary)' : 'var(--sp-primary)';

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 1.6;

/** Onde o painel parou — volta igual ao trocar de aba no app e retornar. */
interface LastRef { abbrev: string; chapter: number; version?: string; picked?: number[]; scroll?: number }

/** Histórico de referências abertas (guardado nas configurações do plugin). */
interface HistItem { version: string; abbrev: string; name: string; chapter: number; verses: number[] }

/** Padrão escolhido no plugin → a que o app projetou por último → 'nvi' →
 *  primeira instalada (mesma reserva do app). Não instalada é ignorada. */
function resolveVersion(installed: string[], ...prefs: (string | null | undefined)[]): string {
  for (const c of [...prefs, 'nvi']) if (c && installed.includes(c)) return c;
  return installed[0] ?? '';
}

const onEnter = (fn: () => void) => (e: ReactKeyboardEvent) => {
  if (e.key === 'Enter') { e.preventDefault(); fn(); }
};

export function App() {
  const [st, setSt] = useState<State | null>(null);
  const [versions, setVersions] = useState<string[]>([]);
  const [version, setVersion] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [book, setBook] = useState<Book | null>(null);
  const [chapter, setChapter] = useState(0);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [undo, setUndo] = useState<Undo | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const undoTimer = useRef<number>();
  const noticeTimer = useRef<number>();

  // Tamanho do painel (A− / A+): guardado nas configurações do plugin, então
  // volta igual ao reabrir o painel ou o app. O valor local responde na hora.
  const [zoomNow, setZoomNow] = useState<number | null>(null);
  const zoom = zoomNow ?? st?.settings.zoom ?? 1;
  const changeZoom = (delta: number) => {
    const next = Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom + delta)) * 10) / 10;
    setZoomNow(next);
    postMessage({ type: 'settings', settings: { zoom: next } });
  };

  // Tamanhos das seções (arrastando as divisórias). O valor local responde na
  // hora; grava nas configurações do plugin ao soltar.
  const [layoutNow, setLayoutNow] = useState<LayoutSizes | null>(null);
  const layoutNowRef = useRef<LayoutSizes | null>(null);
  const layout = layoutNow ?? st?.settings.layout ?? {};
  const setLayout = (patch: Partial<LayoutSizes>, remove?: keyof LayoutSizes) => {
    const next = { ...(layoutNowRef.current ?? st?.settings.layout ?? {}), ...patch };
    if (remove) delete next[remove];
    layoutNowRef.current = next;
    setLayoutNow(next);
  };
  const commitLayout = () => {
    postMessage({ type: 'settings', settings: { layout: layoutNowRef.current ?? st?.settings.layout ?? {} } });
  };
  const resetLayout = (key: keyof LayoutSizes) => {
    const next = { ...(layoutNowRef.current ?? st?.settings.layout ?? {}) };
    delete next[key];
    layoutNowRef.current = next;
    setLayoutNow(next);
    postMessage({ type: 'settings', settings: { layout: next } });
  };
  const layoutVars: Record<string, string> = {};
  if (layout.booksH) layoutVars['--vf-books-h'] = `${layout.booksH}px`;
  if (layout.gridH) layoutVars['--vf-grid-h'] = `${layout.gridH}px`;
  if (layout.textH) layoutVars['--vf-text-h'] = `${layout.textH}px`;
  if (layout.textW) layoutVars['--vf-text-w'] = `${layout.textW}%`;

  // Medidas das seções para as divisórias (px já renderizados, sem o zoom).
  const bibleRef = useRef<HTMLDivElement>(null);
  const textPaneRef = useRef<HTMLElement>(null);
  const tilesRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const versesGridRef = useRef<HTMLDivElement>(null);
  // Timers das barras de rolagem (aparecem ao rolar e somem depois).
  const scrollTimers = useRef(new WeakMap<Element, number>());
  const sizeOf = (el: HTMLElement | null, axis: 'x' | 'y') => {
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return axis === 'x' ? r.width : r.height;
  };
  const textWidthPct = (px: number) => {
    const total = bibleRef.current?.getBoundingClientRect().width ?? 0;
    if (!total) return 0;
    return Math.round(Math.min(65, Math.max(25, ((px * (zoom || 1)) / total) * 100)) * 10) / 10;
  };

  // Colunas uniformes que deixam o menor espaço vazio na última linha.
  const booksCols = useGridColumns(tilesRef, { count: books.length, minW: 68, minH: 36 });
  const chaptersCols = useGridColumns(gridRef, { count: book?.chapters ?? 0, minW: 46, minH: 34 });
  const versesCols = useGridColumns(versesGridRef, { count: verses.length, minW: 46, minH: 40 });
  const colsStyle = (cols: number) =>
    cols ? ({ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } as CSSProperties) : undefined;

  useEffect(() => {
    const off = onMessage((raw) => {
      const msg = raw as { type?: string } & State;
      if (msg.type === 'state') setSt(msg);
    });
    postMessage({ type: 'init' });
    getJson<string[]>('/bible/versions')
      .then(setVersions)
      .catch(() => setError('Não consegui ler as Bíblias instaladas no Spresenter.'));
    return off;
  }, []);

  // Livros da versão escolhida.
  useEffect(() => {
    if (!version) return;
    getBooks(version)
      .then(setBooks)
      .catch(() => setError(`Não consegui abrir a Bíblia ${version}.`));
  }, [version]);

  // Bíblia padrão: a "Bíblia padrão" das Configurações do app fica guardada só
  // na janela principal (plugins não enxergam), então o plugin guarda a sua —
  // escolhida no seletor. Sem escolha, usa a última que o app projetou.
  const savedVersion = st?.settings.bibleVersion ?? null;
  const systemVersion = st?.learnedVersion ?? null;
  const defaultVersion = versions.length ? resolveVersion(versions, savedVersion, systemVersion) : '';
  useEffect(() => {
    if (defaultVersion) setVersion(defaultVersion);
  }, [defaultVersion]);

  const list = useMemo(() => st?.lists.find((l) => l.id === st.activeListId) ?? st?.lists[0], [st]);
  const live = st?.live ?? null;
  const stRef = useRef(st);
  stRef.current = st;

  // Tema e fundo de cada saída (para "Onde projetar"); relido de tempos em tempos.
  const [outPlan, setOutPlan] = useState<OutputPlan | null>(null);
  const outputsKey = st?.outputs.map((o) => o.index).join(',') ?? '';
  useEffect(() => {
    if (!outputsKey) return;
    const all = outputsKey.split(',');
    const load = () => planFor(all).then(setOutPlan).catch(() => {});
    load();
    const id = window.setInterval(load, 5000);
    return () => window.clearInterval(id);
  }, [outputsKey]);

  // ── No ar: leitura livre pelo capítulo ──────────────────────────────────
  // O favorito é só o PONTO DE PARTIDA: ◀ ▶ andam pelo capítulo inteiro e, no
  // fim, seguem para o próximo capítulo (no começo, voltam para o anterior).
  const cursor = useRef<Cursor | null>(null);
  const [liveVerses, setLiveVerses] = useState<Verse[]>([]);
  const [navError, setNavError] = useState('');

  // Painel reaberto com algo no ar: retoma de onde está.
  useEffect(() => {
    if (!live) { cursor.current = null; return; }
    if (!cursor.current) {
      cursor.current = {
        favId: live.favId, version: live.version, abbrev: live.abbrev, book: live.book, chapter: live.chapter,
        verse: live.verse.verse, group: live.verses?.map((v) => v.verse),
      };
    }
  }, [live]);

  // Números do capítulo no ar (faixa do rodapé).
  useEffect(() => {
    if (!live) { setLiveVerses([]); return; }
    cachedChapter(live.version, live.abbrev, live.chapter).then(setLiveVerses).catch(() => setLiveVerses([]));
  }, [live?.version, live?.abbrev, live?.chapter]);

  const showVerse = async (c: Cursor) => {
    const vs = await cachedChapter(c.version, c.abbrev, c.chapter);
    // Trecho junto: todos os versículos do grupo numa tela só.
    const group = c.group && c.group.length > 1 ? vs.filter((v) => c.group!.includes(v.verse)) : [];
    const first = group[0]?.verse ?? c.verse;
    const i = vs.findIndex((v) => v.verse === first);
    if (i < 0) return;
    const last = group.length ? vs.findIndex((v) => v.verse === group[group.length - 1].verse) : i;
    cursor.current = { ...c, verse: first, group: group.length > 1 ? group.map((v) => v.verse) : undefined };
    setNavError('');
    // Tema/fundo/camada como estão AGORA nas Configurações do app.
    let plan: OutputPlan | null = null;
    try { plan = await planFor(stRef.current?.effective.outputs ?? []); } catch { /* usa o último */ }
    if (plan) setOutPlan(plan);
    postMessage({
      type: 'show',
      plan,
      shown: {
        favId: c.favId, version: c.version, abbrev: c.abbrev, book: c.book, chapter: c.chapter,
        verse: vs[i], verses: group.length > 1 ? group : undefined, next: vs[last + 1], position: i + 1, total: vs.length,
      },
    });
  };

  const presentFav = (f: Fav, verse = f.verses[0]?.verse) => {
    if (verse === undefined) return;
    const group = isTogether(f) ? f.verses.map((v) => v.verse) : undefined;
    showVerse({ favId: f.id, version: f.version, abbrev: f.abbrev, book: f.book, chapter: f.chapter, verse, group })
      .catch(() => setNavError(`Não consegui abrir ${f.book} ${f.chapter} na ${f.version}.`));
    // Os quadros de baixo (Livros · Capítulo · Versículo · Texto) mostram o favorito.
    const b = books.find((x) => x.abbrev === f.abbrev) ?? { abbrev: f.abbrev, name: f.book, chapters: 0 };
    void openChapter(b, f.chapter, f.verses.map((v) => v.verse), f.version);
  };

  const goTo = (verse: number) => {
    const c = cursor.current;
    if (c) void showVerse({ ...c, verse, group: undefined });
  };

  const stepVerse = async (dir: 1 | -1) => {
    const c = cursor.current;
    if (!c) return;
    try {
      const vs = await cachedChapter(c.version, c.abbrev, c.chapter);
      // Saindo de um trecho junto: segue do último (▶) ou do primeiro (◀), um a um.
      const from = c.group?.length ? (dir > 0 ? c.group[c.group.length - 1] : c.group[0]) : c.verse;
      const i = vs.findIndex((v) => v.verse === from) + dir;
      if (i >= 0 && i < vs.length) {
        await showVerse({ ...c, verse: vs[i].verse, group: undefined });
        return;
      }
      // Passou do capítulo: vai para o vizinho.
      const bk = (await cachedBooks(c.version)).find((b) => b.abbrev === c.abbrev);
      const ch = c.chapter + dir;
      if (!bk || ch < 1 || ch > bk.chapters) return;
      const other = await cachedChapter(c.version, c.abbrev, ch);
      const target = dir > 0 ? other[0] : other[other.length - 1];
      if (target) await showVerse({ ...c, chapter: ch, verse: target.verse, group: undefined });
    } catch {
      setNavError('Não consegui abrir o próximo versículo.');
    }
  };

  // ← / → avançam a leitura; Esc tira do ar (fora de campos de texto).
  const stepRef = useRef(stepVerse);
  stepRef.current = stepVerse;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || !live) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); void stepRef.current(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); void stepRef.current(-1); }
      if (e.key === 'Escape') postMessage({ type: 'clear' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [live]);

  // Mantém o número no ar visível na faixa do rodapé.
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Só a faixa rola (scrollIntoView rolaria o painel inteiro junto).
    const strip = stripRef.current;
    const el = strip?.querySelector('.is-on') as HTMLElement | null;
    if (strip && el) strip.scrollLeft = el.offsetLeft - strip.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2;
  }, [live?.verse.verse, liveVerses]);

  // Painel "Texto": rola até um versículo (só o painel, não a página inteira).
  const versesRef = useRef<HTMLDivElement>(null);
  const scrollToVerse = (n?: number) => {
    const box = versesRef.current;
    if (!box) return;
    const el = (n === undefined
      ? box.querySelector('.vf-verse.is-on')
      : box.querySelector(`[data-verse="${n}"]`)) as HTMLElement | null;
    box.scrollTop = el ? el.offsetTop - box.offsetTop - 8 : 0;
  };
  // Abriu um capítulo já com versículos marcados (busca/digitação): rola até o primeiro.
  // Voltando ao painel: a rolagem salva vale no lugar da automática.
  const pendingScroll = useRef<number | null>(null);
  useEffect(() => {
    if (pendingScroll.current !== null && versesRef.current) {
      versesRef.current.scrollTop = pendingScroll.current;
      pendingScroll.current = null;
      return;
    }
    scrollToVerse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verses]);

  const flash = (text: string) => {
    setNotice(text);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 2500);
  };

  // ── Navegação da Bíblia ─────────────────────────────────────────────────
  const openBook = (b: Book) => {
    // Como no app: escolher o livro já abre o capítulo 1.
    void openChapter(b, 1);
  };

  // Histórico (faixa no topo): referências abertas com versículo escolhido.
  const [historyNow, setHistoryNow] = useState<HistItem[] | null>(null);
  const history = historyNow ?? st?.settings.history ?? [];
  const historyRef = useRef(history);
  historyRef.current = history;
  const remember = (h: HistItem) => {
    const same = (x: HistItem) => x.abbrev === h.abbrev && x.chapter === h.chapter && x.verses.join() === h.verses.join();
    const next = [h, ...historyRef.current.filter((x) => !same(x))].slice(0, 12);
    setHistoryNow(next);
    historyRef.current = next;
    postMessage({ type: 'settings', settings: { history: next } });
  };

  // Remover do histórico (com "Desfazer" no rodapé): guarda o array anterior
  // inteiro, então o desfazer vale tanto para um item quanto para o "Limpar".
  const writeHistory = (next: HistItem[], text: string) => {
    const prev = historyRef.current;
    setHistoryNow(next);
    historyRef.current = next;
    postMessage({ type: 'settings', settings: { history: next } });
    showUndo({ kind: 'history', prev, text, at: 0 });
  };
  const sameHist = (a: HistItem, b: HistItem) =>
    a.abbrev === b.abbrev && a.chapter === b.chapter && a.verses.join() === b.verses.join();
  const removeHistory = (h: HistItem) => {
    const label = `${h.name} ${refLabel('', h.chapter, h.verses.map((verse) => ({ verse }))).trim()}`;
    writeHistory(historyRef.current.filter((x) => !sameHist(x, h)), `${label} removido do histórico`);
  };
  const clearHistory = () => writeHistory([], 'Histórico limpo');

  const openChapter = async (b: Book, c: number, pick: number[] = [], ver = version) => {
    setLoading(true);
    setError('');
    try {
      const vs = await cachedChapter(ver, b.abbrev, c);
      if (ver !== version) setVersion(ver);
      setBook(b);
      setChapter(c);
      setVerses(vs);
      const marked = pick.filter((n) => vs.some((v) => v.verse === n));
      setPicked(marked);
      if (marked.length) remember({ version: ver, abbrev: b.abbrev, name: b.name, chapter: c, verses: marked });
    } catch {
      setError('Não consegui abrir esse capítulo.');
    } finally {
      setLoading(false);
    }
  };

  // Trocar no seletor já vira o padrão do plugin (fica guardado).
  const changeVersion = (v: string) => {
    setVersion(v);
    postMessage({ type: 'settings', settings: { bibleVersion: v } });
  };

  // Trocou a versão (à mão ou seguindo o sistema): mantém o lugar e reabre o
  // mesmo capítulo na versão nova.
  const openRef = useRef({ book, chapter });
  openRef.current = { book, chapter };
  useEffect(() => {
    const { book: b, chapter: c } = openRef.current;
    if (!version || !b) return;
    cachedChapter(version, b.abbrev, c).then(setVerses).catch(() => setError(`Esse capítulo não abriu em ${version}.`));
  }, [version]);

  // Ao abrir o painel: volta exatamente onde parou (livro, capítulo, versão,
  // versículos marcados e rolagem). Sem nada salvo: primeiro livro, cap. 1.
  const restored = useRef(false);
  useEffect(() => {
    if (book || !books.length || !st) return;
    const last = st.settings.lastRef;
    const b = (last && books.find((x) => x.abbrev === last.abbrev)) || books[0];
    const same = !!last && b.abbrev === last.abbrev;
    const c = same ? Math.min(Math.max(last!.chapter, 1), b.chapters || last!.chapter) : 1;
    const ver = same && last!.version && versions.includes(last!.version) ? last!.version : version;
    if (same && typeof last!.scroll === 'number') pendingScroll.current = last!.scroll;
    void openChapter(b, c, same ? last!.picked ?? [] : [], ver).finally(() => { restored.current = true; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books, !!st]);

  // Guarda onde parou (com uma pausa curta para não gravar a cada movimento).
  const saveTimer = useRef<number>();
  const saveLast = () => {
    if (!restored.current || !book) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const lastRef: LastRef = {
        abbrev: book.abbrev, chapter, version, picked, scroll: versesRef.current?.scrollTop ?? 0,
      };
      postMessage({ type: 'settings', settings: { lastRef } });
    }, 500);
  };
  const saveLastRef = useRef(saveLast);
  saveLastRef.current = saveLast;
  useEffect(() => { saveLastRef.current(); }, [book, chapter, version, picked]);

  const togglePick = (n: number) =>
    setPicked((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n].sort((a, b) => a - b)));

  // Shift+clique marca o trecho inteiro desde o último marcado (22 … 25).
  const lastPick = useRef<number | null>(null);
  const pickVerse = (n: number, range: boolean) => {
    const from = lastPick.current;
    if (range && from !== null && from !== n) {
      const [a, b] = from < n ? [from, n] : [n, from];
      const span = verses.filter((v) => v.verse >= a && v.verse <= b).map((v) => v.verse);
      setPicked((cur) => [...new Set([...cur, ...span])].sort((x, y) => x - y));
    } else {
      togglePick(n);
    }
    lastPick.current = n;
  };

  // Clique duplo: projeta SÓ este versículo (sem precisar favoritar). Os dois
  // cliques do duplo marcam e desmarcam — a marcação fica como estava.
  const projectVerse = (n: number) => {
    if (!book) return;
    showVerse({ favId: null, version, abbrev: book.abbrev, book: book.name, chapter, verse: n })
      .catch(() => setNavError(`Não consegui projetar ${book.name} ${chapter}:${n}.`));
  };

  /** Versículo deste capítulo que está no ar agora (destaque na lateral). */
  const isOnAir = (n: number) =>
    !!live && live.abbrev === book?.abbrev && live.chapter === chapter && live.version === version
    && (live.verses ?? [live.verse]).some((x) => x.verse === n);

  /** Favorito de UM versículo deste capítulo/versão, se existir na pregação. */
  const singleFav = (n: number) =>
    list?.items.find(
      (f) => f.version === version && f.abbrev === book?.abbrev && f.chapter === chapter
        && f.verses.length === 1 && f.verses[0].verse === n,
    );

  // ★ ao lado do versículo: favorita na hora; tocar de novo desfaz.
  const toggleStar = (v: Verse) => {
    if (!book || !list) return;
    const existing = singleFav(v.verse);
    if (existing) {
      deleteFav(existing, list.items.indexOf(existing));
      return;
    }
    postMessage({ type: 'fav-add', fav: { version, abbrev: book.abbrev, book: book.name, chapter, verses: [v] } });
    flash(`★ ${book.name} ${chapter}:${v.verse} adicionado`);
  };

  const addPicked = () => {
    if (!book || !picked.length) return;
    const chosen = verses.filter((v) => picked.includes(v.verse));
    postMessage({ type: 'fav-add', fav: { version, abbrev: book.abbrev, book: book.name, chapter, verses: chosen } });
    flash(`★ ${refLabel(book.name, chapter, chosen)} adicionado`);
    setPicked([]);
  };

  // ── Favoritos / listas ──────────────────────────────────────────────────
  const showUndo = (u: Undo) => {
    setUndo(u);
    window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setUndo(null), 6000);
  };

  const deleteFav = (fav: Fav, at: number) => {
    if (!list) return;
    postMessage({ type: 'fav-delete', favId: fav.id });
    showUndo({ kind: 'fav', listId: list.id, fav, at });
  };

  const deleteList = () => {
    if (!st || !list) return;
    postMessage({ type: 'list-delete', listId: list.id });
    showUndo({ kind: 'list', list, at: st.lists.findIndex((l) => l.id === list.id) });
  };

  const doUndo = () => {
    if (!undo) return;
    if (undo.kind === 'fav') postMessage({ type: 'fav-restore', listId: undo.listId, fav: undo.fav, at: undo.at });
    else if (undo.kind === 'list') postMessage({ type: 'list-restore', list: undo.list, at: undo.at });
    else {
      setHistoryNow(undo.prev);
      historyRef.current = undo.prev;
      postMessage({ type: 'settings', settings: { history: undo.prev } });
    }
    setUndo(null);
  };

  const startRename = () => { setNewTitle(list?.title ?? ''); setRenaming(true); };
  const saveRename = () => {
    if (list && newTitle.trim()) postMessage({ type: 'list-rename', listId: list.id, title: newTitle.trim() });
    setRenaming(false);
  };
  const addList = () => {
    postMessage({ type: 'list-add', title: 'Nova pregação' });
    // Já abre para dar nome.
    setNewTitle('');
    setRenaming(true);
  };

  const updateSettings = (s: Partial<Settings>) => postMessage({ type: 'settings', settings: s });
  const toggleOutput = (id: string) => {
    if (!st) return;
    const cur = st.effective.outputs;
    updateSettings({ outputs: cur.includes(id) ? cur.filter((o) => o !== id) : [...cur, id] });
  };

  if (!st || !list) {
    return <div className="vf"><div className="vf-body"><div className="vf-hint">Carregando…</div></div></div>;
  }

  const autoLayer = outPlan?.layer ?? st.effective.layer;
  const pickedVerses = verses.filter((v) => picked.includes(v.verse));
  const chapterNums = book ? Array.from({ length: book.chapters }, (_, i) => i + 1) : [];

  // Barras de rolagem: aparecem só ao rolar/passar o mouse (classe is-scrolling).
  const fadeScrollbar = (e: ReactUIEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement;
    if (!el?.classList || !el.matches('.vf-tiles, .vf-grid, .vf-verses')) return;
    el.classList.add('is-scrolling');
    const timers = scrollTimers.current;
    const prev = timers.get(el);
    if (prev) window.clearTimeout(prev);
    const t = window.setTimeout(() => {
      timers.delete(el);
      el.classList.remove('is-scrolling');
    }, 900);
    timers.set(el, t);
  };

  return (
    <div className="vf" style={{ zoom, ...layoutVars } as CSSProperties} onScrollCapture={fadeScrollbar}>
      {/* Só digitar (fora de campos): livro → capítulo → versículo, como no app. */}
      <TypeToJump
        books={books}
        getVerses={(b, c) => cachedChapter(version, b.abbrev, c)}
        onSelect={(b, c, v) => { void openChapter(b, c, [v]); }}
      />
      <div className="vf-body">
        {/* Cabeçalho */}
        <div className="vf-top">
          <div className="vf-title"><Icon d={IcBook} /> Bíblia PRO</div>
          <div className="vf-zoom" title="Tamanho do painel">
            <button type="button" onClick={() => changeZoom(-0.1)} disabled={zoom <= ZOOM_MIN}>A−</button>
            <button type="button" className="vf-zoom-val" onClick={() => changeZoom(1 - zoom)} title="Voltar a 100%">{Math.round(zoom * 100)}%</button>
            <button type="button" onClick={() => changeZoom(0.1)} disabled={zoom >= ZOOM_MAX}>A+</button>
          </div>
          {live ? (
            <button
              type="button"
              className="vf-onair"
              title={`${refLabel(live.book, live.chapter, live.verses ?? [live.verse])} no ar — clique (ou Esc) para tirar. ← → passam o versículo.`}
              onClick={() => postMessage({ type: 'clear' })}
            >
              <span className="vf-onair-dot" /> No ar · Tirar
            </button>
          ) : (
            <span className="vf-badge">Fora do ar</span>
          )}
        </div>

        {/* Pregação */}
        {renaming ? (
          <div className="vf-lists">
            <input
              type="text"
              autoFocus
              onFocus={(e) => e.currentTarget.select()}
              placeholder="Nome da pregação (ex.: Domingo — A fé que vence)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setRenaming(false); else onEnter(saveRename)(e); }}
              style={{ flex: 1 }}
            />
            <button type="button" className="vf-btn is-primary" onClick={saveRename}><Icon d={IcCheck} size={14} /> Salvar</button>
            <button type="button" className="vf-btn is-ghost is-icon" title="Cancelar" onClick={() => setRenaming(false)}><Icon d={IcX} /></button>
          </div>
        ) : (
          <div className="vf-lists">
            <select value={list.id} onChange={(e) => postMessage({ type: 'list-select', listId: e.target.value })}>
              {st.lists.map((l) => (
                <option key={l.id} value={l.id}>{l.title} ({l.items.length})</option>
              ))}
            </select>
            <button type="button" className="vf-btn is-icon" title="Renomear" onClick={startRename}><Icon d={IcEdit} size={14} /></button>
            <button type="button" className="vf-btn is-icon" title="Nova pregação" onClick={addList}><Icon d={IcPlus} size={14} /></button>
            <button type="button" className="vf-btn is-icon" title="Excluir pregação" onClick={deleteList}><Icon d={IcTrash} size={14} /></button>
          </div>
        )}

        {/* Favoritos */}
        {list.items.length === 0 ? (
          <div className="vf-empty">
            <Icon d={IcStar} size={13} />
            <span>Sem favoritos — marque versículos abaixo e toque em ★.</span>
          </div>
        ) : (
          <div className="vf-favs">
            {list.items.map((f, i) => {
              const isLive = live?.favId === f.id;
              const preview = stripTags(f.verses[0]?.text ?? '');
              return (
                <div key={f.id} className={`vf-fav${isLive ? ' is-live' : ''}`}>
                  <button
                    type="button"
                    className="vf-fav-main"
                    onClick={() => presentFav(f)}
                    title={`${refLabel(f.book, f.chapter, f.verses)} · ${f.version}\n${preview}`}
                  >
                    {isLive && <span className="vf-fav-dot" />}
                    <span className="vf-fav-ref">{refLabel(f.book, f.chapter, f.verses)}</span>
                    <small className="vf-fav-ver">{shortVersion(f.version)}</small>
                  </button>
                  <span className="vf-fav-tools">
                    {f.verses.length > 1 && (
                      <button
                        type="button"
                        className={`vf-fav-mode${isTogether(f) ? ' is-on' : ''}`}
                        title={isTogether(f)
                          ? 'Juntos: todos na mesma tela (clique para projetar um por vez)'
                          : 'Um por vez: ◀ ▶ passam (clique para projetar todos juntos)'}
                        onClick={() => postMessage({ type: 'fav-together', favId: f.id, together: !isTogether(f) })}
                      >
                        {isTogether(f) ? 'Juntos' : '1 a 1'}
                      </button>
                    )}
                    {i > 0 && (
                      <button type="button" title="Mover para a esquerda" onClick={() => postMessage({ type: 'fav-move', favId: f.id, dir: -1 })}><Icon d={IcLeft} size={11} /></button>
                    )}
                    {i < list.items.length - 1 && (
                      <button type="button" title="Mover para a direita" onClick={() => postMessage({ type: 'fav-move', favId: f.id, dir: 1 })}><Icon d={IcRight} size={11} /></button>
                    )}
                    <button type="button" title="Excluir" className="is-del" onClick={() => deleteFav(f, i)}><Icon d={IcX} size={11} /></button>
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Escolher versículos: versão + busca numa linha */}
        <div className="vf-picker">
          <div className="vf-picker-head">
            <select className="vf-version" value={version} onChange={(e) => changeVersion(e.target.value)} title="Bíblia padrão do plugin (fica guardada)">
              {versions.map((v) => <option key={v} value={v}>{v === savedVersion ? `★ ${v}` : v}</option>)}
            </select>
          </div>
          {!savedVersion && versions.length > 1 && (
            <div className="vf-hint">Escolha a versão ao lado da busca — ela vira a Bíblia padrão do plugin (★).</div>
          )}
          {error && <div className="vf-error">{error}</div>}

          {history.length > 0 && (
            <div className="vf-history-row">
              <span className="vf-history-label">Histórico</span>
              <div className="vf-history" title="Histórico — clique para abrir de novo">
                {history.map((h) => (
                  <span key={`${h.abbrev}-${h.chapter}-${h.verses.join(',')}`} className="vf-hist-item">
                    <button
                      type="button"
                      className="vf-hist"
                      onClick={() => {
                        const b = books.find((x) => x.abbrev === h.abbrev) ?? { abbrev: h.abbrev, name: h.name, chapters: 0 };
                        void openChapter(b, h.chapter, h.verses, versions.includes(h.version) ? h.version : version);
                      }}
                    >
                      <b>{h.abbrev}</b> {refLabel('', h.chapter, h.verses.map((verse) => ({ verse }))).trim()}
                    </button>
                    <button
                      type="button"
                      className="vf-hist-del"
                      title="Remover do histórico"
                      onClick={() => removeHistory(h)}
                    >
                      <Icon d={IcX} size={10} />
                    </button>
                  </span>
                ))}
              </div>
              <button type="button" className="vf-history-clear" title="Limpar todo o histórico" onClick={clearHistory}>
                Limpar
              </button>
            </div>
          )}

          {/* Livros · Capítulo · Versículo · Texto — cores por grupo, estilo Holyrics */}
          <div
            className="vf-bible"
            ref={bibleRef}
            style={{ '--cat': book ? bookColor(books.findIndex((x) => x.abbrev === book.abbrev), books.length) : 'var(--sp-primary)' } as CSSProperties}
          >
            <section className="vf-pane is-books">
              <div className="vf-pane-tab"><Icon d={IcBook} size={14} /> Livros</div>
              <div className="vf-tiles" ref={tilesRef} style={colsStyle(booksCols)}>
                {books.map((b, i) => (
                  <button
                    key={b.abbrev}
                    type="button"
                    className={`vf-tile${book?.abbrev === b.abbrev ? ' is-on' : ''}`}
                    style={{ '--cat': bookColor(i, books.length) } as CSSProperties}
                    title={b.name}
                    onClick={() => openBook(b)}
                  >
                    <b>{b.abbrev}</b>
                    <small>{b.name}</small>
                  </button>
                ))}
              </div>
              <Grip
                axis="y"
                title="Altura dos livros"
                measure={() => sizeOf(tilesRef.current, 'y')}
                min={60}
                max={400}
                zoom={zoom}
                onChange={(h) => setLayout({ booksH: h })}
                onCommit={commitLayout}
                onReset={() => resetLayout('booksH')}
              />
            </section>

            <section className="vf-pane is-chapters">
              <div className="vf-pane-tab"><Icon d={IcList} size={14} /> Capítulo</div>
              <div className="vf-grid" ref={gridRef} style={colsStyle(chaptersCols)}>
                {chapterNums.map((c) => (
                  <button key={c} type="button" className={`vf-cell${c === chapter ? ' is-on' : ''}`} onClick={() => book && void openChapter(book, c)}>{c}</button>
                ))}
              </div>
              <Grip
                axis="y"
                title="Altura de Capítulo e Versículo"
                measure={() => sizeOf(gridRef.current, 'y')}
                min={60}
                max={400}
                zoom={zoom}
                onChange={(h) => setLayout({ gridH: h })}
                onCommit={commitLayout}
                onReset={() => resetLayout('gridH')}
              />
            </section>

            <section className="vf-pane is-verses">
              <div className="vf-pane-tab"><span className="vf-hash">#</span> Versículo</div>
              <div className="vf-grid is-big" ref={versesGridRef} style={colsStyle(versesCols)}>
                {verses.map((v) => (
                  <button
                    key={v.verse}
                    type="button"
                    className={`vf-cell${picked.includes(v.verse) ? ' is-on' : ''}${isOnAir(v.verse) ? ' is-air' : ''}`}
                    onClick={(e) => { pickVerse(v.verse, e.shiftKey); scrollToVerse(v.verse); }}
                    onDoubleClick={() => projectVerse(v.verse)}
                    title="Clique: marcar · Clique duplo: projetar este versículo"
                  >
                    {v.verse}
                  </button>
                ))}
              </div>
              <Grip
                axis="y"
                title="Altura de Capítulo e Versículo"
                measure={() => sizeOf(gridRef.current, 'y')}
                min={60}
                max={400}
                zoom={zoom}
                onChange={(h) => setLayout({ gridH: h })}
                onCommit={commitLayout}
                onReset={() => resetLayout('gridH')}
              />
            </section>

            <section className="vf-pane is-text" ref={textPaneRef}>
              <div className="vf-pane-tab"><Icon d={IcBook} size={14} /> Texto</div>
              <div className="vf-text-head">
                <span>{book ? `${book.name} ${chapter}` : ''}{loading ? ' · abrindo…' : ''}</span>
                <span style={{ display: 'flex', gap: 4 }}>
                  {picked.length > 0 && <button type="button" className="vf-btn is-ghost" style={{ height: 26 }} onClick={() => setPicked([])}>Limpar</button>}
                </span>
              </div>
              {/* Favoritar logo acima do texto: marcou 22 e 23 → um toque. */}
              {/* Fixo (não empurra o texto): cinza sem marcação, azul com versículo marcado. */}
              <button
                type="button"
                className={`vf-btn vf-fav-now${picked.length ? ' is-primary' : ' is-idle'}`}
                disabled={!book || !picked.length}
                onClick={addPicked}
              >
                <Icon d={IcStar} size={14} />
                {book && picked.length
                  ? <>Favoritar {refLabel(book.name, chapter, pickedVerses)}{picked.length > 1 && <small>juntos</small>}</>
                  : 'Marque versículos para favoritar'}
              </button>
              <div className="vf-verses" ref={versesRef} onScroll={() => saveLastRef.current()}>
                {verses.map((v) => {
                  const on = picked.includes(v.verse);
                  const starred = !!singleFav(v.verse);
                  return (
                    <div key={v.verse} data-verse={v.verse} className={`vf-verse${on ? ' is-on' : ''}${isOnAir(v.verse) ? ' is-air' : ''}`}>
                      <button
                        type="button"
                        className="vf-verse-pick"
                        title="Clique: marcar · Clique duplo: projetar este versículo"
                        onClick={(e) => pickVerse(v.verse, e.shiftKey)}
                        onDoubleClick={() => projectVerse(v.verse)}
                      >
                        <span className="vf-verse-box">{on ? <Icon d={IcCheck} size={12} /> : v.verse}</span>
                        <span className="vf-verse-text">{stripTags(v.text)}</span>
                      </button>
                      <button
                        type="button"
                        className={`vf-star${starred ? ' is-on' : ''}`}
                        title={starred ? 'Remover dos favoritos' : 'Favoritar este versículo'}
                        onClick={() => toggleStar(v)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={starred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">{IcStar}</svg>
                      </button>
                    </div>
                  );
                })}
              </div>
              <Grip
                axis="y"
                className="is-narrow-only"
                title="Altura do texto"
                measure={() => sizeOf(versesRef.current, 'y')}
                min={120}
                max={600}
                zoom={zoom}
                onChange={(h) => setLayout({ textH: h })}
                onCommit={commitLayout}
                onReset={() => resetLayout('textH')}
              />
            </section>
            {/* Largura do Texto (layout largo): arraste a divisa com os painéis da direita. */}
            <Grip
              axis="x"
              className="is-split"
              title="Largura do texto"
              measure={() => sizeOf(textPaneRef.current, 'x')}
              min={0}
              max={10000}
              zoom={zoom}
              onChange={(w) => {
                const pct = textWidthPct(w);
                if (pct) setLayout({ textW: pct });
              }}
              onCommit={commitLayout}
              onReset={() => resetLayout('textW')}
            />
          </div>
          <div className="vf-type-hint">Digite para localizar · clique marca · Shift+clique marca um trecho · clique duplo projeta o versículo</div>

        </div>

        {/* Projeção */}
        <details className="vf-details">
          <summary>Onde projetar</summary>
          <div>
            {st.outputs.map((o) => {
              const id = String(o.index);
              const on = st.effective.outputs.includes(id);
              return (
                <label key={id} className={`vf-check${on ? ' is-on' : ''}`}>
                  <input type="checkbox" checked={on} onChange={() => toggleOutput(id)} />
                  <span style={{ flex: 1, fontWeight: 600 }}>{o.name}</span>
                  <span className="vf-hint" style={{ textAlign: 'right' }}>
                    {outPlan?.themeTitles[id] ?? '…'}
                    {outPlan?.backgrounds[id] ? ' · com fundo' : ''}
                  </span>
                </label>
              );
            })}
            <label className="vf-field">
              Camada
              <select
                value={st.settings.layer === null ? 'auto' : String(st.settings.layer)}
                onChange={(e) => updateSettings({ layer: e.target.value === 'auto' ? null : Number(e.target.value) })}
              >
                <option value="auto">
                  Automática ({st.layers.find((l) => l.index === autoLayer)?.name ?? `Camada ${autoLayer}`})
                </option>
                {st.layers.map((l) => <option key={l.index} value={l.index}>{l.name ?? `Camada ${l.index}`}</option>)}
              </select>
            </label>
            <div className="vf-label" style={{ marginTop: 4 }}>Entrada e saída</div>
            <label className="vf-field">
              <span className="vf-range-head">Fade do versículo <b>{((st.settings.verseFadeMs ?? 1000) / 1000).toFixed(1)} s</b></span>
              <input type="range" min={200} max={3000} step={100} value={st.settings.verseFadeMs ?? 1000}
                onChange={(e) => updateSettings({ verseFadeMs: Number(e.target.value) })} />
            </label>
            <label className="vf-field">
              <span className="vf-range-head">Versículo entra depois do fundo <b>{((st.settings.verseDelayMs ?? 800) / 1000).toFixed(1)} s</b></span>
              <input type="range" min={0} max={3000} step={100} value={st.settings.verseDelayMs ?? 800}
                onChange={(e) => updateSettings({ verseDelayMs: Number(e.target.value) })} />
            </label>
            <div className="vf-hint">
              Ao entrar: <b>fundo primeiro</b>, depois o versículo. Ao sair (Esc): o versículo sai primeiro, depois o fundo.
            </div>
            <div className="vf-hint">
              Tema, fundo e camada seguem as <b>Configurações do app</b> (tema de Bíblia e fundo por tipo de cada saída) — trocou lá, vale no próximo versículo.
            </div>
          </div>
        </details>
      </div>

      {/* Rodapé */}
      <div className="vf-foot">
        {notice && <div className="vf-toast is-ok"><span>{notice}</span></div>}
        {undo && (
          <div className="vf-toast">
            <span>
              {undo.kind === 'fav'
                ? `${refLabel(undo.fav.book, undo.fav.chapter, undo.fav.verses)} excluído`
                : undo.kind === 'list'
                  ? `Pregação “${undo.list.title}” excluída`
                  : undo.text}
            </span>
            <button type="button" className="vf-btn is-primary" style={{ height: 28 }} onClick={doUndo}>Desfazer</button>
          </div>
        )}
        {navError && <div className="vf-error">{navError}</div>}
      </div>
    </div>
  );
}
