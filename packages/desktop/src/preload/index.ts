import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("herzies", {
  // State
  getState: () => ipcRenderer.invoke("get-state"),
  onStateUpdate: (callback: (state: unknown) => void) => {
    const handler = (_event: unknown, state: unknown) => callback(state);
    ipcRenderer.on("state-update", handler);
    return () => ipcRenderer.removeListener("state-update", handler);
  },

  // Auth
  login: () => ipcRenderer.invoke("login"),
  logout: () => ipcRenderer.invoke("logout"),

  // Friends
  friendAdd: (code: string) => ipcRenderer.invoke("friend-add", code),
  friendRemove: (code: string) => ipcRenderer.invoke("friend-remove", code),
  friendLookup: (codes: string[]) => ipcRenderer.invoke("friend-lookup", codes),

  // Inventory
  fetchInventory: () => ipcRenderer.invoke("fetch-inventory"),
  sellItem: (itemId: string, quantity: number) => ipcRenderer.invoke("sell-item", itemId, quantity),

  // Trading
  tradeCreate: (targetCode: string) => ipcRenderer.invoke("trade-create", targetCode),
  tradeJoin: (tradeId: string) => ipcRenderer.invoke("trade-join", tradeId),
  tradeOffer: (tradeId: string, offer: { items: Record<string, number>; currency: number }) =>
    ipcRenderer.invoke("trade-offer", tradeId, offer),
  tradeLock: (tradeId: string) => ipcRenderer.invoke("trade-lock", tradeId),
  tradeAccept: (tradeId: string) => ipcRenderer.invoke("trade-accept", tradeId),
  tradeCancel: (tradeId: string) => ipcRenderer.invoke("trade-cancel", tradeId),
  tradePoll: (tradeId: string) => ipcRenderer.invoke("trade-poll", tradeId),
});
