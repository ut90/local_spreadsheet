"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const node_path_1 = require("node:path");
const node_fs_1 = require("node:fs");
const isDev = process.env.ELECTRON_START_URL || !electron_1.app.isPackaged;
function createWindow() {
    const win = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: (0, node_path_1.join)(__dirname, '../preload/index.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });
    if (isDev) {
        const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
        win.loadURL(devUrl);
        win.webContents.openDevTools({ mode: 'detach' });
    }
    else {
        win.loadFile((0, node_path_1.join)(__dirname, '../../dist/renderer/index.html'));
    }
}
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
// IPC Handlers (minimal per SPEC-IPC)
electron_1.ipcMain.handle('app:getVersion', () => ({ version: electron_1.app.getVersion() }));
electron_1.ipcMain.handle('file:openRequest', (_e, args) => {
    if (!args?.path)
        return { canceled: true };
    const content = (0, node_fs_1.readFileSync)(args.path, 'utf8');
    return { path: args.path, content };
});
electron_1.ipcMain.handle('file:saveRequest', (_e, args) => {
    (0, node_fs_1.writeFileSync)(args.path, args.content, 'utf8');
    return { path: args.path };
});
