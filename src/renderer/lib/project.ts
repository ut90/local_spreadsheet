import type { GridModel } from "../../renderer/types";

export function inferType(v: any): 'string' | 'int' | 'float' | 'bool' | 'null' | 'date' | 'unknown' {
  if (v === null) return 'null';
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'float';
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return 'date';
    return 'string';
  }
  return 'unknown';
}

export function flatten(obj: any, prefix = ''): Record<string, any> {
  const out: Record<string, any> = {};
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => {
      const key = prefix ? `${prefix}.${i}` : String(i);
      if (v && typeof v === 'object') {
        Object.assign(out, flatten(v, key));
      } else {
        out[key] = v;
      }
    });
    return out;
  }

  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (Array.isArray(v)) {
        v.forEach((item, i) => {
          const arrKey = `${key}.${i}`;
          if (item && typeof item === 'object') {
            Object.assign(out, flatten(item, arrKey));
          } else {
            out[arrKey] = item;
          }
        });
      } else if (v && typeof v === 'object') {
        Object.assign(out, flatten(v, key));
      } else {
        out[key] = v;
      }
    }
  } else {
    out[prefix || 'value'] = obj;
  }
  return out;
}

export function project(ast: any): GridModel {
  // Normalize: if top-level has an array field (e.g., 要件), treat that array as the dataset.
  let dataset: any[] | null = null;
  if (Array.isArray(ast)) {
    dataset = ast;
  } else if (ast && typeof ast === 'object') {
    const entries = Object.entries(ast);
    const preferredKey = entries.find(([k, v]) => k === '要件' && Array.isArray(v))?.[0];
    if (preferredKey) {
      dataset = (ast as any)[preferredKey] as any[];
    } else {
      const arrayProps = entries
        .filter(([, v]) => Array.isArray(v))
        .map(([k, v]) => ({ key: k, len: (v as any[]).length }));
      if (arrayProps.length > 0) {
        arrayProps.sort((a, b) => b.len - a.len);
        dataset = (ast as any)[arrayProps[0].key] as any[];
      }
    }
  }

  // Helper: aggregate arrays-of-objects into two-level columns: `${group}.${field}`
  // Also returns top-level arrays-of-objects in a side map for row-span rendering.
  const aggregateTwoLevel = (obj: any, prefix = '', sideGroups?: Record<string, any[]>): Record<string, any> => {
    const out: Record<string, any> = {};
    if (obj == null) return out;
    if (Array.isArray(obj)) {
      // For top-level arrays we should never hit here (handled above), but in nested case:
      const joined = obj.map((v) => simpleToString(v)).filter((s) => s.length > 0).join('、');
      if (prefix) out[prefix] = joined;
      return out;
    }
    if (typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (Array.isArray(v)) {
          if (v.every((el) => el && typeof el === 'object' && !Array.isArray(el))) {
            // Array of objects → group by fields under `${k}.<field>` and join values across elements
            // Keep original array for row-span aware rendering at top-level only
            if (!prefix && sideGroups) sideGroups[k] = v as any[];
            // Determine field order by first element, then append newly seen fields
            const first = (v as any[])[0] || {};
            const ordered: string[] = [];
            Object.keys(first as any).forEach((f) => ordered.push(f));
            (v as any[]).forEach((el) => {
              Object.keys(el as any).forEach((f) => {
                if (!ordered.includes(f)) ordered.push(f);
              });
            });
            for (const f of ordered) {
              const values = (v as any[]).map((el) => (el as any)?.[f]).filter((x) => x !== undefined);
              out[`${k}.${f}`] = values.map((vv) => simpleToString(vv)).filter((s) => s.length > 0).join('、');
            }
          } else {
            // Array of primitives or mixed → join under the array key
            out[k] = (v as any[]).map((vv) => simpleToString(vv)).filter((s) => s.length > 0).join('、');
          }
        } else if (v && typeof v === 'object') {
          Object.assign(out, aggregateTwoLevel(v, key, sideGroups));
        } else {
          out[key] = v;
        }
      }
      return out;
    }
    if (prefix) out[prefix] = obj;
    return out;
  };

  const rows: any[] = [];
  const colSet = new Set<string>();
  const colOrder: string[] = [];
  const see = (k: string) => {
    if (!colSet.has(k)) {
      colSet.add(k);
      colOrder.push(k);
    }
  };

  if (dataset) {
    dataset.forEach((item: any, idx: number) => {
      const sideGroups: Record<string, any[]> = {};
      const flat = aggregateTwoLevel(item, '', sideGroups);
      Object.keys(flat).forEach((k) => see(k));
      rows.push({ id: String(idx), cells: flat, groupArrays: sideGroups });
    });
  } else if (ast && typeof ast === 'object') {
    const sideGroups: Record<string, any[]> = {};
    const flat = aggregateTwoLevel(ast, '', sideGroups);
    Object.keys(flat).forEach((k) => see(k));
    rows.push({ id: '0', cells: flat, groupArrays: sideGroups });
  } else {
    rows.push({ id: '0', cells: { value: ast } });
    see('value');
  }

  const columns = colOrder.map((key) => ({ key, label: key, visible: true }));
  const projRows = rows.map((r) => ({
    id: r.id,
    cells: Object.fromEntries(
      columns.map((c) => {
        const v = r.cells[c.key];
        return [c.key, { value: v, type: inferType(v) }];
      }),
    ),
  }));
  return { columns, rows: projRows };
}

function simpleToString(v: any): string {
  if (v === null || v === undefined) return '';
  const t = typeof v;
  if (t === 'string' || t === 'number' || t === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
