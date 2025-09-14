import { app, BrowserWindow, ipcMain, dialog } from 'electron';
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
    if (!args?.path) {
      const res = await dialog.showOpenDialog({
        title: 'Open YAML',
        properties: ['openFile'],
        filters: [
          { name: 'YAML', extensions: ['yaml', 'yml'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });
      if (res.canceled || !res.filePaths?.[0]) return { canceled: true };
      const p = res.filePaths[0];
      const content = readFileSync(p, 'utf8');
      return { path: p, content };
    }
    const p = isAbsolute(args.path) ? args.path : join(app.getAppPath(), args.path);
    const content = readFileSync(p, 'utf8');
    return { path: p, content };
  } catch (err: any) {
    return { canceled: true, error: String(err?.message || err) } as any;
  }
});

ipcMain.handle('file:saveRequest', (_e, args: { path: string; content: string }) => {
  writeFileSync(args.path, args.content, 'utf8');
  return { path: args.path };
});
