import { useLayoutEffect, useState, type RefObject } from 'react';

interface GridColumnsOptions {
  /** Quantidade de itens da grade. */
  count: number;
  /** Largura/altura mínima de cada botão (px). */
  minW?: number;
  minH?: number;
}

/**
 * Escolhe o número de colunas que deixa a última linha com o menor número de
 * células vazias possível (ex.: 66 livros → 11 colunas × 6 linhas cheias).
 * Assim todos os botões ficam do mesmo tamanho, sem esticar o fim da grade.
 *
 * Retorna 0 antes da primeira medição; nesse caso o CSS usa `auto-fill`.
 */
export function useGridColumns<T extends HTMLElement>(
  ref: RefObject<T>,
  { count, minW = 44, minH = 34 }: GridColumnsOptions,
): number {
  const [cols, setCols] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || count < 1) {
      setCols((cur) => (cur ? 0 : cur));
      return;
    }

    const compute = () => {
      const style = getComputedStyle(el);
      const padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
      const padY = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
      const gap = parseFloat(style.columnGap) || 0;
      const rowGap = parseFloat(style.rowGap) || gap;
      const W = el.clientWidth - padX;
      const H = el.clientHeight - padY;
      if (W <= 0 || H <= 0) {
        setCols((cur) => (cur ? 0 : cur));
        return;
      }

      const maxCols = Math.max(1, Math.min(count, Math.floor((W + gap) / (minW + gap))));
      // Nunca desce tanto assim de colunas a ponto de virar "quase uma coluna":
      // permite no máximo uma linha a mais que o layout com o máximo de colunas.
      const maxRows = Math.ceil(count / maxCols) + 1;
      let best = maxCols;
      let bestOverflow = Infinity;
      let bestEmpty = Infinity;

      for (let c = maxCols; c >= 1; c--) {
        const rows = Math.ceil(count / c);
        if (rows > maxRows) break;
        const empty = c * rows - count;
        const cellH = (H - rowGap * (rows - 1)) / rows;
        const overflow = Math.abs(Math.min(0, cellH - minH)); // 0 quando cabe

        // Descendo de maxCols, empates mantêm o maior número de colunas.
        const better =
          overflow < bestOverflow - 0.5 ||
          (Math.abs(overflow - bestOverflow) <= 0.5 && empty < bestEmpty);
        if (better) {
          best = c;
          bestOverflow = overflow;
          bestEmpty = empty;
        }
      }

      setCols((cur) => (cur === best ? cur : best));
    };

    compute();
    if (typeof ResizeObserver !== 'function') {
      window.addEventListener('resize', compute);
      return () => window.removeEventListener('resize', compute);
    }
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [count, minW, minH, ref]);

  return cols;
}
