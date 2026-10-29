const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desk', {
  openFile: (name, buf) => ipcRenderer.invoke('open-file', name, buf),
  saveFile: (name, buf) => ipcRenderer.invoke('save-file', name, buf)
});
