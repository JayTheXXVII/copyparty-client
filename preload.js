const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

// Expose protected methods that Electron can use to interact with the OS
contextBridge.exposeInMainWorld('electronAPI', {
  saveUrl: (url) => ipcRenderer.invoke('save-url', url),
  loadUrl: () => ipcRenderer.invoke('load-url'),
  clearUrl: () => ipcRenderer.invoke('clear-url')
});