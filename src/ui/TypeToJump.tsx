// "Só digitar", igual ao painel de Bíblia do app: com o foco no painel (fora
// de campos de texto), as teclas vão montando LIVRO → CAPÍTULO → VERSÍCULO
// num aviso por cima de tudo.
//
// Mesmas regras do app (bibleViews/bookSelector):
//  • livro: letras filtram por nome (sem acento) ou sigla; sobrou um só, ele
//    é escolhido e passa para o capítulo; com vários, mostra as sugestões;
//  • capítulo/versículo: números até o máximo; quando mais um dígito já
//    passaria do máximo, confirma sozinho; Espaço, Enter ou Tab confirmam;
//  • Backspace apaga; Esc cancela.
import { useEffect, useRef, useState } from 'react';

interface Book { abbrev: string; name: string; chapters: number }
interface Verse { verse: number; text: string }
type Stage = 'book' | 'chapter' | 'verse';

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s]/gi, '');

interface Props {
  books: Book[];
  getVerses: (b: Book, chapter: number) => Promise<Verse[]>;
  onSelect: (b: Book, chapter: number, verse: number) => void;
}

export function TypeToJump({ books, getVerses, onSelect }: Props) {
  const [stage, setStage] = useState<Stage>('book');
  const [typed, setTyped] = useState('');
  const [book, setBook] = useState<Book | null>(null);
  const [chapter, setChapter] = useState(0);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // O handler lê sempre o estado atual (teclas seguidas chegam antes do render).
  const s = useRef({ stage, typed, book, chapter, verses });
  s.current = { stage, typed, book, chapter, verses };
  const setT = (t: string) => { s.current.typed = t; setTyped(t); };
  const setS = (st: Stage) => { s.current.stage = st; setStage(st); };

  const reset = () => {
    setS('book'); setT(''); setBook(null); setChapter(0); setVerses([]); setSuggestions([]);
  };

  const active = stage !== 'book' || typed !== '';

  const confirmChapter = async (n: number) => {
    const b = s.current.book;
    if (!b || !Number.isFinite(n) || n < 1 || (b.chapters && n > b.chapters)) return;
    try {
      const vs = await getVerses(b, n);
      setVerses(vs); s.current.verses = vs;
      setChapter(n); s.current.chapter = n;
      setT('');
      setS('verse');
    } catch { reset(); }
  };

  const confirmVerse = (n: number) => {
    const { book: b, chapter: c, verses: vs } = s.current;
    if (!b || !Number.isFinite(n) || n < 1 || n > vs.length) return;
    onSelect(b, c, vs[n - 1]?.verse ?? n);
    reset();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;

      const cur = s.current;
      const busy = cur.stage !== 'book' || cur.typed !== '';

      if (e.key === 'Escape') {
        if (!busy) return; // sem nada digitado, Esc segue tirando do ar
        e.preventDefault();
        e.stopImmediatePropagation();
        reset();
        return;
      }
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Tab') {
        if (!busy) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (cur.stage === 'chapter') void confirmChapter(parseInt(cur.typed, 10));
        if (cur.stage === 'verse') confirmVerse(parseInt(cur.typed, 10));
        return;
      }

      let next: string;
      if (e.key === 'Backspace') {
        if (!busy) return;
        next = cur.typed.slice(0, -1);
      } else if (e.key.length === 1) {
        const ch = fold(e.key);
        if (!ch) return;
        next = cur.typed + ch;
      } else {
        return; // setas, F-keys etc. seguem para o painel
      }
      if (busy) { e.preventDefault(); e.stopImmediatePropagation(); }

      if (next === '') { setSuggestions([]); setT(''); return; }

      if (cur.stage === 'book') {
        const hits = books.filter((b) => fold(b.name.replace(' ', '')).startsWith(next) || b.abbrev.toLowerCase().startsWith(next));
        if (!hits.length) return;
        e.preventDefault();
        if (hits.length === 1) {
          setT('');
          setSuggestions([]);
          setBook(hits[0]); s.current.book = hits[0];
          setS('chapter');
        } else {
          setT(next);
          setSuggestions([...hits.map((b) => b.name), ...hits.map((b) => b.abbrev.toUpperCase())]);
        }
        return;
      }

      const max = cur.stage === 'chapter' ? cur.book?.chapters ?? 0 : cur.verses.length;
      const n = parseInt(next, 10);
      if (!(n <= max) && next !== '') return;
      setT(next);
      if (parseInt(`${next}0`, 10) > max) {
        if (cur.stage === 'chapter') void confirmChapter(n);
        else confirmVerse(n);
      }
    };
    // Captura: roda antes do atalho de Esc/setas do painel.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books]);

  if (!active) return null;

  return (
    <div className="vf-jump" onMouseDown={reset}>
      <span className="vf-jump-hint">Pressione “esc” para cancelar</span>
      {stage === 'book' && (
        <>
          <div className="vf-jump-title">Livro</div>
          <div className="vf-jump-typed">{typed}<span className="vf-jump-caret" /></div>
          {suggestions.length > 0 && <div className="vf-jump-sub">Sugestões: {suggestions.join(', ')}</div>}
        </>
      )}
      {stage === 'chapter' && (
        <>
          <div className="vf-jump-title">Capítulo</div>
          <div className="vf-jump-typed">{book?.name} {typed}<span className="vf-jump-caret" /></div>
          <div className="vf-jump-sub">{book?.chapters ?? 0} capítulos</div>
        </>
      )}
      {stage === 'verse' && (
        <>
          <div className="vf-jump-title">Versículo</div>
          <div className="vf-jump-typed">{book?.name} {chapter}:{typed}<span className="vf-jump-caret" /></div>
          <div className="vf-jump-sub">{verses.length} versículos</div>
        </>
      )}
    </div>
  );
}
