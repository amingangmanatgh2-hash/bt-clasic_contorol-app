const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('aminBluetooth', {
  platform: 'windows',
  listPorts: () => ipcRenderer.invoke('bt:list'),
  connect: address => ipcRenderer.invoke('bt:connect', address),
  disconnect: () => ipcRenderer.invoke('bt:disconnect'),
  send: data => ipcRenderer.invoke('bt:send', data),
  onData: callback => { const listener = (_event, data) => callback(data); ipcRenderer.on('bt:data', listener); return () => ipcRenderer.removeListener('bt:data', listener); },
  onStatus: callback => { const listener = (_event, data) => callback(data); ipcRenderer.on('bt:status', listener); return () => ipcRenderer.removeListener('bt:status', listener); }
});
