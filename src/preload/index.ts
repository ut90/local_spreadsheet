import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  app: {
    getVersion: async (): Promise<{ version: string }> => ipcRenderer.invoke('app:getVersion'),
  },
  file: {
    open: async (path?: string): Promise<{ path?: string; content?: string; canceled?: boolean }> =>
      ipcRenderer.invoke('file:openRequest', { path }),
    save: async (path: string, content: string): Promise<{ path: string }> =>
      ipcRenderer.invoke('file:saveRequest', { path, content }),
  },
});

export {}; // ensure module scope

