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
      let picked = res1.filePaths?.[0];
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
  writeFileSync(args.path, args.content, 'utf8');
  return { path: args.path };
});
