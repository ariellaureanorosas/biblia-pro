import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TypeToJump } from './TypeToJump';
import { fold } from './bibleRefs';

const books = [
  { abbrev: 'jo', name: 'João', chapters: 21 },
  { abbrev: 'gn', name: 'Gênesis', chapters: 50 },
  { abbrev: 'sl', name: 'Salmos', chapters: 150 },
];

const mockGetVerses = vi.fn();
const mockOnSelect = vi.fn();

beforeEach(() => {
  mockGetVerses.mockReset();
  mockOnSelect.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TypeToJump — renderização condicional', () => {
  it('não renderiza nada quando inativo (estado inicial)', () => {
    render(<TypeToJump books={books} getVerses={mockGetVerses} onSelect={mockOnSelect} />);
    expect(screen.queryByText(/Pressione “esc” para cancelar/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Livro/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Capítulo/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Versículo/)).not.toBeInTheDocument();
  });

  it('ignora teclas quando o foco está em um campo de texto', () => {
    render(<TypeToJump books={books} getVerses={mockGetVerses} onSelect={mockOnSelect} />);
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(input, { key: 'j' });
    expect(screen.queryByText(/Livro/)).not.toBeInTheDocument();
    document.body.removeChild(input);
  });
});

describe('fold (helper puro extraído)', () => {
  it('remove acentos e coloca em minúsculas', () => {
    expect(fold('João')).toBe('joao');
    expect(fold('Gênesis')).toBe('genesis');
    expect(fold('1 Coríntios 13:4-7')).toBe('1 corintios 1347');
  });

  it('remove pontuação mas preserva números e espaços', () => {
    expect(fold('Amor de Deus')).toBe('amor de deus');
    expect(fold('João 3:16')).toBe('joao 316');
  });
});
