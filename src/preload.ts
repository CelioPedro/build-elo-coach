import { contextBridge, ipcRenderer } from 'electron';

console.log('Preload script loaded');

contextBridge.exposeInMainWorld('electronAPI', {
  onGameUpdate: (callback: (event: any, data: any) => void) => {
    console.log('Setting up ipc listener in preload');
    ipcRenderer.on('game-update', callback);
  },
  removeGameUpdate: (callback: (event: any, data: any) => void) => ipcRenderer.removeListener('game-update', callback),
});
