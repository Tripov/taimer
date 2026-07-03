const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopTimer', {
  notifyFinished: () => ipcRenderer.send('timer:finished'),
});
