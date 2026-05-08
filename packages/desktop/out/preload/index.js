let electron = require("electron");
//#region src/preload/index.ts
electron.contextBridge.exposeInMainWorld("herzies", {
	getState: () => electron.ipcRenderer.invoke("get-state"),
	onStateUpdate: (callback) => {
		const handler = (_event, state) => callback(state);
		electron.ipcRenderer.on("state-update", handler);
		return () => electron.ipcRenderer.removeListener("state-update", handler);
	},
	login: () => electron.ipcRenderer.invoke("login"),
	logout: () => electron.ipcRenderer.invoke("logout"),
	friendAdd: (code) => electron.ipcRenderer.invoke("friend-add", code),
	friendRemove: (code) => electron.ipcRenderer.invoke("friend-remove", code),
	friendLookup: (codes) => electron.ipcRenderer.invoke("friend-lookup", codes),
	fetchInventory: () => electron.ipcRenderer.invoke("fetch-inventory"),
	sellItem: (itemId, quantity) => electron.ipcRenderer.invoke("sell-item", itemId, quantity),
	tradeCreate: (targetCode) => electron.ipcRenderer.invoke("trade-create", targetCode),
	tradeJoin: (tradeId) => electron.ipcRenderer.invoke("trade-join", tradeId),
	tradeOffer: (tradeId, offer) => electron.ipcRenderer.invoke("trade-offer", tradeId, offer),
	tradeLock: (tradeId) => electron.ipcRenderer.invoke("trade-lock", tradeId),
	tradeAccept: (tradeId) => electron.ipcRenderer.invoke("trade-accept", tradeId),
	tradeCancel: (tradeId) => electron.ipcRenderer.invoke("trade-cancel", tradeId),
	tradePoll: (tradeId) => electron.ipcRenderer.invoke("trade-poll", tradeId)
});
//#endregion
