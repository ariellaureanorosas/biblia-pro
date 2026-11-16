// Funções puras usadas pelo painel e pelos testes unitários.
// Mantidas fora do App/TypeToJump para poderem ser testadas sem DOM.

export interface VerseLike {
  verse: number;
}

export interface FavoriteLike {
  verses: VerseLike[];
  together?: boolean;
}

/** Favorito de vários versículos vai ao ar com todos juntos (a menos que o operador peça um por vez). */
export const isTogether = (f: FavoriteLike): boolean =>
  f.verses.length > 1 && f.together !== false;

/** Versão curta para a etiqueta: "King James 1911" → "KJ1911"; "NVI" fica. */
export const shortVersion = (v: string): string =>
  v.length <= 5 ? v : v.split(/\s+/).map((w) => (/\d/.test(w) ? w : w[0].toUpperCase())).join('');

export const stripTags = (s: string): string => s.replace(/<[^>]*>/g, '');

/** "Salmos 23:1-3,5" — junta números seguidos em intervalos. */
export function refLabel(book: string, chapter: number, verses: VerseLike[]): string {
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

/** Padrão escolhido no plugin → a que o app projetou por último → 'nvi' →
 *  primeira instalada (mesma reserva do app). Não instalada é ignorada. */
export function resolveVersion(
  installed: string[],
  ...prefs: (string | null | undefined)[]
): string {
  for (const c of [...prefs, 'nvi']) if (c && installed.includes(c)) return c;
  return installed[0] ?? '';
}

/** Normaliza texto para busca: minúsculas, sem acentos e sem pontuação. */
export const fold = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/gi, '');
