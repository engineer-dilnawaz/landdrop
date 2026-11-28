import { contextBridge, ipcRenderer } from "electron";

// The only ways LANDrop's own windows reach the app. The main process checks which window is asking.
contextBridge.exposeInMainWorld("landrop", {
  submitReport: (report: unknown): Promise<boolean> => ipcRenderer.invoke("report:submit", report),
  saveQr: (): Promise<void> => ipcRenderer.invoke("qr:save"),
  shareQr: (): Promise<void> => ipcRenderer.invoke("qr:share"),
  update: {
    get: (): Promise<unknown> => ipcRenderer.invoke("update:get"),
    install: (): Promise<void> => ipcRenderer.invoke("update:install"),
    onState: (listener: (state: unknown) => void): (() => void) => {
      const handler = (_event: unknown, state: unknown) => listener(state);
      ipcRenderer.on("update:state", handler);
      return () => void ipcRenderer.removeListener("update:state", handler);
    },
  },
  app: {
    info: (): Promise<{ version: string; previous?: string } | undefined> => ipcRenderer.invoke("app:info"),
    seen: (): Promise<void> => ipcRenderer.invoke("app:seen"),
  },
  // Only the host's own chat window gets these; guests' browsers have no `window.landrop`.
  notifications: {
    get: (): Promise<{ notifications: boolean; previews: boolean }> => ipcRenderer.invoke("notifications:get"),
    set: (change: { notifications?: boolean; previews?: boolean }): Promise<{ notifications: boolean; previews: boolean }> =>
      ipcRenderer.invoke("notifications:set", change),
  },
});
