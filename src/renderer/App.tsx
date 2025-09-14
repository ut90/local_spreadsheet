import React from 'react';
import * as YAML from 'yaml';
import type { GridModel } from './types';
import { GridView } from './components/GridView';

declare global {
  interface Window {
    api: {
      app: { getVersion: () => Promise<{ version: string }> };
      file: {
        open: (path?: string) => Promise<{ path?: string; content?: string; canceled?: boolean }>;
        save: (path: string, content: string) => Promise<{ path: string }>;
      };
    };
  }
}

export const App: React.FC = () => {
  const [version, setVersion] = React.useState<string>('');
  const [path, setPath] = React.useState<string>('');
  const [content, setContent] = React.useState<string>('');
  const [grid, setGrid] = React.useState<GridModel | null>(null);

  // Simple in-renderer projection to avoid worker issues in some environments
  function inferType(v: any): 'string' | 'int' | 'float' | 'bool' | 'null' | 'date' | 'unknown' {
    if (v === null) return 'null';
    if (typeof v === 'boolean') return 'bool';
    if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'float';
    if (typeof v === 'string') {
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
  function project(ast: any): GridModel {
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
    const columns = Array.from(colSet)
      .sort()
      .map((key) => ({ key, label: key, visible: true }));
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

  const getVersion = async () => {
    const v = await window.api.app.getVersion();
    setVersion(v.version);
  };

  const openSample = async () => {
    const res = await window.api.file.open('samples/communication_requirements.sample.yaml');
    if (!res.canceled && res.content && res.path) {
      setPath(res.path);
      setContent(res.content);
      try {
        const ast = YAML.parse(res.content);
        setGrid(project(ast));
      } catch (e) {
        console.error('YAML parse failed', e);
        setGrid(null);
      }
    }
  };

  const renderGrid = () => (grid ? <GridView grid={grid} /> : null);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <h1>ローカルスプレッドシート編集 (MVP)</h1>
      <p>
        App Version: <code>{version || '(click to load)'}</code>{' '}
        <button onClick={getVersion}>Get Version</button>
      </p>
      <p>
        <button onClick={openSample}>Open Sample YAML</button>
      </p>
      {path && (
        <div>
          <div>
            <strong>Path:</strong> <code>{path}</code>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ width: '100%', height: 300, fontFamily: 'monospace' }}
          />
          {renderGrid()}
        </div>
      )}
      <p style={{ marginTop: 24, color: '#666' }}>
        This MVP scaffolding wires Electron Main/Preload/Renderer and loads a sample YAML.
      </p>
    </div>
  );
};
