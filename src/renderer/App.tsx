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
  const [wrapCells, setWrapCells] = React.useState(true);
  const [minColWidth, setMinColWidth] = React.useState(30);
  const [maxColWidth, setMaxColWidth] = React.useState(120);
  const [fontSizePx, setFontSizePx] = React.useState(12);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Use shared projection logic (also covered by unit tests)

  const getVersion = async () => {
    const v = await window.api.app.getVersion();
    setVersion(v.version);
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const onPickFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    try {
      const f = e.target.files?.[0];
      if (!f) return;
      const text = await f.text();
      console.log('[App] picked file:', f.name, 'bytes=', text.length);
      setPath(f.name);
      setContent(text);
      try {
        const ast = YAML.parse(text);
        const g = project(ast);
        setGrid(g);
      } catch (err) {
        console.error('YAML parse failed', err);
        setGrid(null);
      }
    } finally {
      // allow re-picking the same file later
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openSampleComm = async () => {
    const res = await window.api.file.open('samples/communication_requirements.sample.yaml');
    if (!res.canceled && res.content && res.path) {
      setPath(res.path);
      setContent(res.content);
      try {
        const ast = YAML.parse(res.content);
        const g = project(ast);
        setGrid(g);
      } catch (e) {
        console.error('YAML parse failed', e);
        setGrid(null);
      }
    }
  };

  const openSampleContacts = async () => {
    const res = await window.api.file.open('samples/contacts.sample.yaml');
    if (!res.canceled && res.content && res.path) {
      setPath(res.path);
      setContent(res.content);
      try {
        const ast = YAML.parse(res.content);
        const g = project(ast);
        setGrid(g);
      } catch (e) {
        console.error('YAML parse failed', e);
        setGrid(null);
      }
    }
  };

  const renderGrid = () =>
    grid ? (
      <GridView
        grid={grid}
        wrapCells={wrapCells}
        minColWidth={minColWidth}
        maxColWidth={maxColWidth}
        fontSizePx={fontSizePx}
      />
    ) : null;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <h1>ローカルスプレッドシート編集 (MVP)</h1>
      <p>
        App Version: <code>{version || '(click to load)'}</code>{' '}
        <button onClick={getVersion}>Get Version</button>
      </p>
      <p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".yaml,.yml,application/x-yaml,text/yaml"
          style={{ display: 'none' }}
          onChange={onPickFile}
        />
        <button onClick={triggerFilePicker}>Open YAML…</button>
        <span style={{ marginLeft: 8 }} />
        <button onClick={openSampleComm}>Open Sample: Communication Requirements</button>
        <span style={{ marginLeft: 8 }} />
        <button onClick={openSampleContacts}>Open Sample: Contacts</button>
      </p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={wrapCells} onChange={(e) => setWrapCells(e.target.checked)} /> Wrap cells
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          Min width:
          <input
            type="number"
            value={minColWidth}
            min={30}
            max={maxColWidth}
            onChange={(e) => setMinColWidth(Math.min(Math.max(30, Number(e.target.value) || 0), maxColWidth))}
            style={{ width: 80 }}
          />
          px
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          Max width:
          <input
            type="number"
            value={maxColWidth}
            min={minColWidth}
            max={2000}
            onChange={(e) => setMaxColWidth(Math.max(minColWidth, Number(e.target.value) || 0))}
            style={{ width: 80 }}
          />
          px
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          Font:
          <input
            type="number"
            value={fontSizePx}
            min={10}
            max={18}
            onChange={(e) => setFontSizePx(Math.min(24, Math.max(10, Number(e.target.value) || 0)))}
            style={{ width: 60 }}
          />
          px
        </label>
      </div>
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
