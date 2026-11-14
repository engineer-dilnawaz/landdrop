module.exports = [
"[project]/apps/web/app/landrop.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>LanDrop
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$hash$2d$wasm$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/hash-wasm/dist/index.esm.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/protocol/src/index.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
const LAN_PORT = Number(process.env.NEXT_PUBLIC_LANDROP_PORT ?? __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DEFAULT_LAN_PORT"]);
const HASH_SLICE_BYTES = 8 * 1024 * 1024;
const RECONNECT_MS = 2000;
const IDENTITY_KEY = "landrop.identity";
const initialState = {
    connection: "connecting",
    isHost: false,
    online: [],
    names: {},
    messages: [],
    progress: {}
};
const withNames = (names, devices)=>({
        ...names,
        ...Object.fromEntries(devices.map((d)=>[
                d.id,
                d.name
            ]))
    });
function upsert(messages, message) {
    const index = messages.findIndex((m)=>m.id === message.id);
    if (index === -1) return [
        ...messages,
        message
    ];
    const next = [
        ...messages
    ];
    next[index] = message;
    return next;
}
function reducer(state, action) {
    if (action.type === "disconnected") return {
        ...state,
        connection: "offline",
        online: [],
        token: undefined
    };
    if (action.type === "notice") return {
        ...state,
        notice: action.notice
    };
    const e = action.event;
    switch(e.type){
        case "session:welcome":
            return {
                ...state,
                connection: "online",
                self: e.self,
                token: e.token,
                isHost: e.isHost,
                online: e.online,
                names: withNames({}, [
                    ...e.directory,
                    ...e.online
                ]),
                messages: e.messages
            };
        case "presence:update":
            return {
                ...state,
                online: e.online,
                names: withNames(state.names, e.online)
            };
        case "message:created":
        case "message:updated":
            return {
                ...state,
                messages: upsert(state.messages, e.message)
            };
        case "attachment:progress":
            return {
                ...state,
                progress: {
                    ...state.progress,
                    [e.messageId]: e
                }
            };
        case "message:deleted":
            {
                const progress = {
                    ...state.progress
                };
                delete progress[e.messageId];
                return {
                    ...state,
                    messages: state.messages.filter((m)=>m.id !== e.messageId),
                    progress
                };
            }
        case "error":
            return {
                ...state,
                notice: e.message
            };
    }
}
function LanDrop() {
    const [state, dispatch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useReducer"])(reducer, initialState);
    const [text, setText] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [files, setFiles] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [replyTo, setReplyTo] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])();
    /** The message whose press-and-hold menu is open. */ const [selected, setSelected] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])();
    const [dragging, setDragging] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [renaming, setRenaming] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    /** dragenter/dragleave fire for every child element; count them so the overlay doesn't flicker. */ const dragDepth = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    const [viewing, setViewing] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])();
    const socketRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const tokenRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(undefined);
    const identityRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    /** Uploads in progress by message id, so they can be stopped if the connection drops. */ const uploadsRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(new Map());
    const bottomRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const fileInputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
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
        if (res.status === 204) return undefined;
        const json = await res.json().catch(()=>({}));
        if (!res.ok) throw new Error(json.message ?? `Request failed (${res.status})`);
        return json;
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        identityRef.current = loadIdentity();
        let disposed = false;
        let retry;
        const open = ()=>{
            clearTimeout(retry);
            const scheme = location.protocol === "https:" ? "wss" : "ws";
            const socket = new WebSocket(`${scheme}://${location.hostname}:${LAN_PORT}${__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["routes"].ws}`);
            socketRef.current = socket;
            socket.onopen = ()=>{
                const { deviceId, deviceSecret, name } = identityRef.current;
                const hello = {
                    type: "hello",
                    protocolVersion: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PROTOCOL_VERSION"],
                    deviceId,
                    deviceSecret,
                    name
                };
                socket.send(JSON.stringify(hello));
            };
            socket.onmessage = (raw)=>{
                const event = JSON.parse(raw.data);
                if (event.type === "session:welcome") tokenRef.current = event.token;
                dispatch({
                    type: "event",
                    event
                });
            };
            socket.onclose = ()=>{
                if (disposed || socketRef.current !== socket) return;
                tokenRef.current = undefined;
                for (const upload of uploadsRef.current.values()){
                    upload.stopped = true;
                    upload.xhr?.abort();
                }
                dispatch({
                    type: "disconnected"
                });
                retry = setTimeout(open, RECONNECT_MS);
            };
        };
        // Phones suspend background pages; reconnect the moment the user comes back.
        const onVisible = ()=>{
            const s = socketRef.current;
            if (document.visibilityState === "visible" && (!s || s.readyState >= WebSocket.CLOSING)) open();
        };
        document.addEventListener("visibilitychange", onVisible);
        open();
        return ()=>{
            disposed = true;
            clearTimeout(retry);
            document.removeEventListener("visibilitychange", onVisible);
            socketRef.current?.close();
        };
    }, []);
    // Keep the newest message in view, like a chat app.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useLayoutEffect"])(()=>{
        bottomRef.current?.scrollIntoView({
            block: "end"
        });
    }, [
        state.messages.length
    ]);
    function rename(name) {
        setRenaming(false);
        const current = identityRef.current;
        if (!current || !name || name === current.name) return;
        identityRef.current = {
            ...current,
            name
        };
        saveIdentity(identityRef.current);
        const update = {
            type: "profile:update",
            name
        };
        socketRef.current?.send(JSON.stringify(update));
    }
    function chooseFiles(picked) {
        const tooBig = picked.filter((f)=>f.size > __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MAX_ATTACHMENT_BYTES"]);
        setFiles((current)=>[
                ...current,
                ...picked.filter((f)=>f.size <= __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MAX_ATTACHMENT_BYTES"])
            ]);
        dispatch({
            type: "notice",
            notice: tooBig.length ? `Files over ${formatBytes(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MAX_ATTACHMENT_BYTES"])} can't be sent: ${tooBig.map((f)=>f.name).join(", ")}` : undefined
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
    async function send() {
        if (state.connection !== "online") {
            return dispatch({
                type: "notice",
                notice: "Not connected to the LANDrop host yet. Reconnecting…"
            });
        }
        const body = text.trim();
        const toUpload = files;
        if (!body && toUpload.length === 0) return;
        // The reply quote goes on the first message sent: the text, or else the first attachment.
        let replyToId = replyTo?.id;
        setText("");
        setFiles([]);
        setReplyTo(undefined);
        try {
            if (body) {
                await api(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["routes"].messages, "POST", {
                    text: body,
                    replyToId
                });
                replyToId = undefined;
            }
            for (const file of toUpload){
                const message = await api(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["routes"].messages, "POST", {
                    replyToId,
                    attachment: {
                        name: file.name,
                        size: file.size,
                        mimeType: file.type || "application/octet-stream"
                    }
                });
                replyToId = undefined;
                void uploadAttachment(message.id, file);
            }
        } catch (err) {
            dispatch({
                type: "notice",
                notice: `Couldn't send: ${err.message}`
            });
        }
    }
    async function uploadAttachment(messageId, file) {
        const control = {
            stopped: false
        };
        uploadsRef.current.set(messageId, control);
        try {
            // Upload and hash in parallel: the host hashes what arrives, we hash the original.
            const [, sha256] = await Promise.all([
                putFile(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["routes"].attachmentData(messageId), file, control),
                hashFile(file, control)
            ]);
            await api(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["routes"].attachmentChecksum(messageId), "POST", {
                sha256
            });
        } catch (err) {
            if (!control.stopped) dispatch({
                type: "notice",
                notice: `${file.name} failed to send: ${err.message}`
            });
        } finally{
            uploadsRef.current.delete(messageId);
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
    async function removeMessage(message) {
        setSelected(undefined);
        const upload = uploadsRef.current.get(message.id);
        if (upload) {
            upload.stopped = true;
            upload.xhr?.abort();
        }
        try {
            await api(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["routes"].message(message.id), "DELETE");
        } catch (err) {
            dispatch({
                type: "notice",
                notice: `Couldn't remove: ${err.message}`
            });
        }
    }
    function showMessage(id) {
        const el = document.getElementById(`message-${id}`);
        if (!el) return dispatch({
            type: "notice",
            notice: "The original message was removed."
        });
        el.scrollIntoView({
            block: "center",
            behavior: "smooth"
        });
        el.animate([
            {
                opacity: 0.35
            },
            {
                opacity: 1
            }
        ], {
            duration: 700,
            delay: 250
        });
    }
    const others = state.online.filter((d)=>d.id !== state.self?.id);
    /** A device's current name; the name stored on the message is only a fallback for devices not in the directory. */ const nameOf = (id, fallback)=>id && state.names[id] || fallback;
    const isFileDrag = (e)=>e.dataTransfer.types.includes("Files");
    const dropHandlers = {
        onDragEnter: (e)=>{
            if (!isFileDrag(e)) return;
            e.preventDefault();
            dragDepth.current += 1;
            setDragging(true);
        },
        onDragOver: (e)=>{
            if (!isFileDrag(e)) return;
            e.preventDefault(); // required for the drop event to fire
            e.dataTransfer.dropEffect = "copy";
        },
        onDragLeave: (e)=>{
            if (!isFileDrag(e)) return;
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) setDragging(false);
        },
        onDrop: (e)=>{
            if (!isFileDrag(e)) return;
            e.preventDefault();
            dragDepth.current = 0;
            setDragging(false);
            // Browsers hand folders over as empty File entries that can't be read; leave them out.
            const items = [
                ...e.dataTransfer.items
            ].filter((item)=>item.kind === "file");
            const folders = items.filter((item)=>item.webkitGetAsEntry()?.isDirectory).length;
            const dropped = items.filter((item)=>!item.webkitGetAsEntry()?.isDirectory).map((item)=>item.getAsFile());
            chooseFiles(dropped.filter(Boolean));
            if (folders) dispatch({
                type: "notice",
                notice: "Folders can't be sent yet. Drop the files inside them instead."
            });
        }
    };
    // Presence carries the latest name, including renames made in another tab of this browser.
    const selfName = state.online.find((d)=>d.id === state.self?.id)?.name ?? state.self?.name;
    return(// App chrome, not a document: no text selection or iOS callouts anywhere except the message field.
    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ...dropHandlers,
        className: "relative flex h-dvh flex-col bg-background select-none [-webkit-touch-callout:none] [-webkit-user-select:none]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "sticky top-0 z-10 flex items-center gap-3 border-b border-separator bg-bar/80 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-xl",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        "aria-hidden": true,
                        className: "flex size-10 shrink-0 items-center justify-center rounded-full bg-ios-blue text-white",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(GroupIcon, {}, void 0, false, {
                            fileName: "[project]/apps/web/app/landrop.tsx",
                            lineNumber: 329,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 328,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "min-w-0 flex-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "truncate text-[17px] font-semibold leading-tight",
                                children: "LANDrop"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/landrop.tsx",
                                lineNumber: 332,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: `truncate text-[13px] ${state.connection === "offline" ? "text-ios-red" : "text-muted"}`,
                                children: state.connection === "online" ? others.length ? [
                                    ...others.map((d)=>d.name),
                                    "You"
                                ].join(", ") : "Only you are online" : state.connection === "connecting" ? "connecting…" : "Can't reach the host. Retrying…"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/landrop.tsx",
                                lineNumber: 334,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 331,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setRenaming(true),
                        className: "shrink-0 rounded-full",
                        "aria-label": `You are ${selfName ?? "joining"}. Change your name`,
                        title: `${selfName ?? ""} · tap to rename`,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Avatar, {
                            name: selfName ?? "?"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/landrop.tsx",
                            lineNumber: 350,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 344,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 327,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                className: "flex-1 overflow-y-auto px-3 pb-2 pt-3",
                "aria-live": "polite",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mx-auto flex max-w-2xl flex-col",
                    children: [
                        state.messages.length === 0 && state.connection === "online" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mt-20 text-center text-[13px] text-muted",
                            children: [
                                "No messages yet.",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                    fileName: "[project]/apps/web/app/landrop.tsx",
                                    lineNumber: 359,
                                    columnNumber: 15
                                }, this),
                                "Anyone on this Wi-Fi who opens this page joins the chat."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/web/app/landrop.tsx",
                            lineNumber: 357,
                            columnNumber: 13
                        }, this),
                        state.messages.map((m, i)=>{
                            const prev = state.messages[i - 1];
                            const next = state.messages[i + 1];
                            const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
                            const startsRun = newDay || prev.senderId !== m.senderId || m.createdAt - prev.createdAt > TIME_GAP_MS;
                            const endsRun = !next || next.senderId !== m.senderId || next.createdAt - m.createdAt > TIME_GAP_MS;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: startsRun ? "mt-2" : "mt-0.5",
                                children: [
                                    newDay && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mx-auto my-2 w-fit rounded-full bg-bubble-other px-3 py-1 text-center text-[11px] font-medium text-muted",
                                        children: formatDay(m.createdAt)
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/app/landrop.tsx",
                                        lineNumber: 372,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Bubble, {
                                        message: m,
                                        nameOf: nameOf,
                                        own: m.senderId === state.self?.id,
                                        tail: endsRun,
                                        progress: state.progress[m.id],
                                        downloadUrl: `${serverBase()}${__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["routes"].attachment(m.id)}?token=${state.token}`,
                                        previewUrl: `${serverBase()}${__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["routes"].attachmentPreview(m.id)}?token=${state.token}`,
                                        onOpenImage: ()=>setViewing(m),
                                        onReply: ()=>setReplyTo(m),
                                        onLongPress: ()=>{
                                            // iOS may already have started selecting under the finger; clear it before the menu opens.
                                            window.getSelection()?.removeAllRanges();
                                            setSelected(m);
                                        },
                                        onQuoteTap: showMessage
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/app/landrop.tsx",
                                        lineNumber: 376,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, m.id, true, {
                                fileName: "[project]/apps/web/app/landrop.tsx",
                                lineNumber: 370,
                                columnNumber: 15
                            }, this);
                        }),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            ref: bottomRef
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/landrop.tsx",
                            lineNumber: 396,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/app/landrop.tsx",
                    lineNumber: 355,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 354,
                columnNumber: 7
            }, this),
            state.notice && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                role: "alert",
                className: "mx-3 mb-2 flex items-start justify-between gap-3 rounded-2xl bg-ios-red/10 px-3 py-2 text-[13px]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: state.notice
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 405,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: "shrink-0 text-muted",
                        onClick: ()=>dispatch({
                                type: "notice"
                            }),
                        "aria-label": "Dismiss",
                        children: "✕"
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 406,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 401,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
                className: "border-t border-separator bg-bar/80 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mx-auto flex max-w-2xl flex-col gap-2",
                    children: [
                        replyTo && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "ml-11 flex items-center gap-2 rounded-lg border-l-[3px] border-ios-blue bg-bubble-other/60 px-2.5 py-1.5",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "min-w-0 flex-1 text-[13px] leading-[17px]",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "font-semibold text-ios-blue",
                                            children: [
                                                "Replying to ",
                                                replyTo.senderId === state.self?.id ? "yourself" : nameOf(replyTo.senderId, replyTo.senderName)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/web/app/landrop.tsx",
                                            lineNumber: 417,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "truncate text-muted",
                                            children: replyTo.text ?? `📄 ${replyTo.attachment?.name}`
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/landrop.tsx",
                                            lineNumber: 420,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/web/app/landrop.tsx",
                                    lineNumber: 416,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    className: "shrink-0 text-muted",
                                    "aria-label": "Cancel reply",
                                    onClick: ()=>setReplyTo(undefined),
                                    children: "✕"
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/app/landrop.tsx",
                                    lineNumber: 422,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/web/app/landrop.tsx",
                            lineNumber: 415,
                            columnNumber: 13
                        }, this),
                        files.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                            className: "flex flex-wrap gap-1.5 pl-11",
                            children: files.map((f, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                    className: "flex items-center gap-1.5 rounded-full bg-bubble-other px-2.5 py-1 text-[12px]",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "max-w-44 truncate",
                                            children: f.name
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/landrop.tsx",
                                            lineNumber: 434,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-muted",
                                            children: formatBytes(f.size)
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/landrop.tsx",
                                            lineNumber: 435,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            "aria-label": `Remove ${f.name}`,
                                            className: "text-muted",
                                            onClick: ()=>setFiles(files.filter((_, j)=>j !== i)),
                                            children: "✕"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/landrop.tsx",
                                            lineNumber: 436,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, `${f.name}-${i}`, true, {
                                    fileName: "[project]/apps/web/app/landrop.tsx",
                                    lineNumber: 430,
                                    columnNumber: 17
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/landrop.tsx",
                            lineNumber: 428,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-end gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-bubble-other text-muted",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(PlusIcon, {}, void 0, false, {
                                            fileName: "[project]/apps/web/app/landrop.tsx",
                                            lineNumber: 449,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "sr-only",
                                            children: [
                                                "Attach files (up to ",
                                                formatBytes(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MAX_ATTACHMENT_BYTES"]),
                                                " each)"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/web/app/landrop.tsx",
                                            lineNumber: 450,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            ref: fileInputRef,
                                            type: "file",
                                            multiple: true,
                                            className: "hidden",
                                            onChange: (e)=>chooseFiles([
                                                    ...e.target.files ?? []
                                                ])
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/landrop.tsx",
                                            lineNumber: 451,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/web/app/landrop.tsx",
                                    lineNumber: 448,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex min-h-9 flex-1 items-end rounded-[18px] border border-separator bg-background pl-3.5 pr-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                            value: text,
                                            onChange: (e)=>setText(e.target.value),
                                            onKeyDown: (e)=>{
                                                // On phones Return adds a line, like Messages; on computers Enter sends.
                                                if (e.key === "Enter" && !e.shiftKey && !matchMedia("(pointer: coarse)").matches) {
                                                    e.preventDefault();
                                                    void send();
                                                }
                                            },
                                            rows: 1,
                                            placeholder: "Message",
                                            "aria-label": "Message",
                                            className: "max-h-36 min-h-[34px] flex-1 resize-none bg-transparent select-text [-webkit-user-select:text] py-[7px] text-[16px] leading-5 outline-none [field-sizing:content]"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/landrop.tsx",
                                            lineNumber: 460,
                                            columnNumber: 15
                                        }, this),
                                        (text.trim() || files.length > 0) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>void send(),
                                            "aria-label": "Send",
                                            className: "my-[3px] ml-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-ios-blue text-white",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ArrowUpIcon, {}, void 0, false, {
                                                fileName: "[project]/apps/web/app/landrop.tsx",
                                                lineNumber: 481,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/landrop.tsx",
                                            lineNumber: 476,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/web/app/landrop.tsx",
                                    lineNumber: 459,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/web/app/landrop.tsx",
                            lineNumber: 447,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/app/landrop.tsx",
                    lineNumber: 413,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 412,
                columnNumber: 7
            }, this),
            viewing?.attachment && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ImageViewer, {
                name: viewing.attachment.name,
                url: `${serverBase()}${__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["routes"].attachmentPreview(viewing.id)}?token=${state.token}`,
                downloadUrl: `${serverBase()}${__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["routes"].attachment(viewing.id)}?token=${state.token}`,
                onClose: ()=>setViewing(undefined)
            }, void 0, false, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 490,
                columnNumber: 9
            }, this),
            dragging && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "pointer-events-none absolute inset-2 z-40 flex items-center justify-center rounded-3xl border-2 border-dashed border-ios-blue bg-background/85 backdrop-blur-sm",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-col items-center gap-2 text-ios-blue",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(PlusIcon, {}, void 0, false, {
                            fileName: "[project]/apps/web/app/landrop.tsx",
                            lineNumber: 501,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-[17px] font-semibold",
                            children: "Drop to attach"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/landrop.tsx",
                            lineNumber: 502,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-[13px] text-muted",
                            children: [
                                "Up to ",
                                formatBytes(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MAX_ATTACHMENT_BYTES"]),
                                " per file"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/web/app/landrop.tsx",
                            lineNumber: 503,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/app/landrop.tsx",
                    lineNumber: 500,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 499,
                columnNumber: 9
            }, this),
            renaming && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(RenameDialog, {
                current: selfName ?? "",
                onSave: rename,
                onCancel: ()=>setRenaming(false)
            }, void 0, false, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 508,
                columnNumber: 20
            }, this),
            selected && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(MessageSheet, {
                message: selected,
                saveUrl: `${serverBase()}${__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["routes"].attachment(selected.id)}?token=${state.token}`,
                // Senders can remove their own messages; the host can remove any (enforced again by the server).
                canRemove: selected.senderId === state.self?.id || state.isHost,
                onReply: ()=>{
                    setReplyTo(selected);
                    setSelected(undefined);
                },
                onRemove: ()=>removeMessage(selected),
                onClose: ()=>setSelected(undefined)
            }, void 0, false, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 511,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/app/landrop.tsx",
        lineNumber: 323,
        columnNumber: 5
    }, this));
}
/** A device keeps the same identity across reloads so its messages stay attributed to it. */ function loadIdentity() {
    try {
        const stored = JSON.parse(localStorage.getItem(IDENTITY_KEY) ?? "null");
        if (stored?.deviceId && stored.deviceSecret && stored.name) return stored;
    } catch  {
    // Storage unavailable (e.g. private browsing): fall through to a fresh identity for this visit.
    }
    const identity = {
        deviceId: randomHex(16),
        deviceSecret: randomHex(32),
        name: defaultDeviceName()
    };
    saveIdentity(identity);
    return identity;
}
function saveIdentity(identity) {
    try {
        localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
    } catch  {
    // Not persisted; the identity lasts for this visit only.
    }
}
/** crypto.getRandomValues works on plain-HTTP LAN pages, unlike crypto.randomUUID. */ function randomHex(bytes) {
    return [
        ...crypto.getRandomValues(new Uint8Array(bytes))
    ].map((b)=>b.toString(16).padStart(2, "0")).join("");
}
function defaultDeviceName() {
    const ua = navigator.userAgent;
    const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "Device";
    const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\/|FxiOS/.test(ua) ? "Firefox" : /Chrome\/|CriOS/.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
    return `${browser} on ${os}`;
}
// ---------- Helpers ----------
async function hashFile(file, control) {
    const hasher = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$hash$2d$wasm$2f$dist$2f$index$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createSHA256"])();
    hasher.init();
    for(let offset = 0; offset < file.size; offset += HASH_SLICE_BYTES){
        if (control.stopped) throw new Error("Stopped");
        // One slice in memory at a time; awaiting each read keeps the UI responsive.
        hasher.update(new Uint8Array(await file.slice(offset, offset + HASH_SLICE_BYTES).arrayBuffer()));
    }
    return hasher.digest("hex");
}
function safeMessage(body) {
    try {
        return JSON.parse(body).message;
    } catch  {
        return undefined;
    }
}
}),
"[project]/packages/protocol/src/index.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
    "GROUP_CHAT_ID",
    ()=>GROUP_CHAT_ID,
    "HISTORY_LIMIT",
    ()=>HISTORY_LIMIT,
    "MAX_ATTACHMENT_BYTES",
    ()=>MAX_ATTACHMENT_BYTES,
    "MAX_DEVICE_NAME_LENGTH",
    ()=>MAX_DEVICE_NAME_LENGTH,
    "MAX_FILE_NAME_LENGTH",
    ()=>MAX_FILE_NAME_LENGTH,
    "MAX_IMAGE_PREVIEW_BYTES",
    ()=>MAX_IMAGE_PREVIEW_BYTES,
    "MAX_TEXT_LENGTH",
    ()=>MAX_TEXT_LENGTH,
    "PROTOCOL_VERSION",
    ()=>PROTOCOL_VERSION,
    "SubmitChecksumRequestSchema",
    ()=>SubmitChecksumRequestSchema,
    "chatMembers",
    ()=>chatMembers,
    "previewKind",
    ()=>previewKind,
    "privateChatId",
    ()=>privateChatId,
    "routes",
    ()=>routes
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$discriminatedUnion$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-ssr] (ecmascript) <export * as z .discriminatedUnion>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-ssr] (ecmascript) <export * as z .object>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$literal$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-ssr] (ecmascript) <export * as z .literal>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-ssr] (ecmascript) <export * as z .number>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-ssr] (ecmascript) <export * as z .string>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$union$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-ssr] (ecmascript) <export * as z .union>");
;
const PROTOCOL_VERSION = 5;
const DEFAULT_LAN_PORT = 4545;
const API_PREFIX = "/api/v1";
const MAX_TEXT_LENGTH = 64 * 1024;
const MAX_ATTACHMENT_BYTES = 500 * 1024 * 1024;
const MAX_FILE_NAME_LENGTH = 255;
const MAX_DEVICE_NAME_LENGTH = 64;
const HISTORY_LIMIT = 500;
const DeviceNameSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().trim().min(1).max(MAX_DEVICE_NAME_LENGTH);
const GROUP_CHAT_ID = "group";
function privateChatId(a, b) {
    const [first, second] = [
        a,
        b
    ].sort();
    return `dm:${first}:${second}`;
}
function chatMembers(chatId) {
    if (chatId === GROUP_CHAT_ID) return "everyone";
    const match = /^dm:([0-9a-f]{32}):([0-9a-f]{32})$/.exec(chatId);
    return match && match[1] < match[2] ? [
        match[1],
        match[2]
    ] : undefined;
}
const ChatIdSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().refine((id)=>chatMembers(id) !== undefined, "Unknown chat");
const ReplyToIdSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().uuid().optional();
const CreateMessageRequestSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$union$3e$__["z"].union([
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
        chatId: ChatIdSchema,
        text: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().trim().min(1).max(MAX_TEXT_LENGTH),
        replyToId: ReplyToIdSchema
    }),
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
        chatId: ChatIdSchema,
        replyToId: ReplyToIdSchema,
        attachment: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
            name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().min(1).max(MAX_FILE_NAME_LENGTH),
            size: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number().int().nonnegative().max(MAX_ATTACHMENT_BYTES),
            mimeType: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().max(255).default("application/octet-stream")
        })
    })
]);
const SubmitChecksumRequestSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
    sha256: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().regex(/^[0-9a-f]{64}$/)
});
// ---------- Previews ----------
/**
 * Only formats a browser displays without running code are previewed. SVG is
 * excluded because it can carry scripts; everything else stays a download.
 */ const PREVIEWABLE_IMAGES = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/avif",
    "image/heic"
]);
const PREVIEWABLE_VIDEOS = new Set([
    "video/mp4",
    "video/quicktime",
    "video/webm"
]);
const MAX_IMAGE_PREVIEW_BYTES = 30 * 1024 * 1024;
function previewKind(attachment) {
    const type = attachment.mimeType.toLowerCase();
    if (PREVIEWABLE_IMAGES.has(type)) return attachment.size <= MAX_IMAGE_PREVIEW_BYTES ? "image" : undefined;
    if (PREVIEWABLE_VIDEOS.has(type)) return "video";
    return undefined;
}
const ClientMessageSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$discriminatedUnion$3e$__["z"].discriminatedUnion("type", [
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
        type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$literal$3e$__["z"].literal("hello"),
        protocolVersion: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number().int(),
        deviceId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().regex(/^[0-9a-f]{32}$/),
        deviceSecret: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().regex(/^[0-9a-f]{64}$/),
        name: DeviceNameSchema
    }),
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
        type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$literal$3e$__["z"].literal("profile:update"),
        name: DeviceNameSchema
    })
]);
const routes = {
    health: `${API_PREFIX}/health`,
    ws: `${API_PREFIX}/ws`,
    messages: `${API_PREFIX}/messages`,
    message: (id)=>`${API_PREFIX}/messages/${id}`,
    attachmentData: (id)=>`${API_PREFIX}/messages/${id}/attachment/data`,
    attachmentChecksum: (id)=>`${API_PREFIX}/messages/${id}/attachment/checksum`,
    attachment: (id)=>`${API_PREFIX}/messages/${id}/attachment`,
    attachmentPreview: (id)=>`${API_PREFIX}/messages/${id}/attachment/preview`
};
}),
];

//# sourceMappingURL=_0nntrjj58om6w._.js.map