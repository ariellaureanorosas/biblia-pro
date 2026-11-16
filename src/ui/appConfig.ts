// Configuração ATUAL do Spresenter, lida a cada projeção.
//
// O servidor local do app publica a pasta de dados (só para este computador),
// incluindo o `config.json` onde ficam, por saída: o tema de Bíblia escolhido,
// o fundo padrão por tipo e a camada padrão da Bíblia. Lendo daqui, o plugin
// projeta exatamente como o painel de Bíblia do app — e acompanha qualquer
// troca na hora, sem precisar "aprender" de uma projeção anterior.
//
// Mesma resolução do app:
//  • tema  → `outputs[i].themes[assetType='bible'].themeGuid` (bundle:* = tema
//            do sistema; UUID = tema salvo, via manifest) → padrão de Bíblia;
//  • fundo → `outputs[i].typeBackgrounds.bible` (Configurações › Camadas);
//  • camada → primeira com `defaultForTypes` contendo 'bible' → "Conteúdo" → 1.
import { BIBLE_THEMES } from './bibleThemes';

type Theme = Record<string, unknown>;

interface VirtualOutput {
  themes?: { assetType: string; themeGuid: string }[];
  typeBackgrounds?: Record<string, { background?: { path?: string; kind?: string }; layer: number } | null>;
}
interface AppConfig {
  outputs?: { virtual_outputs?: VirtualOutput[] };
  layers?: { name?: string; defaultForTypes?: string[] }[];
}

export interface BackgroundPlan {
  layer: number;
  src: string;
  presentation: Record<string, unknown>;
}

export interface OutputPlan {
  /** Camada padrão da Bíblia nas Configurações do app. */
  layer: number;
  themes: Record<string, Theme>;
  themeTitles: Record<string, string>;
  backgrounds: Record<string, BackgroundPlan | null>;
}

const url = (path: string) => new URL(path, window.location.href).toString();

// Cache curtinho: avançar versículo a versículo não relê o disco a cada toque,
// mas uma troca nas Configurações aparece em segundos.
const TTL_MS = 2000;
let configCache: { at: number; value: Promise<AppConfig> } | null = null;
const manifestCache = new Map<string, { at: number; value: Promise<Theme> }>();

function readConfig(): Promise<AppConfig> {
  if (configCache && Date.now() - configCache.at < TTL_MS) return configCache.value;
  const value = fetch(url(`/config.json?t=${Date.now()}`), { cache: 'no-store' }).then((r) => {
    if (!r.ok) throw new Error(`config ${r.status}`);
    return r.json() as Promise<AppConfig>;
  });
  configCache = { at: Date.now(), value };
  value.catch(() => { configCache = null; });
  return value;
}

function readManifest(guid: string): Promise<Theme> {
  const hit = manifestCache.get(guid);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const value = fetch(url(`/assets/${encodeURIComponent(guid)}/manifest.json?t=${Date.now()}`), { cache: 'no-store' }).then((r) => {
    if (!r.ok) throw new Error(`manifest ${r.status}`);
    return r.json() as Promise<Theme>;
  });
  manifestCache.set(guid, { at: Date.now(), value });
  value.catch(() => manifestCache.delete(guid));
  return value;
}

async function bibleTheme(vo: VirtualOutput | undefined): Promise<Theme> {
  const ref = vo?.themes?.find((t) => t.assetType === 'bible')?.themeGuid;
  if (ref?.startsWith('bundle:')) return BIBLE_THEMES[ref.slice('bundle:'.length)] ?? BIBLE_THEMES.bible;
  if (ref) {
    try { return await readManifest(ref); } catch { /* tema apagado: cai no padrão, como o app */ }
  }
  return BIBLE_THEMES.bible;
}

/** `/assets/<guid><ext>` → identidade do asset (igual ao app; WorshipWide não tem). */
function backgroundIdentity(path: string): { guid?: string; extension?: string } {
  const m = /^\/?assets\/([0-9a-fA-F-]{36})(\.[^/.]+)?$/.exec(path);
  return m ? { guid: m[1], extension: m[2] ?? '' } : {};
}

function bibleBackground(vo: VirtualOutput | undefined): BackgroundPlan | null {
  const cfg = vo?.typeBackgrounds?.bible;
  const path = cfg?.background?.path;
  if (!cfg || !path) return null;
  return {
    layer: cfg.layer,
    src: path,
    presentation: {
      asset: {
        author: '',
        title: '',
        type: cfg.background?.kind === 'image' ? 'image' : 'backgroundVideo',
        ...backgroundIdentity(path),
        data: { src: path },
      },
      props: {},
    },
  };
}

function bibleLayer(cfg: AppConfig): number {
  const layers = cfg.layers ?? [];
  const byType = layers.findIndex((l) => l.defaultForTypes?.includes('bible'));
  if (byType >= 0) return byType;
  const byName = layers.findIndex((l) => l.name === 'Conteúdo');
  if (byName >= 0) return byName;
  return Math.min(1, Math.max(0, layers.length - 1));
}

/** Tema, fundo e camada da Bíblia para cada saída pedida, como o app usaria agora. */
export async function planFor(outputs: string[]): Promise<OutputPlan> {
  const cfg = await readConfig();
  const vos = cfg.outputs?.virtual_outputs ?? [];
  const plan: OutputPlan = { layer: bibleLayer(cfg), themes: {}, themeTitles: {}, backgrounds: {} };
  await Promise.all(outputs.map(async (o) => {
    const vo = vos[Number(o)];
    const theme = await bibleTheme(vo);
    plan.themes[o] = theme;
    plan.themeTitles[o] = String(theme.title ?? 'Tema de Bíblia');
    plan.backgrounds[o] = bibleBackground(vo);
  }));
  return plan;
}
