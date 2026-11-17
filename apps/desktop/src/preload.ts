import { contextBridge, ipcRenderer } from "electron";

// The report form's only way to reach the app: hand over what was typed and hear whether it saved.
contextBridge.exposeInMainWorld("landrop", {
  submitReport: (report: unknown): Promise<boolean> => ipcRenderer.invoke("report:submit", report),
});
