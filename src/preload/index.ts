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
    save: async (path: string, content: string): Promise<{ path: string }> => {
      console.log('[preload] invoking file:saveRequest', { path, bytes: content?.length });
      const res = await ipcRenderer.invoke('file:saveRequest', { path, content });
      console.log('[preload] file:saveRequest result', res);
      return res;
    },
    saveAs: async (defaultPath: string | undefined, content: string): Promise<{ path?: string; canceled?: boolean }> => {
      console.log('[preload] invoking file:saveAsRequest', { defaultPath, bytes: content?.length });
      const res = await ipcRenderer.invoke('file:saveAsRequest', { defaultPath, content });
      console.log('[preload] file:saveAsRequest result', res);
      return res;
    },
  },
  validate: async (content: string, schema: 'communication' | 'contacts'): Promise<{ ok: boolean; errors?: any[] }> => {
    console.log('[preload] invoking validate:yaml', { schema, bytes: content?.length });
    const res = await ipcRenderer.invoke('validate:yaml', { content, schema });
    console.log('[preload] validate:yaml result', res);
    return res;
  },
});

export {}; // ensure module scope
