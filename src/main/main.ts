import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';
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
    const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
    win.loadURL(devUrl);
    win.webContents.openDevTools({ mode: 'detach' });
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

ipcMain.handle('file:openRequest', (_e, args: { path?: string }) => {
  if (!args?.path) return { canceled: true };
  const content = readFileSync(args.path, 'utf8');
  return { path: args.path, content };
});

ipcMain.handle('file:saveRequest', (_e, args: { path: string; content: string }) => {
  writeFileSync(args.path, args.content, 'utf8');
  return { path: args.path };
});

