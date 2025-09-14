import React from 'react';
import type { GridModel } from "../types";

type Props = { grid: GridModel; height?: number; rowHeight?: number };

// Lightweight, dependency-free virtualized grid (read-only)
export const GridView: React.FC<Props> = ({ grid, height = 400, rowHeight = 28 }) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = React.useState(0);

  const totalRows = grid.rows.length;
  const viewportRows = Math.ceil(height / rowHeight) + 2; // small buffer
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - 1);
  const endRow = Math.min(totalRows, startRow + viewportRows);

  const onScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
    setScrollTop((e.target as HTMLDivElement).scrollTop);
  };

  return (
    <div style={{ border: '1px solid #ddd' }}>
      <div style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', background: '#f7f7f7', borderBottom: '1px solid #ddd' }}>
          {grid.columns.map((c) => (
            <div key={c.key} style={{ padding: '6px 8px', minWidth: 120, borderRight: '1px solid #eee', fontWeight: 600 }}>
              {c.label}
            </div>
          ))}
        </div>
      </div>
      <div
        ref={containerRef}
        onScroll={onScroll}
        style={{ height, overflow: 'auto', position: 'relative' }}
      >
        <div style={{ height: totalRows * rowHeight, position: 'relative' }}>
          <div style={{ position: 'absolute', top: startRow * rowHeight, left: 0, right: 0 }}>
            {grid.rows.slice(startRow, endRow).map((r) => (
              <div key={r.id} style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', minHeight: rowHeight, alignItems: 'center' }}>
                {grid.columns.map((c) => (
                  <div
                    key={c.key}
                    style={{ padding: '4px 8px', minWidth: 120, borderRight: '1px solid #fafafa', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    title={String(r.cells[c.key]?.value ?? '')}
                  >
                    {String(r.cells[c.key]?.value ?? '')}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

