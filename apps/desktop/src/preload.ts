import { contextBridge, ipcRenderer } from "electron";

// The only ways LANDrop's own windows reach the app. The main process checks which window is asking.
contextBridge.exposeInMainWorld("landrop", {
  submitReport: (report: unknown): Promise<boolean> => ipcRenderer.invoke("report:submit", report),
  saveQr: (): Promise<void> => ipcRenderer.invoke("qr:save"),
  shareQr: (): Promise<void> => ipcRenderer.invoke("qr:share"),
  // Only the host's own chat window gets these; guests' browsers have no `window.landrop`.
  notifications: {
    get: (): Promise<{ notifications: boolean; previews: boolean }> => ipcRenderer.invoke("notifications:get"),
    set: (change: { notifications?: boolean; previews?: boolean }): Promise<{ notifications: boolean; previews: boolean }> =>
      ipcRenderer.invoke("notifications:set", change),
  },
});
