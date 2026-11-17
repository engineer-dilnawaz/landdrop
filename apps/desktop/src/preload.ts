import { contextBridge, ipcRenderer } from "electron";

// The only ways LANDrop's own windows reach the app. The main process checks which window is asking.
contextBridge.exposeInMainWorld("landrop", {
  submitReport: (report: unknown): Promise<boolean> => ipcRenderer.invoke("report:submit", report),
  saveQr: (): Promise<void> => ipcRenderer.invoke("qr:save"),
  shareQr: (): Promise<void> => ipcRenderer.invoke("qr:share"),
});
