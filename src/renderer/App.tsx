import React from 'react';
import * as YAML from 'yaml';
import type { GridModel } from './types';
import { project } from './lib/project';
import { GridView } from './components/GridView';
import { diffLines } from 'diff';

declare global {
  interface Window {
    api: {
      app: { getVersion: () => Promise<{ version: string }> };
      file: {
        open: (path?: string) => Promise<{ path?: string; content?: string; canceled?: boolean }>;
        save: (path: string, content: string) => Promise<{ path: string }>;
        saveAs: (defaultPath: string | undefined, content: string) => Promise<{ path?: string; canceled?: boolean }>;
      };
      validate: (content: string, schema: 'communication' | 'contacts') => Promise<{ ok: boolean; errors?: any[] }>;  
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
  const [ast, setAst] = React.useState<any | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [canSaveDirect, setCanSaveDirect] = React.useState(false);

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
        const parsed = YAML.parse(text);
        setAst(parsed);
        const g = project(parsed);
        setGrid(g);
        setDirty(false);
        setCanSaveDirect(false);
        console.log('[App] state init after open', { dirty: false, canSaveDirect: false });
        // 新規読み込み直後は未編集扱い、直接保存不可（パス不明のため）
        // Save Asのみ可
        // pathはファイル名のみ（file inputのため）
        // contentは原文を保持
        // astはparsed
        // dirtyはfalse
        // canSaveDirectはfalse
        // これにより、未編集でSave As時は原文を保存し、差分0となる
        // 編集後はdirty=trueとなり、stringify結果を保存
        // canSaveDirectはSave As成功後true
        // Saveで直接保存できるのは実パスが判明した後
        // Windows/Unixの区別は不要
        // ログ
        console.log('[App] state init after open', { dirty: false, canSaveDirect: false });
        
      } catch (err) {
        console.error('YAML parse failed', err);
        setGrid(null);
      }
    } finally {
      // allow re-picking the same file later
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const setDeep = (obj: any, path: string, value: unknown) => {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {};
      cur = cur[k];
    }
    cur[parts[parts.length - 1]] = value as any;
  };

  const handleEdit = (rowIndex: number, key: string, value: string, subIndex?: number) => {
    if (!ast || !grid) return;
    try {
      // Detect dataset (array to edit)
      let dataset: any[] | null = null;
      let container: any = ast;
      if (Array.isArray(ast)) dataset = ast;
      else if (ast && typeof ast === 'object') {
        if (Array.isArray((ast as any)['要件'])) {
          container = ast;
          dataset = (ast as any)['要件'];
        } else if (Array.isArray((ast as any)['連絡先'])) {
          container = ast;
          dataset = (ast as any)['連絡先'];
        }
      }
      if (!dataset) {
        // single-object case
        const next = { ...(ast as any) };
        setDeep(next, key, value);
        setAst(next);
        setGrid(project(next));
        setContent(YAML.stringify(next));
        console.log('[App] edited single-object cell', { key, rowIndex, subIndex });
        // 編集済み
        (setDirty as any)(true);
        return;
      }
      const nextArr = [...dataset];
      const row = { ...(nextArr[rowIndex] || {}) };
      if (key.includes('.') && typeof subIndex === 'number') {
        const [group, ...rest] = key.split('.');
        const field = rest.join('.') || key;
        const arr = Array.isArray(row[group]) ? [...(row[group] as any[])] : [];
        const item = { ...(arr[subIndex] || {}) };
        item[field] = value;
        arr[subIndex] = item;
        row[group] = arr;
      } else {
        setDeep(row, key, value);
      }
      nextArr[rowIndex] = row;
      const nextAst = { ...(Array.isArray(ast) ? {} : ast) } as any;
      if (Array.isArray(ast)) {
        // replace root array
        (nextAst as any).length = 0; // no-op placeholder
      }
      if (Array.isArray(ast)) {
        // if the root is array
        setAst(nextArr as any);
        setGrid(project(nextArr as any));
        setContent(YAML.stringify(nextArr as any));
        console.log('[App] edited array cell', { key, rowIndex, subIndex });
        (setDirty as any)(true);
      } else {
        if (Array.isArray((ast as any)['要件'])) nextAst['要件'] = nextArr;
        else if (Array.isArray((ast as any)['連絡先'])) nextAst['連絡先'] = nextArr;
        setAst(nextAst);
        setGrid(project(nextAst));
        setContent(YAML.stringify(nextAst));
        console.log('[App] edited array-under-object cell', { key, rowIndex, subIndex });
        (setDirty as any)(true);
      }
    } catch (e) {
      console.error('edit failed', e);
    }
  };

  const detectSchema = (text: string): 'communication' | 'contacts' | null => {
    try {
      const obj = YAML.parse(text);
      if (obj && typeof obj === 'object') {
        if (Array.isArray((obj as any)['要件'])) return 'communication';
        if (Array.isArray((obj as any)['連絡先'])) return 'contacts';
      }
    } catch {}
    return null;
  };

  const doSave = async (as?: boolean) => {
    if (!ast) return;
    console.log('[App] doSave called', { as });
    const nextText = YAML.stringify(ast);
    console.log('[App] stringify done', { bytes: nextText.length, dirty });
    const before = content;
    const textToSave = dirty ? nextText : before; // 未編集なら原文をそのまま使う
    const hunks = diffLines(before, textToSave);
    const added = hunks.filter(h => (h as any).added).length;
    const removed = hunks.filter(h => (h as any).removed).length;
    const summary = `差分: +${added}, -${removed}. 保存しますか？`;
    const schema = detectSchema(nextText);
    console.log('[App] detected schema', schema);
    if (schema) {
      try {
        const res = await window.api.validate(nextText, schema);
        console.log('[App] validate result', res);
        if (!res.ok) {
          const msg = `スキーマ検証エラー:\n` + (res.errors || []).map(e => `- ${e.instancePath || ''} ${e.message || ''}`).join('\n');
          if (!confirm(msg + '\nそれでも保存しますか？')) return;
        }
      } catch (e) {
        console.warn('[App] validate invoke failed, continuing with user confirm', e);
      }
    }
    if (!confirm(summary)) return;
    const schemaName = schema === 'contacts' ? 'contacts.yaml' : schema === 'communication' ? 'communication_requirements.yaml' : 'data.yaml';
    // Save As が必要な条件: 明示as指定 / 直接保存不可
    if (as || !canSaveDirect) {
      try {
        const r = await (window as any).api.file.saveAs(path || schemaName, textToSave);
        console.log('[App] saveAs result', r);
        if ((r as any)?.canceled || !r?.path) return;
        setPath(r.path);
        setContent(textToSave);
        (setDirty as any)(false);
        setAst(YAML.parse(textToSave));
        // 直接保存可能となる
        setCanSaveDirect(true);
        return;
      } catch (err) {
        console.warn('[App] saveAs IPC failed, fallback to browser download', err);
        try {
          const blob = new Blob([textToSave], { type: 'text/yaml' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = path || schemaName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setContent(textToSave);
          (setDirty as any)(false);
          setAst(YAML.parse(textToSave));
          // 直接保存フラグは維持（falseのまま）
          return;
        } catch (e) {
          alert('保存に失敗しました（フォールバックも失敗）');
          return;
        }
      }
    }
    // 直接保存できる場合
    try {
      const r = await (window as any).api.file.save(path, textToSave);
      console.log('[App] save result', r);
      setContent(textToSave);
      (setDirty as any)(false);
      setAst(YAML.parse(textToSave));
    } catch (e) {
      console.error('[App] save failed', e);
      alert('保存に失敗しました');
    }
  };

  // Sample open helpers removed now that Open YAML… works reliably

  const renderGrid = () =>
    grid ? (
      <GridView
        grid={grid}
        wrapCells={wrapCells}
        minColWidth={minColWidth}
        maxColWidth={maxColWidth}
        fontSizePx={fontSizePx}
        onEdit={handleEdit}
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
        <button onClick={() => doSave(false)} disabled={!ast}>Save</button>
        <span style={{ marginLeft: 8 }} />
        <button onClick={() => doSave(true)} disabled={!ast}>Save As…</button>
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
