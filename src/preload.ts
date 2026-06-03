import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { ElectronAPI, ExternalFetchType, GameUpdatePayload, WidgetPosition } from './contracts/ipc';

console.log('Preload script loaded');

const gameUpdateListeners = new Map<(data: GameUpdatePayload) => void, (_event: IpcRendererEvent, data: GameUpdatePayload) => void>();
const editModeListeners = new Map<(enabled: boolean) => void, (_event: IpcRendererEvent, enabled: boolean) => void>();

const electronAPI: ElectronAPI = {
  onGameUpdate: (callback: (data: GameUpdatePayload) => void) => {
    console.log('Setting up ipc listener in preload');
    const listener = (_event: IpcRendererEvent, data: GameUpdatePayload) => callback(data);
    gameUpdateListeners.set(callback, listener);
    ipcRenderer.on('game-update', listener);
  },
  removeGameUpdate: (callback: (data: GameUpdatePayload) => void) => {
    const listener = gameUpdateListeners.get(callback);
    if (listener) {
      ipcRenderer.removeListener('game-update', listener);
      gameUpdateListeners.delete(callback);
    }
  },
  onEditModeChanged: (callback: (enabled: boolean) => void) => {
    const listener = (_event: IpcRendererEvent, enabled: boolean) => callback(enabled);
    editModeListeners.set(callback, listener);
    ipcRenderer.on('edit-mode-changed', listener);
  },
  removeEditModeChanged: (callback: (enabled: boolean) => void) => {
    const listener = editModeListeners.get(callback);
    if (listener) {
      ipcRenderer.removeListener('edit-mode-changed', listener);
      editModeListeners.delete(callback);
    }
  },
  startSimulation: () => ipcRenderer.invoke('start-simulation'),
  stopSimulation: () => ipcRenderer.invoke('stop-simulation'),
  setEditMode: (enabled: boolean) => ipcRenderer.invoke('set-edit-mode', enabled),
  getEditMode: () => ipcRenderer.invoke('get-edit-mode'),
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward?: boolean }) => ipcRenderer.send('set-ignore-mouse-events', ignore, options),
  log: (message: string) => ipcRenderer.send('renderer-log', message),
  fetchExternal: <T>(url: string, type: ExternalFetchType) => ipcRenderer.invoke('fetch-external', url, type) as Promise<T>,
  saveWidgetPosition: (id: string, pos: WidgetPosition) =>
    ipcRenderer.invoke('save-widget-position', id, pos),
  loadWidgetPositions: () => ipcRenderer.invoke('load-widget-positions'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
