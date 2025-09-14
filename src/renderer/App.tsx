import React from 'react';
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

  const workerRef = React.useRef<Worker | null>(null);

  React.useEffect(() => {
    // Initialize worker on mount
    const w = new Worker(new URL('./worker/yamlEngine.ts', import.meta.url), { type: 'module' });
    workerRef.current = w;
    const onMessage = (ev: MessageEvent<any>) => {
      const msg = ev.data;
      if (msg.type === 'parse:ok') {
        // Immediately project for simple preview
        const reqId = crypto.randomUUID();
        w.postMessage({ type: 'project', ast: msg.ast, reqId });
      } else if (msg.type === 'project:ok') {
        setGrid(msg.grid);
      } else if (msg.type === 'parse:error') {
        console.error('YAML parse error:', msg.message);
      }
    };
    w.addEventListener('message', onMessage as any);
    return () => {
      w.removeEventListener('message', onMessage as any);
      w.terminate();
    };
  }, []);

  const getVersion = async () => {
    const v = await window.api.app.getVersion();
    setVersion(v.version);
  };

  const openSample = async () => {
    const res = await window.api.file.open('samples/communication_requirements.sample.yaml');
    if (!res.canceled && res.content && res.path) {
      setPath(res.path);
      setContent(res.content);
      const reqId = crypto.randomUUID();
      workerRef.current?.postMessage({ type: 'parse', text: res.content, reqId });
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
