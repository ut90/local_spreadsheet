import React from 'react';
import type { GridModel } from "../types";

type Props = {
  grid: GridModel;
  height?: number;
  rowHeight?: number;
  wrapCells?: boolean;
  minColWidth?: number;
  maxColWidth?: number;
  fontSizePx?: number;
};

// Lightweight, dependency-free virtualized grid (read-only)
export const GridView: React.FC<Props> = ({
  grid,
  height = 400,
  rowHeight = 28,
  wrapCells = true,
  minColWidth = 30,
  maxColWidth = 120,
  fontSizePx = 12,
}) => {
  const headerRef = React.useRef<HTMLDivElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [headerPadRight, setHeaderPadRight] = React.useState(0);
  const [scrollTop, setScrollTop] = React.useState(0);

  const totalRows = grid.rows.length;
  const viewportRows = Math.ceil(height / rowHeight) + 2; // small buffer
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - 1);
  const endRow = Math.min(totalRows, startRow + viewportRows);

  const onScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
    setScrollTop((e.target as HTMLDivElement).scrollTop);
  };

  React.useEffect(() => {
    console.log('[GridView] mount: columns=%d, rows=%d', grid.columns.length, grid.rows.length);
    return () => console.log('[GridView] unmount');
  }, [grid.columns.length, grid.rows.length]);

  // Build two-level header groups: group = first segment (before '.'), child = last segment
  const leafColumns = grid.columns;
  const baseColWidth = minColWidth;
  // Helpers used by width calc and rendering
  const childLabel = (key: string) => {
    const parts = key.split('.');
    return parts.length >= 2 ? parts[parts.length - 1] : key;
  };
  // When wrapping is enabled, allow breaking long tokens like hostnames/IPs
  const wrappingStyles = wrapCells
    ? { whiteSpace: 'normal' as const, overflowWrap: 'anywhere' as const, wordBreak: 'break-word' as const, textOverflow: 'clip' as const }
    : { whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const };
  // Build per-group field list from columns
  const groupFields: Record<string, string[]> = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    leafColumns.forEach((c) => {
      if (!c.key.includes('.')) return;
      const [g, ...rest] = c.key.split('.');
      const f = rest.join('.') || c.key;
      if (!map[g]) map[g] = [];
      if (!map[g].includes(f)) map[g].push(f);
    });
    return map;
  }, [leafColumns]);
  // Fallback: derive per-group field arrays from aggregated cell text (joined by '、')
  const deriveGroupValues = (row: any, groupName: string): Record<string, string[]> => {
    const out: Record<string, string[]> = {};
    const fields = groupFields[groupName] || [];
    fields.forEach((f) => {
      const agg = row.cells?.[`${groupName}.${f}`]?.value as unknown;
      if (typeof agg === 'string') out[f] = agg.split('、').map((s) => s.trim()).filter(Boolean);
      else out[f] = [];
    });
    return out;
  };
  // Build dynamic column widths based on max data length (approx by chars)
  const colWidths = React.useMemo(() => {
    const minW = minColWidth;
    const maxW = maxColWidth;
    const pad = 28; // padding + borders
    const widths: Record<string, number> = {};
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const measure = (text: string) => {
      if (!ctx) return text.length * (fontSizePx - 2);
      ctx.font = `${fontSizePx}px monospace`;
      return ctx.measureText(text).width;
    };
    const ensure = (key: string, candidate: string) => {
      const px = Math.min(maxW, Math.max(minW, Math.ceil(measure(candidate)) + pad));
      widths[key] = Math.max(widths[key] ?? 0, px);
    };
    // header labels first
    leafColumns.forEach((c) => ensure(c.key, childLabel(c.key)));
    // then data
    grid.rows.forEach((r) => {
      leafColumns.forEach((c) => {
        if (!c.key.includes('.')) {
          const v = formatCell(r.cells[c.key]?.value);
          ensure(c.key, v);
        } else {
          const [g, ...rest] = c.key.split('.');
          const field = rest.join('.') || c.key;
          const arr = r.groupArrays?.[g];
          if (Array.isArray(arr) && arr.length > 0) {
            arr.forEach((el) => ensure(c.key, formatCell((el as any)?.[field])));
          } else {
            const derived = deriveGroupValues(r, g);
            (derived[field] || []).forEach((s) => ensure(c.key, s));
          }
        }
      });
    });
    // fallback for columns with no data
    leafColumns.forEach((c) => (widths[c.key] = widths[c.key] ?? baseColWidth));
    return widths;
  }, [grid.rows, leafColumns, minColWidth, maxColWidth, fontSizePx]);
  const tableWidth = leafColumns.reduce((sum, c) => sum + (colWidths[c.key] ?? baseColWidth), 0);
  const topHeaderHeight = 32;
  const bottomHeaderHeight = 28;
  type Group = { name: string; count: number; hierarchical: boolean };
  const groups: Group[] = [];
  const groupOfIndex: number[] = [];
  leafColumns.forEach((c, idx) => {
    const parts = c.key.split('.');
    const hasHierarchy = parts.length >= 2;
    const groupName = hasHierarchy ? parts[0] : c.key;
    const prev = groups[groups.length - 1];
    if (!prev || prev.name !== groupName) {
      groups.push({ name: groupName, count: 1, hierarchical: hasHierarchy });
    } else {
      prev.count += 1;
      if (hasHierarchy) prev.hierarchical = true;
    }
    groupOfIndex[idx] = groups.length - 1;
  });

  

  React.useEffect(() => {
    if (grid.rows.length > 0) {
      const r = grid.rows[0];
      const nonHier = leafColumns.filter((c) => !c.key.includes('.')).map((c) => c.key);
      const snapshot: Record<string, unknown> = {};
      nonHier.forEach((k) => (snapshot[k] = r.cells[k]?.value));
      console.log('[GridView] first-row non-hier cells:', snapshot);
    }
  }, [grid, leafColumns]);

  const onHeaderScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
    const sl = (e.target as HTMLDivElement).scrollLeft;
    if (containerRef.current && containerRef.current.scrollLeft !== sl) {
      containerRef.current.scrollLeft = sl;
    }
  };

  React.useLayoutEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const sbw = containerRef.current.offsetWidth - containerRef.current.clientWidth;
      setHeaderPadRight(sbw > 0 ? sbw : 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [grid.rows.length, leafColumns.length, tableWidth, height]);

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
      <div ref={headerRef} onScroll={onHeaderScroll} style={{ overflowX: 'auto', overflowY: 'hidden', paddingRight: headerPadRight, background: '#444' }}>
        <table style={{ width: tableWidth, borderCollapse: 'collapse', tableLayout: 'fixed', background: '#444', borderBottom: '1px solid #333' }}>
          <colgroup>
            {leafColumns.map((c) => (
              <col key={c.key} style={{ width: colWidths[c.key] ?? baseColWidth }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {groups.map((g, i) => {
                if (g.hierarchical) {
                  return (
                    <th key={`${g.name}-${i}`} colSpan={g.count} style={{ borderRight: '1px solid #555', padding: '6px 8px', textAlign: 'center', fontWeight: 700, background: '#444', color: '#fff' }}>
                      {g.name}
                    </th>
                  );
                }
                // non-hierarchical: rowspan=2 (merged cell)
                const label = childLabel(g.name);
                return (
                  <th key={`${g.name}-${i}`} rowSpan={2} style={{ borderRight: '1px solid #555', padding: '6px 8px', textAlign: 'center', fontWeight: 700, background: '#444', color: '#fff' }}>
                    {label}
                  </th>
                );
              })}
            </tr>
            <tr style={{ background: '#555' }}>
              {leafColumns.map((c) => (
                c.key.includes('.') ? (
                  <th key={`child-${c.key}`} style={{ borderRight: '1px solid #555', padding: '4px 6px', textAlign: 'center', fontWeight: 600, color: '#fff' }}>
                    {childLabel(c.key)}
                  </th>
                ) : null
              ))}
            </tr>
          </thead>
        </table>
      </div>
      <div ref={containerRef} onScroll={(e) => { onScroll(e); if (headerRef.current) headerRef.current.scrollLeft = (e.target as HTMLDivElement).scrollLeft; }} style={{ height, overflow: 'auto' }}>
        <table style={{ width: tableWidth, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            {leafColumns.map((c) => (
              <col key={`body-${c.key}`} style={{ width: colWidths[c.key] ?? baseColWidth }} />
            ))}
          </colgroup>
          <tbody>
            {grid.rows.map((r, rowIdx) => {
              // Determine vertical span as the max length among hierarchical groups for this row
              const groupNames = Array.from(new Set(leafColumns.filter(c => c.key.includes('.')).map(c => c.key.split('.')[0])));
              let span = 1;
              for (const g of groupNames) {
                const lenA = r.groupArrays?.[g]?.length ?? 0;
                const derived = deriveGroupValues(r, g);
                const lenB = Math.max(0, ...Object.values(derived).map(a => a.length));
                const len = Math.max(lenA, lenB);
                if (len > span) span = len;
              }
              if (span <= 0) span = 1;
              if (rowIdx === 0) {
                try {
                  const dbg: Record<string, number> = {};
                  groupNames.forEach((g) => (dbg[g] = r.groupArrays?.[g]?.length ?? 0));
                  console.log('[GridView] row0 span=%d groups=%o', span, dbg);
                  console.log('[GridView] leafColumns=%o', leafColumns.map(c => c.key));
                } catch {}
              }

              return Array.from({ length: span }, (_, subIdx) => (
                <tr key={`${r.id}-${subIdx}`} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  {leafColumns.map((c, colIdx) => {
                    const isHier = c.key.includes('.');
                    if (!isHier) {
                      if (subIdx === 0) {
                        const v = r.cells[c.key]?.value;
                        return (
                          <td
                            key={`${r.id}-nh-${colIdx}`}
                            rowSpan={span}
                            style={{
                              padding: '6px 8px',
                              borderRight: '1px solid #f3f3f3',
                              ...wrappingStyles,
                              fontFamily: 'monospace',
                              fontSize: fontSizePx,
                              boxSizing: 'border-box',
                              textAlign: 'left',
                            }}
                            title={formatCell(v)}
                          >
                            {formatCell(v)}
                          </td>
                        );
                      }
                      return null;
                    }
                    const [groupName, ...rest] = c.key.split('.');
                    const field = rest.join('.') || c.key;
                    const arr = r.groupArrays?.[groupName] || [];
                    let value: unknown = arr[subIdx]?.[field];
                    if (value === undefined) {
                      const derived = deriveGroupValues(r, groupName);
                      value = derived[field]?.[subIdx];
                    }
                    return (
                      <td
                        key={`${r.id}-h-${colIdx}-${subIdx}`}
                        style={{
                          padding: '6px 8px',
                          borderRight: '1px solid #f3f3f3',
                          ...wrappingStyles,
                          fontFamily: 'monospace',
                          fontSize: fontSizePx,
                          boxSizing: 'border-box',
                          textAlign: 'left',
                        }}
                        title={formatCell(value)}
                      >
                        {formatCell(value)}
                      </td>
                    );
                  })}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const t = typeof v;
  if (t === 'string' || t === 'number' || t === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
