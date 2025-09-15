import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as YAML from 'yaml';
import { join, isAbsolute } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

const isDev = process.env.ELECTRON_START_URL || !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    // In development, inject a restrictive CSP to silence Electron warnings
    // while allowing Vite's HMR (WebSocket) and inline style tags it creates.
    const devCsp = [
      // Allow Vite HMR, React Refresh, and workers in dev
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' ws:",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ');

    win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      const headers = details.responseHeaders || {};
      headers['Content-Security-Policy'] = [devCsp];
      callback({ responseHeaders: headers });
    });

    const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
    win.loadURL(devUrl);
    const shouldOpenDevTools = process.env.ELECTRON_OPEN_DEVTOOLS === '1';
    if (shouldOpenDevTools) {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    win.loadFile(join(__dirname, '../../dist/renderer/index.html'));
  }
}

app.whenReady().then(() => {
  console.log('[main] app ready – creating window');
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers (minimal per SPEC-IPC)
ipcMain.handle('app:getVersion', () => ({ version: app.getVersion() }));

ipcMain.handle('file:openRequest', async (_e, args: { path?: string }) => {
  try {
    console.log('[main] file:openRequest', { hasPath: !!args?.path });
    if (!args?.path) {
      const browser = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      const options = {
        title: 'Open YAML',
        properties: ['openFile'] as const,
        defaultPath: join(app.getAppPath(), 'samples'),
        filters: [
          { name: 'YAML', extensions: ['yaml', 'yml'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      };
      // Try attached dialog first
      const res1 = await dialog.showOpenDialog(browser ?? undefined, options as any);
      console.log('[main] openDialog (attached) result', { canceled: res1.canceled, count: res1.filePaths?.length ?? 0 });
      let picked: string | undefined = res1.filePaths?.[0];
      if (!picked && res1.canceled) {
        // Fallback: unattached dialog
        const res2 = await dialog.showOpenDialog(options as any);
        console.log('[main] openDialog (unattached) result', { canceled: res2.canceled, count: res2.filePaths?.length ?? 0 });
        picked = res2.filePaths?.[0];
        if (!picked && res2.canceled) {
          // Last resort: sync dialog (some environments behave better)
          const res3 = dialog.showOpenDialogSync(options as any);
          console.log('[main] openDialogSync result', { count: res3?.length ?? 0 });
          picked = res3 && res3[0];
        }
      }
      if (!picked) return { canceled: true };
      const content = readFileSync(picked, 'utf8');
      return { path: picked, content };
    }
    const p = isAbsolute(args.path) ? args.path : join(app.getAppPath(), args.path);
    const content = readFileSync(p, 'utf8');
    return { path: p, content };
  } catch (err: any) {
    return { canceled: true, error: String(err?.message || err) } as any;
  }
});

ipcMain.handle('file:saveRequest', (_e, args: { path: string; content: string }) => {
  console.log('[main] file:saveRequest', { path: args.path, bytes: args.content?.length });
  // Create timestamped backup if file exists
  try {
    const old = readFileSync(args.path, 'utf8');
    const ts = new Date();
    const y = ts.getFullYear();
    const m = String(ts.getMonth() + 1).padStart(2, '0');
    const d = String(ts.getDate()).padStart(2, '0');
    const hh = String(ts.getHours()).padStart(2, '0');
    const mm = String(ts.getMinutes()).padStart(2, '0');
    const ss = String(ts.getSeconds()).padStart(2, '0');
    const bak = `${args.path}.${y}${m}${d}-${hh}${mm}${ss}.bak`;
    writeFileSync(bak, old, 'utf8');
  } catch {}
  writeFileSync(args.path, args.content, 'utf8');
  return { path: args.path };
});

ipcMain.handle('file:saveAsRequest', async (_e, args: { defaultPath?: string; content: string }) => {
  console.log('[main] file:saveAsRequest', { defaultPath: args.defaultPath, bytes: args.content?.length });
  const browser = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  const res = await dialog.showSaveDialog(browser ?? undefined, {
    title: 'Save YAML',
    defaultPath: args.defaultPath || 'data.yaml',
    filters: [{ name: 'YAML', extensions: ['yaml', 'yml'] }],
  });
  if (res.canceled || !res.filePath) return { canceled: true } as any;
  writeFileSync(res.filePath, args.content, 'utf8');
  return { path: res.filePath };
});

ipcMain.handle('validate:yaml', (_e, args: { content: string; schema: 'communication' | 'contacts' }) => {
  console.log('[main] validate:yaml', { schema: args.schema, bytes: args.content?.length });
  try {
    const data = YAML.parse(args.content);
    // Lazy require to avoid hard dependency during dev
    let Ajv2020: any;
    let addFormats: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      Ajv2020 = (require('ajv/dist/2020') as any).default || require('ajv/dist/2020');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      addFormats = require('ajv-formats');
    } catch (err) {
      console.warn('[main] validate:yaml skipped (ajv not installed)');
      return { ok: true, skipped: 'ajv-missing' } as any;
    }
    let ajv: any;
    try {
      ajv = new Ajv2020({ allErrors: true, strict: false });
    } catch (e) {
      // Fallback: try classic Ajv and manually add 2020-12 meta
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const AjvClassic = (require('ajv') as any).default || require('ajv');
        ajv = new AjvClassic({ allErrors: true, strict: false });
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const meta2020 = require('ajv/dist/refs/json-schema-2020-12.json');
        if (ajv.addMetaSchema) ajv.addMetaSchema(meta2020);
        try { ajv.addSchema(meta2020, 'https://json-schema.org/draft/2020-12/schema'); } catch {}
      } catch (ee) {
        console.warn('[main] validate:yaml failed to init Ajv', ee);
        return { ok: true, skipped: 'ajv-init-failed' } as any;
      }
    }
    addFormats(ajv);
    // Resolve schema path in dev/prod both: try app root, then relative to compiled dir
    const appRoot = app.getAppPath();
    const primary = args.schema === 'contacts'
      ? join(appRoot, 'samples/contacts.schema.json')
      : join(appRoot, 'samples/communication_requirements.schema.json');
    const secondary = args.schema === 'contacts'
      ? join(__dirname, '../../samples/contacts.schema.json')
      : join(__dirname, '../../samples/communication_requirements.schema.json');
    const tertiary = args.schema === 'contacts'
      ? join(process.cwd(), 'samples/contacts.schema.json')
      : join(process.cwd(), 'samples/communication_requirements.schema.json');
    let schemaText: string | null = null;
    try { schemaText = readFileSync(primary, 'utf8'); } catch {}
    if (!schemaText) {
      try { schemaText = readFileSync(secondary, 'utf8'); } catch {}
    }
    if (!schemaText) {
      try { schemaText = readFileSync(tertiary, 'utf8'); } catch {}
    }
    if (!schemaText) {
      console.warn('[main] schema not found for', args.schema, { primary, secondary });
      return { ok: true, skipped: 'schema-not-found' } as any;
    }
    const schema = JSON.parse(schemaText);
    const validate = ajv.compile(schema);
    const ok = validate(data);
    const result = ok ? { ok: true } : { ok: false, errors: validate.errors };
    console.log('[main] validate:yaml result', { ok: (result as any).ok, errors: (result as any).errors?.length || 0 });
    return result;
  } catch (e: any) {
    console.warn('[main] validate:yaml error', e?.message || e);
    return { ok: false, errors: [{ message: String(e?.message || e) }] } as any;
  }
});
