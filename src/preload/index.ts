import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('select-folder'),
  getPlatforms: () => ipcRenderer.invoke('get-platforms'),
  startSync: (config: unknown): Promise<void> => ipcRenderer.invoke('start-sync', config),
  cancelSync: (): void => { ipcRenderer.send('cancel-sync') },
  scanOrphans: (config: unknown): Promise<number> => ipcRenderer.invoke('scan-orphans', config),
  startCleanup: (config: unknown): Promise<void> => ipcRenderer.invoke('start-cleanup', config),
  cancelCleanup: (): void => { ipcRenderer.send('cancel-sync') },
  onSyncLog: (callback: (entry: unknown) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, entry: unknown): void => callback(entry)
    ipcRenderer.on('sync-log', handler)
    return () => ipcRenderer.removeListener('sync-log', handler)
  },
  onSyncStats: (callback: (stats: unknown) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, stats: unknown): void => callback(stats)
    ipcRenderer.on('sync-stats', handler)
    return () => ipcRenderer.removeListener('sync-stats', handler)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
