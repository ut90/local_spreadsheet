import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  app: {
    getVersion: async (): Promise<{ version: string }> => ipcRenderer.invoke('app:getVersion'),
  },
  file: {
    open: async (path?: string): Promise<{ path?: string; content?: string; canceled?: boolean }> => {
      try {
        console.log('[preload] invoking file:openRequest', { hasPath: !!path });
        const res = await ipcRenderer.invoke('file:openRequest', { path });
        console.log('[preload] file:openRequest result', { canceled: (res as any)?.canceled, hasContent: !!(res as any)?.content });
        return res;
      } catch (e) {
        console.error('[preload] file:openRequest error', e);
        return { canceled: true } as any;
      }
    },
    save: async (path: string, content: string): Promise<{ path: string }> =>
      ipcRenderer.invoke('file:saveRequest', { path, content }),
  },
});

export {}; // ensure module scope
