import * as YAML from 'yaml';
import { diffLines } from 'diff';

type Req =
  | { type: 'parse'; text: string; reqId: string }
  | { type: 'project'; ast: unknown; reqId: string }
  | { type: 'stringify'; ast: unknown; reqId: string }
  | { type: 'diff'; before: string; after: string; reqId: string };

type Res =
  | { type: 'parse:ok'; reqId: string; ast: unknown }
  | { type: 'parse:error'; reqId: string; message: string }
  | { type: 'project:ok'; reqId: string; grid: any }
  | { type: 'stringify:ok'; reqId: string; text: string }
  | { type: 'diff:ok'; reqId: string; hunks: { added?: boolean; removed?: boolean; value: string }[] };

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
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
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

