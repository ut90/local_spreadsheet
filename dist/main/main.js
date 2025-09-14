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
electron_1.ipcMain.handle('file:openRequest', async (_e, args) => {
    try {
        console.log('[main] file:openRequest', { hasPath: !!args?.path });
        if (!args?.path) {
            const browser = electron_1.BrowserWindow.getFocusedWindow() || electron_1.BrowserWindow.getAllWindows()[0];
            const options = {
                title: 'Open YAML',
                properties: ['openFile'],
                defaultPath: (0, node_path_1.join)(electron_1.app.getAppPath(), 'samples'),
                filters: [
                    { name: 'YAML', extensions: ['yaml', 'yml'] },
                    { name: 'All Files', extensions: ['*'] },
                ],
            };
            // Try attached dialog first
            const res1 = await electron_1.dialog.showOpenDialog(browser ?? undefined, options);
            console.log('[main] openDialog (attached) result', { canceled: res1.canceled, count: res1.filePaths?.length ?? 0 });
            let picked = res1.filePaths?.[0];
            if (!picked && res1.canceled) {
                // Fallback: unattached dialog
                const res2 = await electron_1.dialog.showOpenDialog(options);
                console.log('[main] openDialog (unattached) result', { canceled: res2.canceled, count: res2.filePaths?.length ?? 0 });
                picked = res2.filePaths?.[0];
                if (!picked && res2.canceled) {
                    // Last resort: sync dialog (some environments behave better)
                    const res3 = electron_1.dialog.showOpenDialogSync(options);
                    console.log('[main] openDialogSync result', { count: res3?.length ?? 0 });
                    picked = res3 && res3[0];
                }
            }
            if (!picked)
                return { canceled: true };
            const content = (0, node_fs_1.readFileSync)(picked, 'utf8');
            return { path: picked, content };
        }
        const p = (0, node_path_1.isAbsolute)(args.path) ? args.path : (0, node_path_1.join)(electron_1.app.getAppPath(), args.path);
        const content = (0, node_fs_1.readFileSync)(p, 'utf8');
        return { path: p, content };
    }
    catch (err) {
        return { canceled: true, error: String(err?.message || err) };
    }
});
electron_1.ipcMain.handle('file:saveRequest', (_e, args) => {
    (0, node_fs_1.writeFileSync)(args.path, args.content, 'utf8');
    return { path: args.path };
});
