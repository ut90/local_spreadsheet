import * as YAML from 'yaml';
import { diffLines } from 'diff';

type Req =
  | { type: 'parse'; text: string; reqId: string }
  | { type: 'project'; ast: unknown; reqId: string }
  | { type: 'stringify'; ast: unknown; reqId: string }
  | { type: 'diff'; before: string; after: string; reqId: string }
  | { type: 'applyOps'; ast: unknown; ops: Op[]; reqId: string };

type Res =
  | { type: 'parse:ok'; reqId: string; ast: unknown }
  | { type: 'parse:error'; reqId: string; message: string }
  | { type: 'project:ok'; reqId: string; grid: any }
  | { type: 'stringify:ok'; reqId: string; text: string }
  | { type: 'diff:ok'; reqId: string; hunks: { added?: boolean; removed?: boolean; value: string }[] }
  | { type: 'applyOps:ok'; reqId: string; ast: unknown; grid: any };

// Minimal operation model (first slice): set scalar cell by row index + column key
type Op =
  | { type: 'setCell'; row: number; key: string; value: unknown };

function inferType(v: any): 'string' | 'int' | 'float' | 'bool' | 'null' | 'date' | 'unknown' {
  if (v === null) return 'null';
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'float';
  if (typeof v === 'string') {
    // simple date-ish detection (ISO date)
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return 'date';
    return 'string';
  }
  return 'unknown';
}

function flatten(obj: any, prefix = ''): Record<string, any> {
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

function project(ast: any) {
  // Root sequence → rows per item; mapping → single row; scalar → single row.
  const rows: any[] = [];
  const colSet = new Set<string>();

  if (Array.isArray(ast)) {
    ast.forEach((item: any, idx: number) => {
      const flat = flatten(item);
      Object.keys(flat).forEach((k) => colSet.add(k));
      rows.push({ id: String(idx), cells: flat });
    });
  } else if (ast && typeof ast === 'object') {
    const flat = flatten(ast);
    Object.keys(flat).forEach((k) => colSet.add(k));
    rows.push({ id: '0', cells: flat });
  } else {
    rows.push({ id: '0', cells: { value: ast } });
    colSet.add('value');
  }

  const columns = Array.from(colSet).sort().map((key) => ({ key, label: key, visible: true }));
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

function detectDataset(ast: any): { root: any[] | null; key?: string } {
  if (Array.isArray(ast)) return { root: ast };
  if (ast && typeof ast === 'object') {
    if (Array.isArray(ast['要件'])) return { root: ast['要件'], key: '要件' };
    const entries = Object.entries(ast);
    const arr = entries.filter(([, v]) => Array.isArray(v)) as [string, any[]][];
    if (arr.length) {
      arr.sort((a, b) => (b[1]?.length || 0) - (a[1]?.length || 0));
      return { root: arr[0][1], key: arr[0][0] };
    }
  }
  return { root: null };
}

function setDeep(obj: any, path: string, value: unknown) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value as any;
}

self.onmessage = (ev: MessageEvent<Req>) => {
  const msg = ev.data;
  try {
    if (msg.type === 'parse') {
      const ast = YAML.parse(msg.text);
      const res: Res = { type: 'parse:ok', reqId: msg.reqId, ast };
      (self as any).postMessage(res);
      return;
    }
    if (msg.type === 'project') {
      const grid = project(msg.ast as any);
      const res: Res = { type: 'project:ok', reqId: msg.reqId, grid };
      (self as any).postMessage(res);
      return;
    }
    if (msg.type === 'stringify') {
      const text = YAML.stringify(msg.ast as any);
      const res: Res = { type: 'stringify:ok', reqId: msg.reqId, text };
      (self as any).postMessage(res);
      return;
    }
    if (msg.type === 'applyOps') {
      // Apply minimal setCell ops against dataset rows
      const ast = msg.ast as any;
      const { root, key } = detectDataset(ast);
      if (!root) {
        const res: Res = { type: 'applyOps:ok', reqId: msg.reqId, ast, grid: project(ast) };
        (self as any).postMessage(res);
        return;
      }
      for (const op of msg.ops) {
        if (op.type === 'setCell') {
          const row = root[op.row];
          if (row && typeof row === 'object') {
            setDeep(row, op.key, op.value);
          }
        }
      }
      const res: Res = { type: 'applyOps:ok', reqId: msg.reqId, ast, grid: project(ast) };
      (self as any).postMessage(res);
      return;
    }
    if (msg.type === 'diff') {
      const hunks = diffLines(msg.before, msg.after);
      const res: Res = { type: 'diff:ok', reqId: msg.reqId, hunks };
      (self as any).postMessage(res);
      return;
    }
  } catch (e: any) {
    if (msg.type === 'parse') {
      const res: Res = { type: 'parse:error', reqId: msg.reqId, message: String(e?.message || e) };
      (self as any).postMessage(res);
      return;
    }
    // For others, bubble error shape minimalistically (could extend)
    const res = { type: 'parse:error', reqId: (msg as any).reqId, message: String(e?.message || e) } as Res;
    (self as any).postMessage(res);
  }
};
