import { useRef } from 'react';

type Axis = 'x' | 'y';

interface GripProps {
  /** 'y' redimensiona altura; 'x' redimensiona largura. */
  axis: Axis;
  /** Dica ao passar o mouse. */
  title: string;
  /** Tamanho atual (px, sem o zoom do painel) da seção que será ajustada. */
  measure: () => number;
  min: number;
  max: number;
  /** Zoom aplicado no painel — o arraste é compensado por ele. */
  zoom: number;
  /** Durante o arraste: tamanho novo, em px sem zoom. */
  onChange: (size: number) => void;
  /** Ao soltar: persistir o valor final. */
  onCommit: () => void;
  /** Duplo clique: volta ao tamanho padrão. */
  onReset: () => void;
  className?: string;
}

/** Divisória arrastável entre seções do painel. */
export function Grip({ axis, title, measure, min, max, zoom, onChange, onCommit, onReset, className }: GripProps) {
  const drag = useRef<{ start: number; base: number } | null>(null);
  const last = useRef(0);

  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n)));

  return (
    <div
      className={`vf-grip is-${axis}${className ? ` ${className}` : ''}`}
      role="separator"
      tabIndex={0}
      aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
      title={`${title} · arraste para ajustar · duplo clique restaura`}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 1 : 10;
        const dir = axis === 'y'
          ? (e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0)
          : (e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0);
        if (!dir) return;
        e.preventDefault();
        const size = clamp(measure() / (zoom || 1) + dir * step);
        last.current = size;
        onChange(size);
        onCommit();
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        const base = measure() / (zoom || 1);
        const start = axis === 'x' ? e.clientX : e.clientY;
        drag.current = { start, base };
        last.current = base;
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const moved = ((axis === 'x' ? e.clientX : e.clientY) - d.start) / (zoom || 1);
        const size = clamp(d.base + moved);
        last.current = size;
        onChange(size);
      }}
      onPointerUp={(e) => {
        if (!drag.current) return;
        drag.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
        onCommit();
      }}
      onPointerCancel={() => { drag.current = null; }}
      onDoubleClick={onReset}
    >
      <span />
    </div>
  );
}
