"use strict";
const { contextBridge, ipcRenderer } = require("electron");
const call = n => () => ipcRenderer.invoke("desk:" + n);
contextBridge.exposeInMainWorld("desk", {
  status: call("status"), backupNow: call("backupNow"), restore: call("restore"),
  pickDir2: call("pickDir2"), clearDir2: call("clearDir2"), openFolder: call("openFolder"), diagnostics: call("diagnostics")
});
