(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/apps/web/app/landrop.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>LanDrop
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$hash$2d$wasm$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/hash-wasm/dist/index.esm.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/protocol/src/index.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$outbox$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/app/outbox.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
const LAN_PORT = Number(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_LANDROP_PORT ?? __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_LAN_PORT"]);
const HASH_SLICE_BYTES = 8 * 1024 * 1024;
const RECONNECT_MS = 2000;
const initialState = {
    connection: "connecting",
    devices: [],
    transfers: {},
    progress: {},
    messages: []
};
function reducer(state, action) {
    switch(action.type){
        case "disconnected":
            // A new session gets a new identity; the server cancelled this session's open transfers.
            return {
                ...initialState,
                connection: "offline",
                messages: state.messages
            };
        case "transfer":
            return {
                ...state,
                transfers: {
                    ...state.transfers,
                    [action.transfer.manifest.id]: action.transfer
                }
            };
        case "message":
            return {
                ...state,
                messages: [
                    action.message,
                    ...state.messages
                ]
            };
        case "notice":
            return {
                ...state,
                notice: action.notice
            };
        case "event":
            {
                const e = action.event;
                switch(e.type){
                    case "session:welcome":
                        return {
                            ...state,
                            connection: "online",
                            self: e.self,
                            token: e.token,
                            devices: e.devices
                        };
                    case "device:discovered":
                        return {
                            ...state,
                            devices: [
                                ...state.devices.filter((d)=>d.id !== e.device.id),
                                e.device
                            ]
                        };
                    case "device:offline":
                        return {
                            ...state,
                            devices: state.devices.filter((d)=>d.id !== e.deviceId)
                        };
                    case "text:received":
                        return {
                            ...state,
                            messages: [
                                {
                                    peerId: e.from,
                                    text: e.text,
                                    at: e.sentAt,
                                    outgoing: false
                                },
                                ...state.messages
                            ]
                        };
                    case "transfer:progress":
                        return {
                            ...state,
                            progress: {
                                ...state.progress,
                                [e.progress.transferId]: e.progress
                            }
                        };
                    case "error":
                        return {
                            ...state,
                            notice: e.message
                        };
                    default:
                        return {
                            ...state,
                            transfers: {
                                ...state.transfers,
                                [e.transfer.manifest.id]: e.transfer
                            }
                        };
                }
            }
    }
}
function LanDrop() {
    _s();
    const [state, dispatch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useReducer"])(reducer, initialState);
    const [targetId, setTargetId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])();
    const [text, setText] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [files, setFiles] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const fileInputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [outbox, setOutbox] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const socketRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const tokenRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(undefined);
    const selfRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(undefined);
    /** Files waiting for the receiver's consent, by transfer id. */ const outgoingRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(new Map());
    /** Uploads in progress, so they can be stopped when the transfer ends. */ const uploadsRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(new Map());
    const serverBase = ()=>`${location.protocol}//${location.hostname}:${LAN_PORT}`;
    async function api(path, method, body) {
        const res = await fetch(serverBase() + path, {
            method,
            headers: {
                authorization: `Bearer ${tokenRef.current}`,
                ...body !== undefined && {
                    "content-type": "application/json"
                }
            },
            body: body === undefined ? undefined : JSON.stringify(body)
        });
        const json = await res.json().catch(()=>({}));
        if (!res.ok) throw new Error(json.message ?? `Request failed (${res.status})`);
        return json;
    }
    async function runUpload(transfer) {
        const id = transfer.manifest.id;
        const local = outgoingRef.current.get(id);
        outgoingRef.current.delete(id);
        if (!local) return;
        const control = {
            stopped: false
        };
        uploadsRef.current.set(id, control);
        try {
            for (const [index, entry] of transfer.manifest.files.entries()){
                const file = local[index];
                // Upload and hash in parallel: the server hashes what arrives, we hash the original.
                const [, sha256] = await Promise.all([
                    putFile(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["routes"].fileData(id, entry.id), file, control),
                    hashFile(file, control)
                ]);
                await api(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["routes"].fileChecksum(id, entry.id), "POST", {
                    sha256
                });
            }
        } catch (err) {
            if (!control.stopped) dispatch({
                type: "notice",
                notice: `Sending failed: ${err.message}`
            });
        } finally{
            uploadsRef.current.delete(id);
        }
    }
    function putFile(path, file, control) {
        return new Promise((resolve, reject)=>{
            const xhr = new XMLHttpRequest();
            control.xhr = xhr;
            xhr.open("PUT", serverBase() + path);
            xhr.setRequestHeader("authorization", `Bearer ${tokenRef.current}`);
            xhr.setRequestHeader("content-type", "application/octet-stream");
            xhr.onload = ()=>xhr.status < 300 ? resolve() : reject(new Error(safeMessage(xhr.responseText) ?? `HTTP ${xhr.status}`));
            xhr.onerror = ()=>reject(new Error("Connection to the host was lost"));
            xhr.onabort = ()=>reject(new Error("Upload stopped"));
            // The browser streams the File from disk; it is never read into memory here.
            xhr.send(file);
        });
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LanDrop.useEffect": ()=>{
            let disposed = false;
            let retry;
            const open = {
                "LanDrop.useEffect.open": ()=>{
                    const scheme = location.protocol === "https:" ? "wss" : "ws";
                    const socket = new WebSocket(`${scheme}://${location.hostname}:${LAN_PORT}${__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["routes"].ws}`);
                    socketRef.current = socket;
                    socket.onopen = ({
                        "LanDrop.useEffect.open": ()=>{
                            const hello = {
                                type: "hello",
                                protocolVersion: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROTOCOL_VERSION"],
                                name: defaultDeviceName()
                            };
                            socket.send(JSON.stringify(hello));
                        }
                    })["LanDrop.useEffect.open"];
                    socket.onmessage = ({
                        "LanDrop.useEffect.open": (raw)=>{
                            const event = JSON.parse(raw.data);
                            if (event.type === "session:welcome") {
                                tokenRef.current = event.token;
                                selfRef.current = event.self;
                            }
                            if ("transfer" in event) {
                                const id = event.transfer.manifest.id;
                                if (event.type === "transfer:accepted" && event.transfer.manifest.senderId === selfRef.current?.id) {
                                    void runUpload(event.transfer);
                                }
                                if (__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TERMINAL_STATUSES"].has(event.transfer.status)) {
                                    outgoingRef.current.delete(id);
                                    const upload = uploadsRef.current.get(id);
                                    if (upload && event.transfer.status !== "completed") {
                                        upload.stopped = true;
                                        upload.xhr?.abort();
                                    }
                                }
                            }
                            dispatch({
                                type: "event",
                                event
                            });
                        }
                    })["LanDrop.useEffect.open"];
                    socket.onclose = ({
                        "LanDrop.useEffect.open": ()=>{
                            if (disposed) return;
                            tokenRef.current = undefined;
                            selfRef.current = undefined;
                            outgoingRef.current.clear();
                            for (const upload of uploadsRef.current.values()){
                                upload.stopped = true;
                                upload.xhr?.abort();
                            }
                            dispatch({
                                type: "disconnected"
                            });
                            retry = setTimeout(open, RECONNECT_MS);
                        }
                    })["LanDrop.useEffect.open"];
                }
            }["LanDrop.useEffect.open"];
            open();
            return ({
                "LanDrop.useEffect": ()=>{
                    disposed = true;
                    clearTimeout(retry);
                    socketRef.current?.close();
                }
            })["LanDrop.useEffect"];
        // runUpload only reads refs, so the socket is opened once per mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }
    }["LanDrop.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LanDrop.useEffect": ()=>{
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$outbox$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadOutbox"])().then(setOutbox).catch({
                "LanDrop.useEffect": ()=>dispatch({
                        type: "notice",
                        notice: "This browser can't keep unsent items; they'll be lost on reload."
                    })
            }["LanDrop.useEffect"]);
        }
    }["LanDrop.useEffect"], []);
    // With a single nearby device there is nothing to choose, so it is the target.
    const target = state.devices.find((d)=>d.id === targetId) ?? (state.devices.length === 1 ? state.devices[0] : undefined);
    const nameOf = (id)=>id === state.self?.id ? "You" : state.devices.find((d)=>d.id === id)?.name ?? "Disconnected device";
    function deliverText(to, body) {
        const message = {
            type: "text:send",
            to: to.id,
            text: body
        };
        socketRef.current?.send(JSON.stringify(message));
        dispatch({
            type: "message",
            message: {
                peerId: to.id,
                text: body,
                at: Date.now(),
                outgoing: true
            }
        });
    }
    async function deliverFiles(to, selected) {
        const transfer = await api(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["routes"].transfers, "POST", {
            receiverId: to.id,
            files: selected.map((f)=>({
                    name: f.name,
                    size: f.size,
                    mimeType: f.type || "application/octet-stream"
                }))
        });
        outgoingRef.current.set(transfer.manifest.id, selected);
        dispatch({
            type: "transfer",
            transfer
        });
    }
    /** No recipient yet: keep the item on this device until the user sends it to someone. */ async function queue(item) {
        const full = {
            ...item,
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            createdAt: Date.now()
        };
        setOutbox((items)=>[
                ...items,
                full
            ]);
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$outbox$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveOutboxItem"])(full);
        } catch  {
            dispatch({
                type: "notice",
                notice: "Couldn't save to this device's storage; the item is kept only until you reload."
            });
        }
    }
    async function removeFromOutbox(id) {
        setOutbox((items)=>items.filter((i)=>i.id !== id));
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$outbox$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deleteOutboxItem"])(id).catch(()=>undefined);
    }
    async function sendOutbox(to) {
        for (const item of outbox){
            try {
                if (item.kind === "text") deliverText(to, item.text);
                else await deliverFiles(to, item.files);
                await removeFromOutbox(item.id);
            } catch (err) {
                return dispatch({
                    type: "notice",
                    notice: `Sending from Outbox stopped: ${err.message}`
                });
            }
        }
    }
    async function sendText() {
        if (!text.trim()) return dispatch({
            type: "notice",
            notice: "Type a message or link first."
        });
        if (target) deliverText(target, text);
        else await queue({
            kind: "text",
            text
        });
        setText("");
        dispatch({
            type: "notice"
        });
    }
    async function sendFiles() {
        if (files.length === 0) return dispatch({
            type: "notice",
            notice: "Choose a file first."
        });
        try {
            if (target) await deliverFiles(target, files);
            else await queue({
                kind: "files",
                files
            });
            setFiles([]);
            if (fileInputRef.current) fileInputRef.current.value = "";
            dispatch({
                type: "notice"
            });
        } catch (err) {
            dispatch({
                type: "notice",
                notice: err.message
            });
        }
    }
    async function act(transferId, action) {
        try {
            dispatch({
                type: "transfer",
                transfer: await api(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["routes"][action](transferId), "POST")
            });
        } catch (err) {
            dispatch({
                type: "notice",
                notice: err.message
            });
        }
    }
    const transfers = Object.values(state.transfers).sort((a, b)=>b.manifest.createdAt - a.manifest.createdAt);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "flex flex-wrap items-baseline justify-between gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-2xl font-semibold tracking-tight",
                        children: "LANDrop"
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 299,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-muted",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: `mr-2 inline-block size-2 rounded-full ${state.connection === "online" ? "bg-emerald-500" : state.connection === "connecting" ? "bg-amber-500" : "bg-red-500"}`
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/landrop.tsx",
                                lineNumber: 301,
                                columnNumber: 11
                            }, this),
                            state.connection === "online" ? `You are ${state.self?.name} · ${shortId(state.self.id)}` : state.connection === "connecting" ? "Connecting to host…" : `Can't reach the LANDrop host on port ${LAN_PORT}. Retrying…`
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 300,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 298,
                columnNumber: 7
            }, this),
            state.notice && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                role: "alert",
                className: "flex items-start justify-between gap-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: state.notice
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 316,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: "text-muted hover:underline",
                        onClick: ()=>dispatch({
                                type: "notice"
                            }),
                        children: "Dismiss"
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 317,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 315,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                "aria-labelledby": "devices-heading",
                className: "flex flex-col gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        id: "devices-heading",
                        className: "text-sm font-medium uppercase tracking-wide text-muted",
                        children: "Nearby devices"
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 324,
                        columnNumber: 9
                    }, this),
                    state.devices.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "rounded-lg border border-dashed border-line px-4 py-6 text-sm text-muted",
                        children: "No other devices yet. Open this page on another device on the same network."
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 328,
                        columnNumber: 11
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        className: "grid gap-2 sm:grid-cols-2",
                        children: state.devices.map((d)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setTargetId(d.id),
                                    "aria-pressed": d.id === target?.id,
                                    className: `w-full rounded-lg border px-4 py-3 text-left transition-colors ${d.id === target?.id ? "border-accent bg-accent/10" : "border-line hover:border-accent/60"}`,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "block font-medium",
                                            children: d.name
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/landrop.tsx",
                                            lineNumber: 342,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-xs text-muted",
                                            children: shortId(d.id)
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/landrop.tsx",
                                            lineNumber: 343,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/web/app/landrop.tsx",
                                    lineNumber: 335,
                                    columnNumber: 17
                                }, this)
                            }, d.id, false, {
                                fileName: "[project]/apps/web/app/landrop.tsx",
                                lineNumber: 334,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 332,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 323,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                "aria-label": "Send",
                className: "flex flex-col gap-3 rounded-lg border border-line p-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-muted",
                        children: target ? `Sending to ${target.name} · ${shortId(target.id)}` : state.devices.length === 0 ? "No other device is online yet. What you send waits in your Outbox on this device." : "No device chosen. What you send waits in your Outbox until you tap a device above."
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 352,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col gap-2 sm:flex-row",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                value: text,
                                onChange: (e)=>setText(e.target.value),
                                onKeyDown: (e)=>{
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        sendText();
                                    }
                                },
                                rows: 2,
                                placeholder: "Text or a link",
                                "aria-label": "Text to send",
                                className: "min-h-11 flex-1 resize-y rounded-md border border-line bg-transparent px-3 py-2"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/landrop.tsx",
                                lineNumber: 360,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: sendText,
                                className: "btn",
                                children: "Send text"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/landrop.tsx",
                                lineNumber: 374,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 359,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col gap-2 sm:flex-row sm:items-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                ref: fileInputRef,
                                type: "file",
                                multiple: true,
                                "aria-label": "Files to send",
                                onChange: (e)=>setFiles([
                                        ...e.target.files ?? []
                                    ]),
                                className: "flex-1 text-sm file:mr-3 file:rounded-md file:border file:border-line file:bg-transparent file:px-3 file:py-1.5"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/landrop.tsx",
                                lineNumber: 379,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: sendFiles,
                                className: "btn",
                                children: [
                                    "Send ",
                                    files.length > 1 ? `${files.length} files` : "file"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/web/app/landrop.tsx",
                                lineNumber: 387,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 378,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 351,
                columnNumber: 7
            }, this),
            outbox.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                "aria-labelledby": "outbox-heading",
                className: "flex flex-col gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap items-center justify-between gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                id: "outbox-heading",
                                className: "text-sm font-medium uppercase tracking-wide text-muted",
                                children: "Outbox · saved on this device"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/landrop.tsx",
                                lineNumber: 396,
                                columnNumber: 13
                            }, this),
                            target && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: "btn",
                                onClick: ()=>sendOutbox(target),
                                children: [
                                    "Send all to ",
                                    target.name,
                                    " · ",
                                    shortId(target.id)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/web/app/landrop.tsx",
                                lineNumber: 400,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 395,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        className: "flex flex-col gap-2",
                        children: outbox.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                className: "flex items-start justify-between gap-3 rounded-lg border border-line px-4 py-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "min-w-0 whitespace-pre-wrap wrap-break-word",
                                        children: item.kind === "text" ? item.text : item.files.map((f)=>`${f.name} (${formatBytes(f.size)})`).join(", ")
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/app/landrop.tsx",
                                        lineNumber: 408,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        className: "btn-secondary shrink-0",
                                        onClick: ()=>removeFromOutbox(item.id),
                                        "aria-label": "Remove from Outbox",
                                        children: "Remove"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/app/landrop.tsx",
                                        lineNumber: 413,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, item.id, true, {
                                fileName: "[project]/apps/web/app/landrop.tsx",
                                lineNumber: 407,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 405,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 394,
                columnNumber: 9
            }, this),
            transfers.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                "aria-labelledby": "transfers-heading",
                className: "flex flex-col gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        id: "transfers-heading",
                        className: "text-sm font-medium uppercase tracking-wide text-muted",
                        children: "Transfers"
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 424,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        className: "flex flex-col gap-2",
                        children: transfers.map((t)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(TransferCard, {
                                transfer: t,
                                progress: state.progress[t.manifest.id],
                                incoming: t.manifest.receiverId === state.self?.id,
                                peerName: nameOf(t.manifest.receiverId === state.self?.id ? t.manifest.senderId : t.manifest.receiverId),
                                downloadUrl: (fileId)=>`${serverBase()}${__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["routes"].fileDownload(t.manifest.id, fileId)}?token=${state.token}`,
                                onAction: (action)=>act(t.manifest.id, action)
                            }, t.manifest.id, false, {
                                fileName: "[project]/apps/web/app/landrop.tsx",
                                lineNumber: 429,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 427,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 423,
                columnNumber: 9
            }, this),
            state.messages.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                "aria-labelledby": "messages-heading",
                className: "flex flex-col gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        id: "messages-heading",
                        className: "text-sm font-medium uppercase tracking-wide text-muted",
                        children: "Messages"
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 445,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        className: "flex flex-col gap-2",
                        children: state.messages.map((m, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                className: "rounded-lg border border-line px-4 py-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mb-1 text-xs text-muted",
                                        children: [
                                            m.outgoing ? `To ${nameOf(m.peerId)}` : `From ${nameOf(m.peerId)}`,
                                            " · ",
                                            new Date(m.at).toLocaleTimeString()
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/apps/web/app/landrop.tsx",
                                        lineNumber: 451,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "whitespace-pre-wrap wrap-break-word select-all",
                                        children: m.text
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/app/landrop.tsx",
                                        lineNumber: 454,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, `${m.at}-${i}`, true, {
                                fileName: "[project]/apps/web/app/landrop.tsx",
                                lineNumber: 450,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 448,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 444,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/app/landrop.tsx",
        lineNumber: 297,
        columnNumber: 5
    }, this);
}
_s(LanDrop, "FJ5Vf31AXKztMDNcEnzjNvi/43Q=");
_c = LanDrop;
function TransferCard({ transfer, progress, incoming, peerName, downloadUrl, onAction }) {
    const { manifest, status } = transfer;
    const done = progress?.bytesTransferred ?? 0;
    const fraction = manifest.totalSize > 0 ? done / manifest.totalSize : status === "completed" ? 1 : 0;
    const active = status === "accepted" && progress && done < manifest.totalSize;
    const remaining = active && progress.bytesPerSecond > 0 ? (manifest.totalSize - done) / progress.bytesPerSecond : undefined;
    const title = manifest.files.length === 1 ? manifest.files[0].name : `${manifest.files.length} files`;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
        className: "flex flex-col gap-2 rounded-lg border border-line px-4 py-3",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-wrap items-baseline justify-between gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "min-w-0 break-all font-medium",
                        children: title
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 489,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-xs text-muted",
                        children: [
                            incoming ? `From ${peerName}` : `To ${peerName}`,
                            " · ",
                            formatBytes(manifest.totalSize),
                            " · ",
                            statusLabel(transfer, incoming)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 490,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 488,
                columnNumber: 7
            }, this),
            status === "accepted" || status === "completed" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        role: "progressbar",
                        "aria-valuemin": 0,
                        "aria-valuemax": 100,
                        "aria-valuenow": Math.round(fraction * 100),
                        className: "h-1.5 overflow-hidden rounded-full bg-line",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "h-full bg-accent transition-[width]",
                            style: {
                                width: `${fraction * 100}%`
                            }
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/landrop.tsx",
                            lineNumber: 504,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 497,
                        columnNumber: 11
                    }, this),
                    active && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-xs tabular-nums text-muted",
                        children: [
                            Math.floor(fraction * 100),
                            "% · ",
                            formatBytes(progress.bytesPerSecond),
                            "/s",
                            remaining !== undefined && ` · ${formatDuration(remaining)} left`
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 507,
                        columnNumber: 13
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 496,
                columnNumber: 9
            }, this) : null,
            transfer.error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-sm text-red-600 dark:text-red-400",
                children: transfer.error
            }, void 0, false, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 515,
                columnNumber: 26
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-wrap gap-2",
                children: [
                    incoming && status === "pending" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: "btn",
                                onClick: ()=>onAction("accept"),
                                children: "Accept"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/landrop.tsx",
                                lineNumber: 520,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: "btn-secondary",
                                onClick: ()=>onAction("reject"),
                                children: "Decline"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/landrop.tsx",
                                lineNumber: 523,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 519,
                        columnNumber: 11
                    }, this),
                    (status === "accepted" || !incoming && status === "pending") && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: "btn-secondary",
                        onClick: ()=>onAction("cancel"),
                        children: "Cancel"
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 529,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 517,
                columnNumber: 7
            }, this),
            incoming && status === "completed" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                className: "flex flex-col gap-1 text-sm",
                children: manifest.files.map((f)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        className: "flex flex-wrap items-baseline justify-between gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: downloadUrl(f.id),
                                download: f.name,
                                className: "break-all text-accent underline-offset-2 hover:underline",
                                children: [
                                    "Save ",
                                    f.name
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/web/app/landrop.tsx",
                                lineNumber: 539,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-mono text-xs text-muted",
                                title: `SHA-256 ${transfer.files[f.id].sha256}`,
                                children: [
                                    "SHA-256 verified · ",
                                    transfer.files[f.id].sha256?.slice(0, 12),
                                    "…"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/web/app/landrop.tsx",
                                lineNumber: 542,
                                columnNumber: 15
                            }, this)
                        ]
                    }, f.id, true, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 538,
                        columnNumber: 13
                    }, this))
            }, void 0, false, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 536,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/app/landrop.tsx",
        lineNumber: 487,
        columnNumber: 5
    }, this);
}
_c1 = TransferCard;
async function hashFile(file, control) {
    const hasher = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$hash$2d$wasm$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createSHA256"])();
    hasher.init();
    for(let offset = 0; offset < file.size; offset += HASH_SLICE_BYTES){
        if (control.stopped) throw new Error("Stopped");
        // One slice in memory at a time; awaiting each read keeps the UI responsive.
        hasher.update(new Uint8Array(await file.slice(offset, offset + HASH_SLICE_BYTES).arrayBuffer()));
    }
    return hasher.digest("hex");
}
function statusLabel(transfer, incoming) {
    switch(transfer.status){
        case "pending":
            return incoming ? "Wants to send you this" : "Waiting for them to accept";
        case "accepted":
            return incoming ? "Receiving" : "Sending";
        case "completed":
            return "Done";
        case "rejected":
            return "Declined";
        case "cancelled":
            return "Cancelled";
        case "failed":
            return "Failed";
    }
}
function safeMessage(body) {
    try {
        return JSON.parse(body).message;
    } catch  {
        return undefined;
    }
}
function defaultDeviceName() {
    const ua = navigator.userAgent;
    const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "Device";
    const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
    return `${browser} on ${os}`;
}
const shortId = (id)=>`#${id.slice(0, 4)}`;
function formatBytes(bytes) {
    const units = [
        "B",
        "KB",
        "MB",
        "GB",
        "TB"
    ];
    let value = bytes;
    let unit = 0;
    while(value >= 1024 && unit < units.length - 1){
        value /= 1024;
        unit++;
    }
    return `${value.toFixed(unit === 0 || value >= 100 ? 0 : 1)} ${units[unit]}`;
}
function formatDuration(seconds) {
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    const m = Math.floor(seconds / 60);
    return `${m}m ${Math.ceil(seconds % 60)}s`;
}
var _c, _c1;
__turbopack_context__.k.register(_c, "LanDrop");
__turbopack_context__.k.register(_c1, "TransferCard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/app/outbox.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Items the user sent while no recipient was available. Kept in IndexedDB on
 * the sender's own device (localStorage can't hold files), so they survive a
 * reload and never leave the device until the user sends them to someone.
 */ __turbopack_context__.s([
    "deleteOutboxItem",
    ()=>deleteOutboxItem,
    "loadOutbox",
    ()=>loadOutbox,
    "saveOutboxItem",
    ()=>saveOutboxItem
]);
const DB_NAME = "landrop";
const STORE = "outbox";
function openDb() {
    return new Promise((resolve, reject)=>{
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = ()=>request.result.createObjectStore(STORE, {
                keyPath: "id"
            });
        request.onsuccess = ()=>resolve(request.result);
        request.onerror = ()=>reject(request.error);
    });
}
async function run(mode, op) {
    const db = await openDb();
    try {
        return await new Promise((resolve, reject)=>{
            const tx = db.transaction(STORE, mode);
            const request = op(tx.objectStore(STORE));
            tx.oncomplete = ()=>resolve(request.result);
            tx.onerror = ()=>reject(tx.error);
            tx.onabort = ()=>reject(tx.error ?? new Error("Storage write was aborted"));
        });
    } finally{
        db.close();
    }
}
async function loadOutbox() {
    const items = await run("readonly", (store)=>store.getAll());
    return items.sort((a, b)=>a.createdAt - b.createdAt);
}
const saveOutboxItem = (item)=>run("readwrite", (store)=>store.put(item));
const deleteOutboxItem = (id)=>run("readwrite", (store)=>store.delete(id));
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/protocol/src/index.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "API_PREFIX",
    ()=>API_PREFIX,
    "ClientMessageSchema",
    ()=>ClientMessageSchema,
    "CreateMessageRequestSchema",
    ()=>CreateMessageRequestSchema,
    "DEFAULT_LAN_PORT",
    ()=>DEFAULT_LAN_PORT,
    "HISTORY_LIMIT",
    ()=>HISTORY_LIMIT,
    "MAX_ATTACHMENT_BYTES",
    ()=>MAX_ATTACHMENT_BYTES,
    "MAX_DEVICE_NAME_LENGTH",
    ()=>MAX_DEVICE_NAME_LENGTH,
    "MAX_FILE_NAME_LENGTH",
    ()=>MAX_FILE_NAME_LENGTH,
    "MAX_TEXT_LENGTH",
    ()=>MAX_TEXT_LENGTH,
    "PROTOCOL_VERSION",
    ()=>PROTOCOL_VERSION,
    "SubmitChecksumRequestSchema",
    ()=>SubmitChecksumRequestSchema,
    "routes",
    ()=>routes
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-client] (ecmascript) <export * as z .string>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$union$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-client] (ecmascript) <export * as z .union>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-client] (ecmascript) <export * as z .object>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-client] (ecmascript) <export * as z .number>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$discriminatedUnion$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-client] (ecmascript) <export * as z .discriminatedUnion>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$literal$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-client] (ecmascript) <export * as z .literal>");
;
const PROTOCOL_VERSION = 2;
const DEFAULT_LAN_PORT = 4545;
const API_PREFIX = "/api/v1";
const MAX_TEXT_LENGTH = 64 * 1024;
const MAX_ATTACHMENT_BYTES = 500 * 1024 * 1024;
const MAX_FILE_NAME_LENGTH = 255;
const MAX_DEVICE_NAME_LENGTH = 64;
const HISTORY_LIMIT = 500;
const DeviceNameSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().trim().min(1).max(MAX_DEVICE_NAME_LENGTH);
_c = DeviceNameSchema;
const CreateMessageRequestSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$union$3e$__["z"].union([
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
        text: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().trim().min(1).max(MAX_TEXT_LENGTH)
    }),
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
        attachment: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
            name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().min(1).max(MAX_FILE_NAME_LENGTH),
            size: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number().int().nonnegative().max(MAX_ATTACHMENT_BYTES),
            mimeType: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().max(255).default("application/octet-stream")
        })
    })
]);
const SubmitChecksumRequestSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
    sha256: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().regex(/^[0-9a-f]{64}$/)
});
const ClientMessageSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$discriminatedUnion$3e$__["z"].discriminatedUnion("type", [
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
        type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$literal$3e$__["z"].literal("hello"),
        protocolVersion: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number().int(),
        deviceId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().regex(/^[0-9a-f]{32}$/),
        deviceSecret: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().regex(/^[0-9a-f]{64}$/),
        name: DeviceNameSchema
    }),
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
        type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$literal$3e$__["z"].literal("profile:update"),
        name: DeviceNameSchema
    })
]);
const routes = {
    health: `${API_PREFIX}/health`,
    ws: `${API_PREFIX}/ws`,
    messages: `${API_PREFIX}/messages`,
    attachmentData: (id)=>`${API_PREFIX}/messages/${id}/attachment/data`,
    attachmentChecksum: (id)=>`${API_PREFIX}/messages/${id}/attachment/checksum`,
    attachment: (id)=>`${API_PREFIX}/messages/${id}/attachment`
};
var _c;
__turbopack_context__.k.register(_c, "DeviceNameSchema");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_1w5krqwl6ut5-._.js.map