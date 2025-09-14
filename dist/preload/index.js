"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('api', {
    app: {
        getVersion: async () => electron_1.ipcRenderer.invoke('app:getVersion'),
    },
    file: {
        open: async (path) => {
            try {
                console.log('[preload] invoking file:openRequest', { hasPath: !!path });
                const res = await electron_1.ipcRenderer.invoke('file:openRequest', { path });
                console.log('[preload] file:openRequest result', { canceled: res?.canceled, hasContent: !!res?.content });
                return res;
            }
            catch (e) {
                console.error('[preload] file:openRequest error', e);
                return { canceled: true };
            }
        },
        save: async (path, content) => electron_1.ipcRenderer.invoke('file:saveRequest', { path, content }),
        saveAs: async (defaultPath, content) => electron_1.ipcRenderer.invoke('file:saveAsRequest', { defaultPath, content }),
    },
    validate: async (content, schema) => electron_1.ipcRenderer.invoke('validate:yaml', { content, schema }),
});
