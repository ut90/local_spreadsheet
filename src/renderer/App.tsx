import React from 'react';
import * as YAML from 'yaml';
import type { GridModel } from './types';
import { project } from './lib/project';
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

  // Use shared projection logic (also covered by unit tests)

  const getVersion = async () => {
    const v = await window.api.app.getVersion();
    setVersion(v.version);
  };

  const openSample = async () => {
    const res = await window.api.file.open('samples/communication_requirements.sample.yaml');
    if (!res.canceled && res.content && res.path) {
      console.log('[App] openSample: path=%s, bytes=%d', res.path, res.content.length);
      setPath(res.path);
      setContent(res.content);
      try {
        const ast = YAML.parse(res.content);
        console.log('[App] YAML parsed, astType=%s', Array.isArray(ast) ? 'array' : typeof ast);
        const g = project(ast);
        console.log('[App] projected grid: columns=%d, rows=%d', g.columns.length, g.rows.length);
        try {
          const sample = g.rows[0]?.cells || {};
          console.log('[App] first row cell keys:', Object.keys(sample));
          console.log('[App] first row 自システム=%o 他システム=%o', sample['自システム']?.value, sample['他システム']?.value);
        } catch {}
        setGrid(g);
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
