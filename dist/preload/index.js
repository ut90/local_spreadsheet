"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('api', {
    app: {
        getVersion: async () => electron_1.ipcRenderer.invoke('app:getVersion'),
    },
    file: {
        open: async (path) => electron_1.ipcRenderer.invoke('file:openRequest', { path }),
        save: async (path, content) => electron_1.ipcRenderer.invoke('file:saveRequest', { path, content }),
    },
});
