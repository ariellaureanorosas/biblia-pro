import { describe, expect, it } from 'vitest';
import { fold, isTogether, refLabel, resolveVersion, shortVersion, stripTags } from './bibleRefs';

describe('refLabel', () => {
  it('usa apenas livro e capítulo quando não há versículos', () => {
    expect(refLabel('João', 3, [])).toBe('João 3');
  });

  it('mostra um único versículo', () => {
    expect(refLabel('João', 3, [{ verse: 16 }])).toBe('João 3:16');
  });

  it('agrupa versículos consecutivos em intervalo', () => {
    expect(refLabel('João', 3, [{ verse: 15 }, { verse: 16 }])).toBe('João 3:15-16');
  });

  it('combina intervalos e números soltos', () => {
    expect(refLabel('Salmos', 23, [{ verse: 5 }, { verse: 1 }, { verse: 2 }, { verse: 3 }]))
      .toBe('Salmos 23:1-3,5');
  });

  it('ordena os números antes de montar o rótulo', () => {
    expect(refLabel('Romanos', 8, [{ verse: 29 }, { verse: 28 }])).toBe('Romanos 8:28-29');
  });
});

describe('shortVersion', () => {
  it('mantém versões curtas', () => {
    expect(shortVersion('NVI')).toBe('NVI');
    expect(shortVersion('ARA')).toBe('ARA');
  });

  it('reduz nomes longos às iniciais', () => {
    expect(shortVersion('King James 1911')).toBe('KJ1911');
    expect(shortVersion('Nova Versão Internacional')).toBe('NVI');
  });
});

describe('stripTags', () => {
  it('remove marcação HTML do texto bíblico', () => {
    expect(stripTags('<b>No princípio</b> criou <i>Deus</i>')).toBe('No princípio criou Deus');
  });

  it('mantém texto sem marcação intacto', () => {
    expect(stripTags('Porque Deus amou o mundo')).toBe('Porque Deus amou o mundo');
  });
});

describe('resolveVersion', () => {
  const installed = ['ara', 'nvi', 'kjv'];

  it('respeita a preferência salva', () => {
    expect(resolveVersion(installed, 'ara', 'nvi')).toBe('ara');
  });

  it('ignora preferências não instaladas', () => {
    expect(resolveVersion(installed, 'acf', 'kjv')).toBe('kjv');
  });

  it('cai para nvi quando nada foi escolhido', () => {
    expect(resolveVersion(installed, null, undefined)).toBe('nvi');
  });

  it('cai para a primeira instalada quando não há nvi', () => {
    expect(resolveVersion(['acf', 'kjv'], null)).toBe('acf');
  });

  it('retorna vazio sem versões instaladas', () => {
    expect(resolveVersion([], null)).toBe('');
  });
});

describe('isTogether', () => {
  it('é falso para um único versículo', () => {
    expect(isTogether({ verses: [{ verse: 16 }] })).toBe(false);
  });

  it('é verdadeiro para vários versículos por padrão', () => {
    expect(isTogether({ verses: [{ verse: 16 }, { verse: 17 }] })).toBe(true);
  });

  it('respeita a escolha de projetar um por vez', () => {
    expect(isTogether({ verses: [{ verse: 16 }, { verse: 17 }], together: false })).toBe(false);
  });
});

describe('fold', () => {
  it('remove acentos e coloca em minúsculas', () => {
    expect(fold('João')).toBe('joao');
    expect(fold('Gênesis')).toBe('genesis');
  });

  it('remove pontuação mas preserva números e espaços', () => {
    expect(fold('1 Coríntios 13:4-7')).toBe('1 corintios 1347');
  });
});
