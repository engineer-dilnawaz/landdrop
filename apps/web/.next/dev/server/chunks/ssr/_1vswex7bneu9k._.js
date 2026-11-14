module.exports = [
"[project]/apps/web/app/bubble.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Bubble",
    ()=>Bubble,
    "TIME_GAP_MS",
    ()=>TIME_GAP_MS
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/protocol/src/index.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$sparkle$2d$field$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/app/sparkle-field.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/app/ui.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
const TIME_GAP_MS = 15 * 60 * 1000;
const LONG_PRESS_MS = 450;
const SWIPE_TRIGGER_PX = 56;
const SWIPE_MAX_PX = 72;
function Bubble({ message, nameOf, own, showAvatar, tail, progress, downloadUrl, previewUrl, onReply, onLongPress, onQuoteTap, onOpenImage }) {
    const a = message.attachment;
    const senderName = nameOf(message.senderId, message.senderName);
    const [dx, setDx] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    const gesture = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    /** Set when the last press was a long press or swipe, so its trailing click doesn't also open the photo. */ const gestureConsumedClick = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    const [previewFailed, setPreviewFailed] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [expanded, setExpanded] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const shortText = message.text && !expanded ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["truncateLongText"])(message.text) : undefined;
    // Previews only once the host has verified the bytes (or live from the sender); formats this browser can't show fall back to the file card.
    const preview = a && (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isAvailable"])(a) && !previewFailed ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["previewKind"])(a) : undefined;
    const time = new Date(message.createdAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
    });
    const timeTone = own ? "text-white/70" : "text-muted";
    // Messages-style corners: the last bubble of a run gets the tighter "tail" corner.
    const shape = own ? tail ? "rounded-[18px] rounded-br-[4px]" : "rounded-[18px]" : tail ? "rounded-[18px] rounded-bl-[4px]" : "rounded-[18px]";
    // Swipe right to reply; press and hold for the remove sheet. Vertical drags stay with the page scroll.
    const handlers = {
        onPointerDown: (e)=>{
            if (e.button !== 0) return;
            const g = {
                x: e.clientX,
                y: e.clientY,
                swiping: false,
                longPressed: false,
                dx: 0
            };
            g.timer = setTimeout(()=>{
                g.longPressed = true;
                navigator.vibrate?.(10);
                onLongPress();
            }, LONG_PRESS_MS);
            gesture.current = g;
        },
        onPointerMove: (e)=>{
            const g = gesture.current;
            if (!g) return;
            const mx = e.clientX - g.x;
            const my = e.clientY - g.y;
            if (Math.abs(mx) > 8 || Math.abs(my) > 8) clearTimeout(g.timer);
            if (!g.swiping && !g.longPressed && mx > 10 && Math.abs(mx) > Math.abs(my) * 1.5) {
                g.swiping = true;
                e.currentTarget.setPointerCapture(e.pointerId);
            }
            if (g.swiping) {
                g.dx = Math.max(0, Math.min(mx, SWIPE_MAX_PX));
                setDx(g.dx);
            }
        },
        onPointerUp: ()=>{
            const g = gesture.current;
            if (!g) return;
            clearTimeout(g.timer);
            gestureConsumedClick.current = g.longPressed || g.swiping;
            if (g.swiping && g.dx >= SWIPE_TRIGGER_PX) {
                navigator.vibrate?.(10);
                onReply();
            }
            setDx(0);
            gesture.current = null;
        },
        onPointerCancel: ()=>{
            clearTimeout(gesture.current?.timer);
            gesture.current = null;
            setDx(0);
        },
        // Right-click on computers; on Android a long press also fires this, which the timer has already handled.
        onContextMenu: (e)=>{
            e.preventDefault();
            if (!gesture.current?.longPressed) onLongPress();
        }
    };
    const actions = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex shrink-0 items-center self-center text-muted",
        children: [
            message.text && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CopyButton"], {
                text: message.text
            }, void 0, false, {
                fileName: "[project]/apps/web/app/bubble.tsx",
                lineNumber: 138,
                columnNumber: 24
            }, this),
            a && (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isAvailable"])(a) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                href: downloadUrl,
                download: a.name,
                className: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ACTION_CLASS"],
                "aria-label": `Save ${a.name}`,
                title: a.sha256 ? `Save · SHA-256 ${a.sha256}` : "Save · streamed live from the sender",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SaveIcon"], {}, void 0, false, {
                    fileName: "[project]/apps/web/app/bubble.tsx",
                    lineNumber: 147,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/app/bubble.tsx",
                lineNumber: 140,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/app/bubble.tsx",
        lineNumber: 137,
        columnNumber: 5
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        id: `message-${message.id}`,
        className: `relative flex items-end gap-1 ${own ? "justify-end" : "justify-start"}`,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                "aria-hidden": true,
                className: "absolute left-0 top-1/2 -translate-y-1/2 text-muted",
                style: {
                    opacity: dx / SWIPE_TRIGGER_PX,
                    transform: `translateY(-50%) scale(${dx >= SWIPE_TRIGGER_PX ? 1.15 : 1})`
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ReplyIcon"], {}, void 0, false, {
                    fileName: "[project]/apps/web/app/bubble.tsx",
                    lineNumber: 160,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/app/bubble.tsx",
                lineNumber: 155,
                columnNumber: 7
            }, this),
            !own && showAvatar && // The sender's avatar marks the end of their run of messages; earlier bubbles keep the space so they line up.
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "w-7 shrink-0",
                title: senderName,
                children: tail && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Avatar"], {
                    name: senderName,
                    size: "small"
                }, void 0, false, {
                    fileName: "[project]/apps/web/app/bubble.tsx",
                    lineNumber: 165,
                    columnNumber: 20
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/app/bubble.tsx",
                lineNumber: 164,
                columnNumber: 9
            }, this),
            own && actions,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                ...handlers,
                "aria-label": own ? undefined : `${senderName}:`,
                style: {
                    transform: dx ? `translateX(${dx}px)` : undefined
                },
                // "isolate" lets a live file's sparkles sit between the bubble colour and its content.
                className: `relative isolate max-w-[72%] touch-pan-y text-[16px] leading-[21px] select-none [-webkit-touch-callout:none] [-webkit-user-select:none] ${dx ? "" : "transition-transform"} ${shape} ${own ? "bg-ios-blue text-white" : "bg-bubble-other text-foreground"} ${// Media sits inside the bubble with a thin frame, like WhatsApp, leaving room for the time below it.
                // Live media gets a wider frame so its sparkles show around it.
                preview ? a?.status === "live" ? "p-2" : "p-1" : "px-3 py-[7px]"}`,
                children: [
                    message.replyTo && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>onQuoteTap(message.replyTo.id),
                        className: `mb-1 block w-full rounded-lg border-l-[3px] px-2 py-1 text-left text-[13px] leading-[17px] ${own ? "border-white/70 bg-white/15" : "border-ios-blue bg-background/50"}`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: `block font-semibold ${own ? "text-white" : "text-ios-blue"}`,
                                children: nameOf(message.replyTo.senderId, message.replyTo.senderName)
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/bubble.tsx",
                                lineNumber: 189,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: `line-clamp-2 ${own ? "text-white/85" : "text-muted"}`,
                                children: message.replyTo.preview
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/bubble.tsx",
                                lineNumber: 192,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/app/bubble.tsx",
                        lineNumber: 183,
                        columnNumber: 11
                    }, this),
                    message.text && // WhatsApp-style time: floated into the last line when it fits, otherwise wrapped onto its own line.
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "whitespace-pre-wrap wrap-break-word",
                        children: [
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["linkify"])(shortText ?? message.text, own),
                            shortText !== undefined && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    "… ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setExpanded(true),
                                        className: `font-semibold ${own ? "text-white" : "text-ios-blue"}`,
                                        children: "Read more"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/app/bubble.tsx",
                                        lineNumber: 202,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/web/app/bubble.tsx",
                                lineNumber: 200,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("time", {
                                className: `float-right ml-2 mt-[5px] text-[11px] leading-4 ${timeTone}`,
                                children: time
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/bubble.tsx",
                                lineNumber: 207,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/app/bubble.tsx",
                        lineNumber: 197,
                        columnNumber: 11
                    }, this),
                    a && preview === "image" && // eslint-disable-next-line @next/next/no-img-element -- served by the LAN host, not optimisable by Next
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                        src: previewUrl,
                        alt: a.name,
                        loading: "lazy",
                        draggable: false,
                        onError: ()=>setPreviewFailed(true),
                        onClick: ()=>!gestureConsumedClick.current && onOpenImage(),
                        className: "block max-h-80 min-h-24 min-w-24 max-w-full cursor-zoom-in rounded-[14px] bg-background/30 object-cover"
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/bubble.tsx",
                        lineNumber: 212,
                        columnNumber: 11
                    }, this),
                    a && preview === "video" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("video", {
                        // "#t=0.1" makes iOS Safari load and show the first frame instead of a blank box.
                        src: `${previewUrl}#t=0.1`,
                        controls: true,
                        playsInline: true,
                        preload: "metadata",
                        onError: ()=>setPreviewFailed(true),
                        className: "block max-h-80 max-w-full rounded-[14px] bg-black"
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/bubble.tsx",
                        lineNumber: 223,
                        columnNumber: 11
                    }, this),
                    preview && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex justify-end px-1.5 pt-0.5",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("time", {
                            className: `text-[11px] leading-4 ${timeTone}`,
                            children: time
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/bubble.tsx",
                            lineNumber: 235,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/bubble.tsx",
                        lineNumber: 234,
                        columnNumber: 11
                    }, this),
                    a && !preview && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex min-w-52 flex-col gap-1.5 py-0.5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2.5",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: `flex size-9 shrink-0 items-center justify-center rounded-lg ${own ? "bg-white/20" : "bg-background"}`,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FileIcon"], {}, void 0, false, {
                                            fileName: "[project]/apps/web/app/bubble.tsx",
                                            lineNumber: 244,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/app/bubble.tsx",
                                        lineNumber: 241,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "min-w-0",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "break-all text-[15px] font-medium leading-5",
                                                children: a.name
                                            }, void 0, false, {
                                                fileName: "[project]/apps/web/app/bubble.tsx",
                                                lineNumber: 247,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: `text-[12px] ${own ? "text-white/75" : "text-muted"}`,
                                                children: [
                                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatBytes"])(a.size),
                                                    a.status === "ready" && " · ✓ verified",
                                                    a.status === "failed" && " · didn't finish sending",
                                                    a.status === "live" && (own ? " · live from this device, keep LANDrop open" : " · live while the sender is online")
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/apps/web/app/bubble.tsx",
                                                lineNumber: 248,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/apps/web/app/bubble.tsx",
                                        lineNumber: 246,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/web/app/bubble.tsx",
                                lineNumber: 240,
                                columnNumber: 13
                            }, this),
                            a.status === "uploading" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["UploadProgress"], {
                                size: a.size,
                                progress: progress,
                                own: own
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/bubble.tsx",
                                lineNumber: 256,
                                columnNumber: 42
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("time", {
                                className: `self-end text-[11px] leading-4 ${timeTone}`,
                                children: time
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/bubble.tsx",
                                lineNumber: 257,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/app/bubble.tsx",
                        lineNumber: 239,
                        columnNumber: 11
                    }, this),
                    a?.status === "live" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "absolute inset-0 -z-10 rounded-[inherit]",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$sparkle$2d$field$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SparkleField"], {}, void 0, false, {
                            fileName: "[project]/apps/web/app/bubble.tsx",
                            lineNumber: 262,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/bubble.tsx",
                        lineNumber: 261,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/app/bubble.tsx",
                lineNumber: 169,
                columnNumber: 7
            }, this),
            !own && actions
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/app/bubble.tsx",
        lineNumber: 154,
        columnNumber: 5
    }, this);
} /** Full-screen photo viewer, like tapping a photo in Messages. */ 
}),
"[project]/apps/web/app/chat-list.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ChatAvatar",
    ()=>ChatAvatar,
    "ChatList",
    ()=>ChatList
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/app/ui.tsx [app-ssr] (ecmascript)");
"use client";
;
;
function ChatList({ chats, activeId, selfName, connection, compact, pinned, onTogglePinned, onOpen, onRename }) {
    // Hidden rather than removed, so the list keeps its layout while the rail slides open.
    const railHidden = `transition-opacity ${compact ? "opacity-0" : ""}`;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex min-h-0 flex-1 flex-col",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "flex items-center gap-3 border-b border-separator bg-bar/80 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: onTogglePinned,
                        className: "hidden size-12 shrink-0 items-center justify-center rounded-full text-ios-blue hover:bg-bubble-other md:flex",
                        "aria-label": pinned ? "Collapse chat list" : "Keep chat list open",
                        "aria-pressed": pinned,
                        title: pinned ? "Collapse · opens on hover" : "Keep open",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SidebarIcon"], {
                            pinned: pinned
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/chat-list.tsx",
                            lineNumber: 50,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/chat-list.tsx",
                        lineNumber: 43,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: `min-w-0 flex-1 ${railHidden}`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "text-[28px] font-bold leading-tight tracking-tight",
                                children: "Chats"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/chat-list.tsx",
                                lineNumber: 53,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: `truncate text-[13px] ${connection === "offline" ? "text-ios-red" : "text-muted"}`,
                                children: connection === "online" ? "LANDrop · on this Wi-Fi" : connection === "connecting" ? "connecting…" : "Can't reach the host. Retrying…"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/chat-list.tsx",
                                lineNumber: 54,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/app/chat-list.tsx",
                        lineNumber: 52,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: onRename,
                        tabIndex: compact ? -1 : undefined,
                        className: `shrink-0 rounded-full ${railHidden}`,
                        "aria-label": `You are ${selfName ?? "joining"}. Change your name`,
                        title: `${selfName ?? ""} · tap to rename`,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Avatar"], {
                            name: selfName ?? "?"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/chat-list.tsx",
                            lineNumber: 69,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/chat-list.tsx",
                        lineNumber: 62,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/app/chat-list.tsx",
                lineNumber: 42,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                className: "flex-1 overflow-y-auto",
                "aria-label": "Chats",
                children: chats.map((chat)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>onOpen(chat.id),
                            "aria-current": chat.id === activeId ? "page" : undefined,
                            title: compact ? chat.title : undefined,
                            className: `flex w-full items-center gap-3 px-4 py-2.5 text-left ${chat.id === activeId ? "bg-bubble-other" : "active:bg-bubble-other md:hover:bg-bubble-other/60"}`,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "relative shrink-0",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ChatAvatar, {
                                            chat: chat
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/chat-list.tsx",
                                            lineNumber: 85,
                                            columnNumber: 17
                                        }, this),
                                        compact && chat.unread > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(UnreadBadge, {
                                            count: chat.unread,
                                            className: "absolute -top-1 -right-1.5 border-2 border-background"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/chat-list.tsx",
                                            lineNumber: 87,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/web/app/chat-list.tsx",
                                    lineNumber: 84,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: `min-w-0 flex-1 border-b border-separator/60 pb-2.5 ${railHidden}`,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-baseline justify-between gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "truncate text-[17px] font-semibold",
                                                    children: chat.title
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/web/app/chat-list.tsx",
                                                    lineNumber: 92,
                                                    columnNumber: 19
                                                }, this),
                                                chat.lastAt !== undefined && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: `shrink-0 text-[13px] ${chat.unread ? "text-ios-blue" : "text-muted"}`,
                                                    children: formatListTime(chat.lastAt)
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/web/app/chat-list.tsx",
                                                    lineNumber: 94,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/web/app/chat-list.tsx",
                                            lineNumber: 91,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center justify-between gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "line-clamp-2 text-[15px] leading-5 text-muted",
                                                    children: chat.preview ?? (chat.online ? "Online · tap to start a private chat" : "Tap to start a private chat")
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/web/app/chat-list.tsx",
                                                    lineNumber: 100,
                                                    columnNumber: 19
                                                }, this),
                                                chat.unread > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(UnreadBadge, {
                                                    count: chat.unread
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/web/app/chat-list.tsx",
                                                    lineNumber: 103,
                                                    columnNumber: 39
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/web/app/chat-list.tsx",
                                            lineNumber: 99,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/web/app/chat-list.tsx",
                                    lineNumber: 90,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/web/app/chat-list.tsx",
                            lineNumber: 76,
                            columnNumber: 13
                        }, this)
                    }, chat.id, false, {
                        fileName: "[project]/apps/web/app/chat-list.tsx",
                        lineNumber: 75,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/apps/web/app/chat-list.tsx",
                lineNumber: 73,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/app/chat-list.tsx",
        lineNumber: 41,
        columnNumber: 5
    }, this);
}
function UnreadBadge({ count, className = "" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: `flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-ios-blue px-1.5 text-[12px] font-semibold text-white ${className}`,
        "aria-label": `${count} unread`,
        children: count > 99 ? "99+" : count
    }, void 0, false, {
        fileName: "[project]/apps/web/app/chat-list.tsx",
        lineNumber: 116,
        columnNumber: 5
    }, this);
}
function ChatAvatar({ chat }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: "relative shrink-0",
        children: [
            chat.isGroup ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                "aria-hidden": true,
                className: "flex size-12 items-center justify-center rounded-full bg-ios-blue text-white",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["GroupIcon"], {}, void 0, false, {
                    fileName: "[project]/apps/web/app/chat-list.tsx",
                    lineNumber: 130,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/app/chat-list.tsx",
                lineNumber: 129,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Avatar"], {
                name: chat.title,
                size: "list"
            }, void 0, false, {
                fileName: "[project]/apps/web/app/chat-list.tsx",
                lineNumber: 133,
                columnNumber: 9
            }, this),
            chat.online && !chat.isGroup && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                "aria-label": "online",
                className: "absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-background bg-ios-green"
            }, void 0, false, {
                fileName: "[project]/apps/web/app/chat-list.tsx",
                lineNumber: 136,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/app/chat-list.tsx",
        lineNumber: 127,
        columnNumber: 5
    }, this);
}
/** Today: the time; yesterday: "Yesterday"; this week: the weekday; otherwise a short date. */ function formatListTime(at) {
    const date = new Date(at);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
    });
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    if (today.getTime() - at < 7 * 86_400_000) return date.toLocaleDateString([], {
        weekday: "long"
    });
    return date.toLocaleDateString([], {
        day: "numeric",
        month: "numeric",
        year: "2-digit"
    });
}
}),
"[project]/apps/web/app/chat-view.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ChatView",
    ()=>ChatView
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/protocol/src/index.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$bubble$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/app/bubble.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$chat$2d$list$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/app/chat-list.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/app/ui.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
function ChatView({ chat, messages, selfId, nameOf, progress, urls, composer, onBack, onOpenImage, onReply, onLongPress }) {
    const bottomRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const fileInputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const { text, files, replyTo } = composer;
    // Open at the newest message, and follow new ones as they arrive, like a chat app.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useLayoutEffect"])(()=>{
        bottomRef.current?.scrollIntoView({
            block: "end"
        });
    }, [
        chat.id,
        messages.length
    ]);
    function showMessage(id) {
        const el = document.getElementById(`message-${id}`);
        if (!el) return;
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
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex min-h-0 flex-1 flex-col",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "flex items-center gap-2 border-b border-separator bg-bar/80 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-xl",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: onBack,
                        className: "flex size-9 shrink-0 items-center justify-center text-ios-blue md:hidden",
                        "aria-label": "Back to chats",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BackIcon"], {}, void 0, false, {
                            fileName: "[project]/apps/web/app/chat-view.tsx",
                            lineNumber: 77,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/chat-view.tsx",
                        lineNumber: 72,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "md:ml-2",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$chat$2d$list$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ChatAvatar"], {
                            chat: chat
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/chat-view.tsx",
                            lineNumber: 80,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/chat-view.tsx",
                        lineNumber: 79,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "min-w-0 flex-1 pl-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "truncate text-[17px] font-semibold leading-tight",
                                children: chat.title
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/chat-view.tsx",
                                lineNumber: 83,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: `truncate text-[13px] ${chat.online && !chat.isGroup ? "text-ios-green" : "text-muted"}`,
                                children: chat.subtitle
                            }, void 0, false, {
                                fileName: "[project]/apps/web/app/chat-view.tsx",
                                lineNumber: 84,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/web/app/chat-view.tsx",
                        lineNumber: 82,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/app/chat-view.tsx",
                lineNumber: 71,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                className: "flex-1 overflow-y-auto px-3 pb-2 pt-3",
                "aria-live": "polite",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mx-auto flex max-w-2xl flex-col",
                    children: [
                        messages.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mx-auto mt-16 max-w-64 rounded-xl bg-bubble-other px-4 py-3 text-center text-[13px] text-muted",
                            children: chat.isGroup ? "Messages here go to everyone on this Wi-Fi who opens LANDrop." : `Messages here are only between you and ${chat.title}.`
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/chat-view.tsx",
                            lineNumber: 93,
                            columnNumber: 13
                        }, this),
                        messages.map((m, i)=>{
                            const prev = messages[i - 1];
                            const next = messages[i + 1];
                            const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
                            const startsRun = newDay || prev.senderId !== m.senderId || m.createdAt - prev.createdAt > __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$bubble$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TIME_GAP_MS"];
                            const endsRun = !next || next.senderId !== m.senderId || next.createdAt - m.createdAt > __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$bubble$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TIME_GAP_MS"];
                            const { download, preview } = urls(m.id);
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: startsRun ? "mt-2" : "mt-0.5",
                                children: [
                                    newDay && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mx-auto my-2 w-fit rounded-full bg-bubble-other px-3 py-1 text-center text-[11px] font-medium text-muted",
                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatDay"])(m.createdAt)
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/app/chat-view.tsx",
                                        lineNumber: 109,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$bubble$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Bubble"], {
                                        message: m,
                                        nameOf: nameOf,
                                        own: m.senderId === selfId,
                                        // In a private chat, like WhatsApp, the other person needs no avatar beside each message.
                                        showAvatar: chat.isGroup,
                                        tail: endsRun,
                                        progress: progress[m.id],
                                        downloadUrl: download,
                                        previewUrl: preview,
                                        onOpenImage: ()=>onOpenImage(m),
                                        onReply: ()=>onReply(m),
                                        onLongPress: ()=>{
                                            // iOS may already have started selecting under the finger; clear it before the menu opens.
                                            window.getSelection()?.removeAllRanges();
                                            onLongPress(m);
                                        },
                                        onQuoteTap: showMessage
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/app/chat-view.tsx",
                                        lineNumber: 113,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, m.id, true, {
                                fileName: "[project]/apps/web/app/chat-view.tsx",
                                lineNumber: 107,
                                columnNumber: 15
                            }, this);
                        }),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            ref: bottomRef
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/chat-view.tsx",
                            lineNumber: 135,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/app/chat-view.tsx",
                    lineNumber: 91,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/app/chat-view.tsx",
                lineNumber: 90,
                columnNumber: 7
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
                                                replyTo.senderId === selfId ? "yourself" : nameOf(replyTo.senderId, replyTo.senderName)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/web/app/chat-view.tsx",
                                            lineNumber: 144,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "truncate text-muted",
                                            children: replyTo.text ?? `📄 ${replyTo.attachment?.name}`
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/chat-view.tsx",
                                            lineNumber: 147,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/web/app/chat-view.tsx",
                                    lineNumber: 143,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    className: "shrink-0 text-muted",
                                    "aria-label": "Cancel reply",
                                    onClick: composer.cancelReply,
                                    children: "✕"
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/app/chat-view.tsx",
                                    lineNumber: 149,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/web/app/chat-view.tsx",
                            lineNumber: 142,
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
                                            fileName: "[project]/apps/web/app/chat-view.tsx",
                                            lineNumber: 161,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-muted",
                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatBytes"])(f.size)
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/chat-view.tsx",
                                            lineNumber: 162,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            "aria-label": `Remove ${f.name}`,
                                            className: "text-muted",
                                            onClick: ()=>composer.removeFile(i),
                                            children: "✕"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/chat-view.tsx",
                                            lineNumber: 163,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, `${f.name}-${i}`, true, {
                                    fileName: "[project]/apps/web/app/chat-view.tsx",
                                    lineNumber: 157,
                                    columnNumber: 17
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/chat-view.tsx",
                            lineNumber: 155,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-end gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-bubble-other text-muted",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PlusIcon"], {}, void 0, false, {
                                            fileName: "[project]/apps/web/app/chat-view.tsx",
                                            lineNumber: 172,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "sr-only",
                                            children: [
                                                "Attach files of any size (over ",
                                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatBytes"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MAX_ATTACHMENT_BYTES"]),
                                                " they are shared live from this device)"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/web/app/chat-view.tsx",
                                            lineNumber: 173,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            ref: fileInputRef,
                                            type: "file",
                                            multiple: true,
                                            className: "hidden",
                                            onChange: (e)=>{
                                                composer.chooseFiles([
                                                    ...e.target.files ?? []
                                                ]);
                                                e.target.value = "";
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/chat-view.tsx",
                                            lineNumber: 176,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/web/app/chat-view.tsx",
                                    lineNumber: 171,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex min-h-9 flex-1 items-end rounded-[18px] border border-separator bg-background pl-3.5 pr-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                            value: text,
                                            onChange: (e)=>composer.setText(e.target.value),
                                            onKeyDown: (e)=>{
                                                // On phones Return adds a line, like Messages; on computers Enter sends.
                                                if (e.key === "Enter" && !e.shiftKey && !matchMedia("(pointer: coarse)").matches) {
                                                    e.preventDefault();
                                                    composer.send();
                                                }
                                            },
                                            rows: 1,
                                            placeholder: "Message",
                                            "aria-label": "Message",
                                            className: "max-h-36 min-h-[34px] flex-1 resize-none bg-transparent py-[7px] text-[16px] leading-5 outline-none select-text [-webkit-user-select:text] [field-sizing:content]"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/chat-view.tsx",
                                            lineNumber: 188,
                                            columnNumber: 15
                                        }, this),
                                        (text.trim() || files.length > 0) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: composer.send,
                                            "aria-label": "Send",
                                            className: "my-[3px] ml-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-ios-blue text-white",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ArrowUpIcon"], {}, void 0, false, {
                                                fileName: "[project]/apps/web/app/chat-view.tsx",
                                                lineNumber: 209,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/chat-view.tsx",
                                            lineNumber: 204,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/web/app/chat-view.tsx",
                                    lineNumber: 187,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/web/app/chat-view.tsx",
                            lineNumber: 170,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/app/chat-view.tsx",
                    lineNumber: 140,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/app/chat-view.tsx",
                lineNumber: 139,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/app/chat-view.tsx",
        lineNumber: 70,
        columnNumber: 5
    }, this);
}
}),
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
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$chat$2d$list$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/app/chat-list.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$chat$2d$view$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/app/chat-view.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$sidebar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/app/sidebar.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/app/ui.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
;
const LAN_PORT = Number(process.env.NEXT_PUBLIC_LANDROP_PORT ?? __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DEFAULT_LAN_PORT"]);
const HASH_SLICE_BYTES = 8 * 1024 * 1024;
const RECONNECT_MS = 2000;
const IDENTITY_KEY = "landrop.identity";
const READ_KEY = "landrop.read";
const initialState = {
    connection: "connecting",
    isHost: false,
    online: [],
    devices: {},
    messages: [],
    progress: {}
};
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
/** Merges presence into the directory; a device that just went offline was last seen now. */ function withPresence(devices, before, online) {
    const next = {
        ...devices
    };
    const now = Date.now();
    for (const d of before)if (!online.some((o)=>o.id === d.id) && next[d.id]) next[d.id] = {
        ...next[d.id],
        lastSeen: now
    };
    for (const d of online)next[d.id] = {
        id: d.id,
        name: d.name,
        lastSeen: now
    };
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
    if (action.type === "loadRead") {
        if (state.readAt) return state;
        // A device's first visit: everything already in the history counts as read.
        const newest = Math.max(0, ...state.messages.map((m)=>m.createdAt));
        return {
            ...state,
            readAt: action.stored ?? {
                "*": newest
            }
        };
    }
    if (action.type === "read") {
        const newest = Math.max(0, ...state.messages.filter((m)=>m.chatId === action.chatId).map((m)=>m.createdAt));
        if (!state.readAt || newest <= (state.readAt[action.chatId] ?? 0)) return state;
        return {
            ...state,
            readAt: {
                ...state.readAt,
                [action.chatId]: newest
            }
        };
    }
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
                devices: withPresence(Object.fromEntries(e.directory.map((d)=>[
                        d.id,
                        d
                    ])), [], e.online),
                messages: e.messages
            };
        case "presence:update":
            return {
                ...state,
                online: e.online,
                devices: withPresence(state.devices, state.online, e.online)
            };
        case "message:created":
        case "message:updated":
            return {
                ...state,
                messages: upsert(state.messages, e.message)
            };
        case "message:deleted":
            {
                const progress = {
                    ...state.progress
                };
                delete progress[e.messageId];
                const gone = state.messages.find((m)=>m.id === e.messageId);
                // Only someone watching or saving a live file needs to know why it vanished.
                const notice = e.reason === "sender-offline" && action.using && gone?.attachment ? `“${gone.attachment.name}” is no longer available. ${state.devices[gone.senderId]?.name ?? gone.senderName} went offline.` : state.notice;
                return {
                    ...state,
                    messages: state.messages.filter((m)=>m.id !== e.messageId),
                    progress,
                    notice
                };
            }
        case "stream:request":
            return state;
        case "attachment:progress":
            return {
                ...state,
                progress: {
                    ...state.progress,
                    [e.messageId]: e
                }
            };
        case "error":
            return {
                ...state,
                notice: e.message
            };
    }
}
/** The open chat lives in the URL hash, so the browser's back button returns to the list. */ const serverBase = ()=>`${location.protocol}//${location.hostname}:${LAN_PORT}`;
/** Sends the host exactly the bytes a viewer asked for. The browser reads just that slice from disk. */ async function serveLiveRange({ requestId, messageId, start, end }, liveFiles, /** Live files still being announced; a viewer can ask for one before the announcement returns its id. */ announcements, token) {
    if (!liveFiles.has(messageId)) await Promise.allSettled(announcements);
    const file = liveFiles.get(messageId);
    if (!file) return; // Not held by this page; the host times the request out.
    await fetch(serverBase() + __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["routes"].streamData(requestId), {
        method: "PUT",
        headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/octet-stream"
        },
        body: file.slice(start, end + 1)
    }).catch(()=>{
    // The viewer stopped (seeked or closed) and the host cut this piece short.
    });
}
function chatIdFromHash() {
    const match = /^#\/chat\/(.+)$/.exec(location.hash);
    return match && (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["chatMembers"])(decodeURIComponent(match[1])) ? decodeURIComponent(match[1]) : undefined;
}
function LanDrop() {
    const [state, dispatch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useReducer"])(reducer, initialState);
    const [chatId, setChatId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])();
    /** Unsent text per chat, like WhatsApp drafts. */ const [drafts, setDrafts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({});
    const [files, setFiles] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [replyTo, setReplyTo] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])();
    /** Mirrors chatId for socket and visibility handlers, which outlive a render. */ const chatIdRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(undefined);
    /** The message whose press-and-hold menu is open. */ const [selected, setSelected] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])();
    const [dragging, setDragging] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [renaming, setRenaming] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    /** dragenter/dragleave fire for every child element; count them so the overlay doesn't flicker. */ const dragDepth = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    const [viewing, setViewing] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])();
    const socketRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const tokenRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(undefined);
    const identityRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    /** Uploads in progress by message id, so they can be stopped if the connection drops. */ const uploadsRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(new Map());
    /** This page's id: live files are held in its memory, so they belong to it rather than to the device. */ const tabIdRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(undefined);
    /** Files over the upload cap, by message id, served live to whoever watches or saves them. */ const liveFilesRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(new Map());
    const liveAnnouncementsRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(new Set());
    /** Attachments this device has played or saved, so their sudden removal can be explained. */ const usedRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(new Set());
    const selfId = state.self?.id;
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
        tabIdRef.current = randomHex(16);
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
                    tabId: tabIdRef.current,
                    name
                };
                socket.send(JSON.stringify(hello));
            };
            socket.onmessage = (raw)=>{
                const event = JSON.parse(raw.data);
                if (event.type === "session:welcome") tokenRef.current = event.token;
                if (event.type === "stream:request") {
                    return void serveLiveRange(event, liveFilesRef.current, liveAnnouncementsRef.current, tokenRef.current);
                }
                if (event.type === "message:deleted") liveFilesRef.current.delete(event.messageId);
                dispatch({
                    type: "event",
                    event,
                    using: event.type === "message:deleted" && usedRef.current.has(event.messageId)
                });
                if (event.type === "session:welcome") dispatch({
                    type: "loadRead",
                    stored: loadReadState()
                });
                // Messages arriving in the chat on screen are read as they arrive.
                const open = chatIdRef.current;
                const arrived = event.type === "session:welcome" || event.type === "message:created" && event.message.chatId === open;
                if (open && arrived && document.visibilityState === "visible") dispatch({
                    type: "read",
                    chatId: open
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
            if (document.visibilityState !== "visible") return;
            if (!s || s.readyState >= WebSocket.CLOSING) open();
            if (chatIdRef.current) dispatch({
                type: "read",
                chatId: chatIdRef.current
            });
        };
        const onHash = ()=>{
            const id = chatIdFromHash();
            chatIdRef.current = id;
            setChatId(id);
            if (id) dispatch({
                type: "read",
                chatId: id
            });
        };
        // Playing a video or saving a file anywhere (bubble, menu, viewer) marks it in use. Listened for
        // in the capture phase because media events don't bubble.
        const onUse = (e)=>{
            const target = e.target;
            const url = target instanceof HTMLMediaElement ? target.currentSrc : target.closest?.("a[download]")?.getAttribute("href");
            const id = url && /\/messages\/([^/]+)\/attachment/.exec(url)?.[1];
            if (id) usedRef.current.add(id);
        };
        document.addEventListener("play", onUse, true);
        document.addEventListener("click", onUse, true);
        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("hashchange", onHash);
        onHash();
        open();
        return ()=>{
            disposed = true;
            clearTimeout(retry);
            document.removeEventListener("visibilitychange", onVisible);
            document.removeEventListener("play", onUse, true);
            document.removeEventListener("click", onUse, true);
            window.removeEventListener("hashchange", onHash);
            socketRef.current?.close();
        };
    }, []);
    // Read state is per device and only ever written here; changes come from the handlers above.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!state.readAt) return;
        try {
            localStorage.setItem(READ_KEY, JSON.stringify(state.readAt));
        } catch  {
        // Not persisted; unread counts reset on reload.
        }
    }, [
        state.readAt
    ]);
    function openChat(id) {
        // Each chat keeps its own draft; replies and picked files belong to the chat they were made in.
        setReplyTo(undefined);
        setFiles([]);
        if (id) location.hash = `/chat/${encodeURIComponent(id)}`;
        else if (chatIdFromHash()) history.back();
    }
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
        setFiles((current)=>[
                ...current,
                ...picked
            ]);
        dispatch({
            type: "notice",
            notice: undefined
        });
    }
    async function send() {
        if (!chatId) return;
        if (state.connection !== "online") {
            return dispatch({
                type: "notice",
                notice: "Not connected to the LANDrop host yet. Reconnecting…"
            });
        }
        const body = (drafts[chatId] ?? "").trim();
        const toUpload = files;
        if (!body && toUpload.length === 0) return;
        // The reply quote goes on the first message sent: the text, or else the first attachment.
        let replyToId = replyTo?.id;
        setDrafts((d)=>({
                ...d,
                [chatId]: ""
            }));
        setFiles([]);
        setReplyTo(undefined);
        try {
            if (body) {
                await api(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["routes"].messages, "POST", {
                    chatId,
                    text: body,
                    replyToId
                });
                replyToId = undefined;
            }
            for (const file of toUpload){
                // Over the cap, the file isn't uploaded: it stays on this device and is streamed to whoever opens it.
                const live = file.size > __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MAX_ATTACHMENT_BYTES"];
                const announcement = api(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["routes"].messages, "POST", {
                    chatId,
                    replyToId,
                    attachment: {
                        name: file.name,
                        size: file.size,
                        mimeType: file.type || "application/octet-stream",
                        live
                    }
                });
                if (live) liveAnnouncementsRef.current.add(announcement);
                const message = await announcement.finally(()=>liveAnnouncementsRef.current.delete(announcement));
                replyToId = undefined;
                if (!live) void uploadAttachment(message.id, file);
                else {
                    liveFilesRef.current.set(message.id, file);
                    dispatch({
                        type: "notice",
                        notice: `${file.name} is shared live from this device. Keep LANDrop open here, or it leaves the chat.`
                    });
                }
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
    /** A device's current name; the name stored on the message is only a fallback for devices not in the directory. */ const nameOf = (id, fallback)=>id && state.devices[id]?.name || fallback;
    const isOnline = (id)=>state.online.some((d)=>d.id === id);
    const urls = (messageId)=>({
            download: `${serverBase()}${__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["routes"].attachment(messageId)}?token=${state.token}`,
            preview: `${serverBase()}${__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["routes"].attachmentPreview(messageId)}?token=${state.token}`
        });
    // ---------- Chat list ----------
    const lastByChat = new Map();
    const unreadByChat = new Map();
    for (const m of state.messages){
        lastByChat.set(m.chatId, m);
        const read = state.readAt?.[m.chatId] ?? state.readAt?.["*"] ?? Infinity;
        if (m.senderId !== selfId && m.createdAt > read) unreadByChat.set(m.chatId, (unreadByChat.get(m.chatId) ?? 0) + 1);
    }
    const summarize = (id, title, isGroup, online)=>{
        const last = lastByChat.get(id);
        const who = !last ? "" : last.senderId === selfId ? "You: " : isGroup ? `${nameOf(last.senderId, last.senderName)}: ` : "";
        return {
            id,
            title,
            isGroup,
            online,
            preview: last && who + messagePreview(last),
            lastAt: last?.createdAt,
            unread: unreadByChat.get(id) ?? 0
        };
    };
    const chats = selfId ? [
        summarize(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["GROUP_CHAT_ID"], "LANDrop group", true, false),
        ...Object.values(state.devices).filter((d)=>d.id !== selfId).map((d)=>summarize((0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["privateChatId"])(selfId, d.id), d.name, false, isOnline(d.id)))
    ].sort(// Most recent conversation first, like WhatsApp; people never messaged come after, online ones first.
    (a, b)=>(b.lastAt ?? -1) - (a.lastAt ?? -1) || Number(b.online) - Number(a.online) || a.title.localeCompare(b.title)) : [];
    // ---------- Open chat ----------
    const others = state.online.filter((d)=>d.id !== selfId);
    const activeChat = (()=>{
        if (!chatId || !selfId) return undefined;
        const members = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["chatMembers"])(chatId);
        if (members === "everyone") {
            return {
                id: chatId,
                title: "LANDrop group",
                isGroup: true,
                online: false,
                subtitle: others.length ? [
                    ...others.map((d)=>d.name),
                    "You"
                ].join(", ") : "Only you are online"
            };
        }
        const otherId = members?.find((id)=>id !== selfId);
        const other = otherId ? state.devices[otherId] : undefined;
        if (!members?.includes(selfId) || !other) return undefined;
        const online = isOnline(other.id);
        return {
            id: chatId,
            title: other.name,
            isGroup: false,
            online,
            subtitle: online ? "online" : formatLastSeen(other.lastSeen)
        };
    })();
    const chatMessages = activeChat ? state.messages.filter((m)=>m.chatId === activeChat.id) : [];
    const isFileDrag = (e)=>e.dataTransfer.types.includes("Files");
    const dropHandlers = {
        onDragEnter: (e)=>{
            if (!isFileDrag(e) || !activeChat) return;
            e.preventDefault();
            dragDepth.current += 1;
            setDragging(true);
        },
        onDragOver: (e)=>{
            if (!isFileDrag(e) || !activeChat) return;
            e.preventDefault(); // required for the drop event to fire
            e.dataTransfer.dropEffect = "copy";
        },
        onDragLeave: (e)=>{
            if (!isFileDrag(e) || !activeChat) return;
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) setDragging(false);
        },
        onDrop: (e)=>{
            if (!isFileDrag(e) || !activeChat) return;
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
    const selfName = selfId && state.devices[selfId]?.name || state.self?.name;
    return(// App chrome, not a document: no text selection or iOS callouts anywhere except text fields.
    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ...dropHandlers,
        className: "relative flex h-dvh bg-background select-none [-webkit-touch-callout:none] [-webkit-user-select:none]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$sidebar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Sidebar"], {
                hidden: !!activeChat,
                children: ({ compact, pinned, togglePinned })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$chat$2d$list$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ChatList"], {
                        chats: chats,
                        activeId: activeChat?.id,
                        selfName: selfName,
                        connection: state.connection,
                        compact: compact,
                        pinned: pinned,
                        onTogglePinned: togglePinned,
                        onOpen: openChat,
                        onRename: ()=>setRenaming(true)
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 525,
                        columnNumber: 11
                    }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 523,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                className: `${activeChat ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`,
                children: activeChat ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$chat$2d$view$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ChatView"], {
                    chat: activeChat,
                    messages: chatMessages,
                    selfId: selfId,
                    nameOf: nameOf,
                    progress: state.progress,
                    urls: urls,
                    composer: {
                        text: drafts[activeChat.id] ?? "",
                        files,
                        replyTo,
                        setText: (text)=>setDrafts((d)=>({
                                    ...d,
                                    [activeChat.id]: text
                                })),
                        removeFile: (index)=>setFiles((current)=>current.filter((_, i)=>i !== index)),
                        chooseFiles,
                        cancelReply: ()=>setReplyTo(undefined),
                        send: ()=>void send()
                    },
                    onBack: ()=>openChat(undefined),
                    onOpenImage: setViewing,
                    onReply: setReplyTo,
                    onLongPress: setSelected
                }, void 0, false, {
                    fileName: "[project]/apps/web/app/landrop.tsx",
                    lineNumber: 540,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-[17px] font-semibold text-foreground",
                            children: "LANDrop"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/landrop.tsx",
                            lineNumber: 564,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "max-w-72 text-[13px]",
                            children: "Pick a chat to start. Everything stays on this Wi-Fi network."
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/landrop.tsx",
                            lineNumber: 565,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/app/landrop.tsx",
                    lineNumber: 563,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 538,
                columnNumber: 7
            }, this),
            state.notice && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                role: "alert",
                className: "fixed bottom-24 left-1/2 z-30 flex w-[min(92vw,28rem)] -translate-x-1/2 items-start justify-between gap-3 rounded-2xl bg-bar px-3 py-2 text-[13px] shadow-lg ring-1 ring-ios-red/40",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: state.notice
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/landrop.tsx",
                        lineNumber: 575,
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
                        lineNumber: 576,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 571,
                columnNumber: 9
            }, this),
            viewing?.attachment && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ImageViewer"], {
                name: viewing.attachment.name,
                url: urls(viewing.id).preview,
                downloadUrl: urls(viewing.id).download,
                onClose: ()=>setViewing(undefined)
            }, void 0, false, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 583,
                columnNumber: 9
            }, this),
            dragging && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "pointer-events-none absolute inset-2 z-40 flex items-center justify-center rounded-3xl border-2 border-dashed border-ios-blue bg-background/85 backdrop-blur-sm",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-col items-center gap-2 text-ios-blue",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PlusIcon"], {}, void 0, false, {
                            fileName: "[project]/apps/web/app/landrop.tsx",
                            lineNumber: 594,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-[17px] font-semibold",
                            children: "Drop to attach"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/landrop.tsx",
                            lineNumber: 595,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-[13px] text-muted",
                            children: [
                                "Any size. Over ",
                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatBytes"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MAX_ATTACHMENT_BYTES"]),
                                " is shared live from this device"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/web/app/landrop.tsx",
                            lineNumber: 596,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/app/landrop.tsx",
                    lineNumber: 593,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 592,
                columnNumber: 9
            }, this),
            renaming && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RenameDialog"], {
                current: selfName ?? "",
                onSave: rename,
                onCancel: ()=>setRenaming(false)
            }, void 0, false, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 601,
                columnNumber: 20
            }, this),
            selected && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$app$2f$ui$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MessageSheet"], {
                message: selected,
                saveUrl: urls(selected.id).download,
                // Senders can remove their own messages; the host can moderate the group only (enforced again by the server).
                canRemove: selected.senderId === selfId || state.isHost && selected.chatId === __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["GROUP_CHAT_ID"],
                onReply: ()=>{
                    setReplyTo(selected);
                    setSelected(undefined);
                },
                onRemove: ()=>removeMessage(selected),
                onClose: ()=>setSelected(undefined)
            }, void 0, false, {
                fileName: "[project]/apps/web/app/landrop.tsx",
                lineNumber: 604,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/app/landrop.tsx",
        lineNumber: 518,
        columnNumber: 5
    }, this));
}
/** One-line description of a message for the chat list. */ function messagePreview(m) {
    if (m.text) return m.text.replace(/\s+/g, " ");
    const a = m.attachment;
    const kind = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["previewKind"])(a);
    return kind === "image" ? "📷 Photo" : kind === "video" ? "🎥 Video" : `📄 ${a.name}`;
}
/** "last seen today at 3:20 PM", "last seen yesterday at …", or a date, like WhatsApp. */ function formatLastSeen(at) {
    const date = new Date(at);
    const time = date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
    });
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return `last seen today at ${time}`;
    if (date.toDateString() === yesterday.toDateString()) return `last seen yesterday at ${time}`;
    return `last seen ${date.toLocaleDateString([], {
        day: "numeric",
        month: "short"
    })} at ${time}`;
}
function loadReadState() {
    try {
        return JSON.parse(localStorage.getItem(READ_KEY) ?? "null");
    } catch  {
        return null;
    }
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
"[project]/apps/web/app/sidebar.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RAIL_WIDTH",
    ()=>RAIL_WIDTH,
    "Sidebar",
    ()=>Sidebar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
;
const SIDEBAR_KEY = "landrop.sidebar";
const MIN_WIDTH = 280;
const MAX_WIDTH = 560;
const DEFAULT_WIDTH = 360;
const RAIL_WIDTH = 80;
const DEFAULT_LAYOUT = {
    pinned: true,
    width: DEFAULT_WIDTH
};
const clampWidth = (width)=>Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width)));
// The layout lives in localStorage, read through useSyncExternalStore so the server render
// (which can't see it) and the first client render agree, then the saved layout takes over.
let layout;
const listeners = new Set();
function readLayout() {
    if (layout) return layout;
    try {
        const stored = JSON.parse(localStorage.getItem(SIDEBAR_KEY) ?? "null");
        layout = {
            pinned: typeof stored?.pinned === "boolean" ? stored.pinned : DEFAULT_LAYOUT.pinned,
            width: typeof stored?.width === "number" ? clampWidth(stored.width) : DEFAULT_LAYOUT.width
        };
    } catch  {
        layout = DEFAULT_LAYOUT;
    }
    return layout;
}
function setLayout(next, persist = true) {
    layout = next;
    if (persist) {
        try {
            localStorage.setItem(SIDEBAR_KEY, JSON.stringify(next));
        } catch  {
        // Private browsing: the layout still applies until reload.
        }
    }
    listeners.forEach((listener)=>listener());
}
function subscribe(listener) {
    listeners.add(listener);
    return ()=>listeners.delete(listener);
}
function Sidebar({ hidden, children }) {
    const { pinned, width } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSyncExternalStore"])(subscribe, readLayout, ()=>DEFAULT_LAYOUT);
    const [peeking, setPeeking] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const asideRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const resizing = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    const open = pinned || peeking;
    function togglePinned() {
        setLayout({
            pinned: !pinned,
            width
        });
        // Unpinning with the pointer on the list would otherwise leave it open until the pointer moves.
        setPeeking(false);
    }
    function resizeTo(next, persist) {
        setLayout({
            pinned,
            width: clampWidth(next)
        }, persist);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
        ref: asideRef,
        style: {
            "--list-w": `${width}px`,
            "--rail-w": `${RAIL_WIDTH}px`
        },
        className: `${hidden ? "hidden md:flex" : "flex"} relative w-full flex-col md:shrink-0 ${pinned ? "md:w-(--list-w)" : "md:w-(--rail-w)"}`,
        onMouseEnter: ()=>setPeeking(true),
        onMouseLeave: ()=>!resizing.current && setPeeking(false),
        // Keyboard users open the collapsed list by tabbing into it.
        onFocus: ()=>setPeeking(true),
        onBlur: (e)=>{
            if (!asideRef.current?.contains(e.relatedTarget) && !asideRef.current?.matches(":hover")) {
                setPeeking(false);
            }
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: `flex min-h-0 flex-1 flex-col bg-background md:border-r md:border-separator ${pinned ? "" : `md:absolute md:inset-y-0 md:left-0 md:z-30 md:overflow-hidden md:transition-[width] md:duration-200 ${peeking ? "md:w-(--list-w) md:shadow-2xl" : "md:w-(--rail-w)"}`}`,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex min-h-0 flex-1 flex-col md:w-(--list-w)",
                    children: children({
                        compact: !open,
                        pinned,
                        togglePinned
                    })
                }, void 0, false, {
                    fileName: "[project]/apps/web/app/sidebar.tsx",
                    lineNumber: 112,
                    columnNumber: 9
                }, this),
                open && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    role: "separator",
                    "aria-orientation": "vertical",
                    "aria-label": "Resize chat list",
                    "aria-valuemin": MIN_WIDTH,
                    "aria-valuemax": MAX_WIDTH,
                    "aria-valuenow": width,
                    tabIndex: 0,
                    title: "Drag to resize · double-click to reset",
                    className: "absolute inset-y-0 right-0 z-10 hidden w-1.5 translate-x-1/2 cursor-col-resize outline-none hover:bg-ios-blue/40 focus-visible:bg-ios-blue/60 md:block",
                    onPointerDown: (e)=>{
                        e.preventDefault();
                        e.currentTarget.setPointerCapture(e.pointerId);
                        resizing.current = true;
                    },
                    onPointerMove: (e)=>{
                        if (!resizing.current) return;
                        const left = asideRef.current?.getBoundingClientRect().left ?? 0;
                        resizeTo(e.clientX - left, false);
                    },
                    onPointerUp: ()=>{
                        if (!resizing.current) return;
                        resizing.current = false;
                        resizeTo(width, true);
                        if (!asideRef.current?.matches(":hover")) setPeeking(false);
                    },
                    onDoubleClick: ()=>resizeTo(DEFAULT_WIDTH, true),
                    onKeyDown: (e)=>{
                        const step = e.key === "ArrowLeft" ? -16 : e.key === "ArrowRight" ? 16 : 0;
                        if (!step) return;
                        e.preventDefault();
                        resizeTo(width + step, true);
                    }
                }, void 0, false, {
                    fileName: "[project]/apps/web/app/sidebar.tsx",
                    lineNumber: 116,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/web/app/sidebar.tsx",
            lineNumber: 102,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/web/app/sidebar.tsx",
        lineNumber: 86,
        columnNumber: 5
    }, this);
}
}),
"[project]/apps/web/app/sparkle-field.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SparkleField",
    ()=>SparkleField
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
;
/** Roughly one dot per this many square pixels. */ const AREA_PER_DOT = 90;
const MAX_DOTS = 700;
function SparkleField() {
    const canvasRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
        // Dots take the bubble's text colour, so they suit both sent and received bubbles.
        const color = getComputedStyle(canvas).color;
        let dots = [];
        let width = 0;
        let height = 0;
        let frame = 0;
        let visible = true;
        const resize = ()=>{
            const dpr = devicePixelRatio || 1;
            width = canvas.clientWidth;
            height = canvas.clientHeight;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const count = Math.min(MAX_DOTS, Math.round(width * height / AREA_PER_DOT));
            dots = Array.from({
                length: count
            }, ()=>({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.25,
                    vy: (Math.random() - 0.5) * 0.25,
                    r: 0.5 + Math.random() * 0.9,
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.002 + Math.random() * 0.004
                }));
            if (still) draw(0);
        };
        const draw = (now)=>{
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = color;
            for (const d of dots){
                if (!still) {
                    d.x = (d.x + d.vx + width) % width;
                    d.y = (d.y + d.vy + height) % height;
                }
                ctx.globalAlpha = still ? 0.5 : 0.15 + 0.6 * Math.abs(Math.sin(now * d.speed + d.phase));
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
                ctx.fill();
            }
        };
        const loop = (now)=>{
            draw(now);
            if (visible) frame = requestAnimationFrame(loop);
        };
        resize();
        const resizer = new ResizeObserver(resize);
        resizer.observe(canvas);
        // Only animate while on screen; a long chat may hold many live files.
        const observer = new IntersectionObserver(([entry])=>{
            visible = entry.isIntersecting;
            cancelAnimationFrame(frame);
            if (visible && !still) frame = requestAnimationFrame(loop);
        });
        observer.observe(canvas);
        return ()=>{
            cancelAnimationFrame(frame);
            resizer.disconnect();
            observer.disconnect();
        };
    }, []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("canvas", {
        ref: canvasRef,
        "aria-hidden": true,
        className: "pointer-events-none absolute inset-0 size-full rounded-[inherit]"
    }, void 0, false, {
        fileName: "[project]/apps/web/app/sparkle-field.tsx",
        lineNumber: 96,
        columnNumber: 5
    }, this);
}
}),
"[project]/apps/web/app/ui.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ACTION_CLASS",
    ()=>ACTION_CLASS,
    "ArrowUpIcon",
    ()=>ArrowUpIcon,
    "Avatar",
    ()=>Avatar,
    "BackIcon",
    ()=>BackIcon,
    "CopyButton",
    ()=>CopyButton,
    "FileIcon",
    ()=>FileIcon,
    "GroupIcon",
    ()=>GroupIcon,
    "ImageViewer",
    ()=>ImageViewer,
    "MessageSheet",
    ()=>MessageSheet,
    "PlusIcon",
    ()=>PlusIcon,
    "RenameDialog",
    ()=>RenameDialog,
    "ReplyIcon",
    ()=>ReplyIcon,
    "SaveIcon",
    ()=>SaveIcon,
    "SidebarIcon",
    ()=>SidebarIcon,
    "UploadProgress",
    ()=>UploadProgress,
    "copyText",
    ()=>copyText,
    "formatBytes",
    ()=>formatBytes,
    "formatDay",
    ()=>formatDay,
    "formatDuration",
    ()=>formatDuration,
    "linkify",
    ()=>linkify,
    "truncateLongText",
    ()=>truncateLongText
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/protocol/src/index.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
function ImageViewer({ name, url, downloadUrl, onClose }) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const onKey = (e)=>e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return ()=>window.removeEventListener("keydown", onKey);
    }, [
        onClose
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        role: "dialog",
        "aria-modal": "true",
        "aria-label": name,
        className: "fixed inset-0 z-50 flex flex-col bg-black",
        onClick: onClose,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] text-white",
                onClick: (e)=>e.stopPropagation(),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: onClose,
                        className: "text-[17px] text-ios-blue",
                        autoFocus: true,
                        children: "Done"
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/ui.tsx",
                        lineNumber: 35,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "min-w-0 truncate text-[15px] font-semibold",
                        children: name
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/ui.tsx",
                        lineNumber: 38,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                        href: downloadUrl,
                        download: name,
                        className: "text-ios-blue",
                        "aria-label": `Save ${name}`,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SaveIcon, {}, void 0, false, {
                            fileName: "[project]/apps/web/app/ui.tsx",
                            lineNumber: 40,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/ui.tsx",
                        lineNumber: 39,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/app/ui.tsx",
                lineNumber: 31,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                src: url,
                alt: name,
                className: "min-h-0 flex-1 object-contain pb-[env(safe-area-inset-bottom)]"
            }, void 0, false, {
                fileName: "[project]/apps/web/app/ui.tsx",
                lineNumber: 44,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/app/ui.tsx",
        lineNumber: 24,
        columnNumber: 5
    }, this);
}
function RenameDialog({ current, onSave, onCancel }) {
    const [name, setName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(current);
    const trimmed = name.trim();
    const canSave = trimmed.length > 0 && trimmed !== current;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const onKey = (e)=>e.key === "Escape" && onCancel();
        window.addEventListener("keydown", onKey);
        return ()=>window.removeEventListener("keydown", onKey);
    }, [
        onCancel
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-10",
        onClick: onCancel,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "rename-title",
            className: "w-full max-w-[270px] overflow-hidden rounded-[14px] bg-bar/95 text-center backdrop-blur-xl",
            onClick: (e)=>e.stopPropagation(),
            onSubmit: (e)=>{
                e.preventDefault();
                if (canSave) onSave(trimmed);
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "px-4 pb-4 pt-5",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            id: "rename-title",
                            className: "text-[17px] font-semibold",
                            children: "Your name"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/ui.tsx",
                            lineNumber: 81,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mt-0.5 text-[13px] text-muted",
                            children: "This is how everyone in the chat sees you."
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/ui.tsx",
                            lineNumber: 84,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            value: name,
                            onChange: (e)=>setName(e.target.value),
                            onFocus: (e)=>e.target.select(),
                            maxLength: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MAX_DEVICE_NAME_LENGTH"],
                            autoFocus: true,
                            enterKeyHint: "done",
                            "aria-label": "Your name",
                            className: "mt-3 w-full rounded-[8px] border border-separator bg-background px-2.5 py-1.5 text-[16px] outline-none select-text [-webkit-user-select:text] focus:border-ios-blue"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/ui.tsx",
                            lineNumber: 85,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/app/ui.tsx",
                    lineNumber: 80,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-2 border-t border-separator text-[17px]",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            onClick: onCancel,
                            className: "border-r border-separator py-2.5 text-ios-blue",
                            children: "Cancel"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/ui.tsx",
                            lineNumber: 97,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "submit",
                            disabled: !canSave,
                            className: "py-2.5 font-semibold text-ios-blue disabled:opacity-35",
                            children: "Save"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/ui.tsx",
                            lineNumber: 100,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/app/ui.tsx",
                    lineNumber: 96,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/web/app/ui.tsx",
            lineNumber: 69,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/web/app/ui.tsx",
        lineNumber: 68,
        columnNumber: 5
    }, this);
}
function MessageSheet({ message, saveUrl, canRemove, onReply, onRemove, onClose }) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const onKey = (e)=>e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return ()=>window.removeEventListener("keydown", onKey);
    }, [
        onClose
    ]);
    const a = message.attachment;
    const item = "block w-full border-t border-separator py-4 text-center text-[20px] first:border-t-0";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 z-50 flex items-end justify-center bg-black/40",
        onClick: onClose,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            role: "dialog",
            "aria-modal": "true",
            "aria-label": "Message actions",
            className: "mb-[max(0.5rem,env(safe-area-inset-bottom))] flex w-full max-w-md flex-col gap-2 px-2",
            onClick: (e)=>e.stopPropagation(),
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "overflow-hidden rounded-[14px] bg-bar/95 backdrop-blur-xl",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: onReply,
                            className: `${item} text-ios-blue`,
                            children: "Reply"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/ui.tsx",
                            lineNumber: 142,
                            columnNumber: 11
                        }, this),
                        message.text && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>{
                                copyText(message.text);
                                onClose();
                            },
                            className: `${item} text-ios-blue`,
                            children: "Copy"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/ui.tsx",
                            lineNumber: 146,
                            columnNumber: 13
                        }, this),
                        a && (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$protocol$2f$src$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isAvailable"])(a) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                            href: saveUrl,
                            download: a.name,
                            onClick: onClose,
                            className: `${item} text-ios-blue`,
                            children: "Save"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/ui.tsx",
                            lineNumber: 157,
                            columnNumber: 13
                        }, this),
                        canRemove && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: onRemove,
                            className: `${item} text-ios-red`,
                            children: "Remove for everyone"
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/ui.tsx",
                            lineNumber: 162,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/app/ui.tsx",
                    lineNumber: 141,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    onClick: onClose,
                    className: "w-full rounded-[14px] bg-bar py-4 text-[20px] font-semibold text-ios-blue",
                    autoFocus: true,
                    children: "Cancel"
                }, void 0, false, {
                    fileName: "[project]/apps/web/app/ui.tsx",
                    lineNumber: 167,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/web/app/ui.tsx",
            lineNumber: 134,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/web/app/ui.tsx",
        lineNumber: 133,
        columnNumber: 5
    }, this);
}
const ACTION_CLASS = "flex size-7 items-center justify-center rounded-full text-muted hover:bg-bubble-other hover:text-foreground";
function CopyButton({ text }) {
    const [copied, setCopied] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        className: ACTION_CLASS,
        "aria-label": copied ? "Copied" : "Copy message",
        title: copied ? "Copied" : "Copy",
        onClick: ()=>{
            if (!copyText(text)) return;
            setCopied(true);
            setTimeout(()=>setCopied(false), 1500);
        },
        children: copied ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CheckIcon, {}, void 0, false, {
            fileName: "[project]/apps/web/app/ui.tsx",
            lineNumber: 191,
            columnNumber: 17
        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CopyIcon, {}, void 0, false, {
            fileName: "[project]/apps/web/app/ui.tsx",
            lineNumber: 191,
            columnNumber: 33
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/web/app/ui.tsx",
        lineNumber: 181,
        columnNumber: 5
    }, this);
}
const iconProps = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true
};
const CopyIcon = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        ...iconProps,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: "9",
                y: "9",
                width: "13",
                height: "13",
                rx: "2"
            }, void 0, false, {
                fileName: "[project]/apps/web/app/ui.tsx",
                lineNumber: 210,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
            }, void 0, false, {
                fileName: "[project]/apps/web/app/ui.tsx",
                lineNumber: 211,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/app/ui.tsx",
        lineNumber: 209,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
const CheckIcon = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        ...iconProps,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            d: "M20 6 9 17l-5-5"
        }, void 0, false, {
            fileName: "[project]/apps/web/app/ui.tsx",
            lineNumber: 217,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/apps/web/app/ui.tsx",
        lineNumber: 216,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
const SaveIcon = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        ...iconProps,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
            }, void 0, false, {
                fileName: "[project]/apps/web/app/ui.tsx",
                lineNumber: 223,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "m7 10 5 5 5-5"
            }, void 0, false, {
                fileName: "[project]/apps/web/app/ui.tsx",
                lineNumber: 224,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M12 15V3"
            }, void 0, false, {
                fileName: "[project]/apps/web/app/ui.tsx",
                lineNumber: 225,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/app/ui.tsx",
        lineNumber: 222,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
function copyText(text) {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    field.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    field.remove();
    return ok;
}
function UploadProgress({ size, progress, own }) {
    const done = progress?.bytesReceived ?? 0;
    const fraction = size > 0 ? done / size : 0;
    const remaining = progress && progress.bytesPerSecond > 0 ? (size - done) / progress.bytesPerSecond : undefined;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col gap-1",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                role: "progressbar",
                "aria-valuemin": 0,
                "aria-valuemax": 100,
                "aria-valuenow": Math.round(fraction * 100),
                className: `h-1 overflow-hidden rounded-full ${own ? "bg-white/30" : "bg-separator"}`,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: `h-full transition-[width] ${own ? "bg-white" : "bg-ios-blue"}`,
                    style: {
                        width: `${fraction * 100}%`
                    }
                }, void 0, false, {
                    fileName: "[project]/apps/web/app/ui.tsx",
                    lineNumber: 260,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/app/ui.tsx",
                lineNumber: 253,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: `text-[12px] tabular-nums ${own ? "text-white/75" : "text-muted"}`,
                children: done >= size && size > 0 ? "Verifying…" : `${Math.floor(fraction * 100)}%${progress ? ` · ${formatBytes(progress.bytesPerSecond)}/s` : ""}${remaining !== undefined ? ` · ${formatDuration(remaining)} left` : ""}`
            }, void 0, false, {
                fileName: "[project]/apps/web/app/ui.tsx",
                lineNumber: 265,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/app/ui.tsx",
        lineNumber: 252,
        columnNumber: 5
    }, this);
}
const AVATAR_SIZES = {
    list: "size-12 text-[17px]",
    large: "size-8 text-[12px] ring-2 ring-bar",
    small: "size-7 text-[11px]"
};
function Avatar({ name, size = "large" }) {
    const initials = name.split(/\s+/).filter((w)=>!/^(on|the)$/i.test(w)).slice(0, 2).map((w)=>w[0]?.toUpperCase()).join("");
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: `flex items-center justify-center rounded-full bg-linear-to-b from-[#a5abb8] to-[#858994] font-semibold text-white ${AVATAR_SIZES[size]}`,
        children: initials || "?"
    }, void 0, false, {
        fileName: "[project]/apps/web/app/ui.tsx",
        lineNumber: 290,
        columnNumber: 5
    }, this);
}
const ReplyIcon = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        ...iconProps,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "m9 17-5-5 5-5"
            }, void 0, false, {
                fileName: "[project]/apps/web/app/ui.tsx",
                lineNumber: 302,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M20 18v-2a4 4 0 0 0-4-4H4"
            }, void 0, false, {
                fileName: "[project]/apps/web/app/ui.tsx",
                lineNumber: 303,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/app/ui.tsx",
        lineNumber: 301,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
const GroupIcon = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        ...iconProps,
        width: 20,
        height: 20,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
            }, void 0, false, {
                fileName: "[project]/apps/web/app/ui.tsx",
                lineNumber: 309,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: "9",
                cy: "7",
                r: "4"
            }, void 0, false, {
                fileName: "[project]/apps/web/app/ui.tsx",
                lineNumber: 310,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M22 21v-2a4 4 0 0 0-3-3.87"
            }, void 0, false, {
                fileName: "[project]/apps/web/app/ui.tsx",
                lineNumber: 311,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M16 3.13a4 4 0 0 1 0 7.75"
            }, void 0, false, {
                fileName: "[project]/apps/web/app/ui.tsx",
                lineNumber: 312,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/app/ui.tsx",
        lineNumber: 308,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
const BackIcon = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        ...iconProps,
        width: 24,
        height: 24,
        strokeWidth: 2.5,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            d: "m15 18-6-6 6-6"
        }, void 0, false, {
            fileName: "[project]/apps/web/app/ui.tsx",
            lineNumber: 318,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/apps/web/app/ui.tsx",
        lineNumber: 317,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
const SidebarIcon = ({ pinned })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        ...iconProps,
        width: 22,
        height: 22,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: "3",
                y: "4",
                width: "18",
                height: "16",
                rx: "2"
            }, void 0, false, {
                fileName: "[project]/apps/web/app/ui.tsx",
                lineNumber: 325,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M9 4v16"
            }, void 0, false, {
                fileName: "[project]/apps/web/app/ui.tsx",
                lineNumber: 326,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            pinned && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M4.5 5.5h3v13h-3z",
                fill: "currentColor",
                stroke: "none"
            }, void 0, false, {
                fileName: "[project]/apps/web/app/ui.tsx",
                lineNumber: 327,
                columnNumber: 16
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/app/ui.tsx",
        lineNumber: 324,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
const PlusIcon = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        ...iconProps,
        width: 18,
        height: 18,
        strokeWidth: 2.5,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            d: "M12 5v14M5 12h14"
        }, void 0, false, {
            fileName: "[project]/apps/web/app/ui.tsx",
            lineNumber: 333,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/apps/web/app/ui.tsx",
        lineNumber: 332,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
const ArrowUpIcon = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        ...iconProps,
        width: 16,
        height: 16,
        strokeWidth: 3,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            d: "M12 19V5M5 12l7-7 7 7"
        }, void 0, false, {
            fileName: "[project]/apps/web/app/ui.tsx",
            lineNumber: 339,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/apps/web/app/ui.tsx",
        lineNumber: 338,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
const FileIcon = ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        ...iconProps,
        width: 20,
        height: 20,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
            }, void 0, false, {
                fileName: "[project]/apps/web/app/ui.tsx",
                lineNumber: 345,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M14 2v6h6"
            }, void 0, false, {
                fileName: "[project]/apps/web/app/ui.tsx",
                lineNumber: 346,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/app/ui.tsx",
        lineNumber: 344,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
const LONG_TEXT_CHARS = 600;
const LONG_TEXT_LINES = 12;
function truncateLongText(text) {
    const lines = text.split("\n");
    if (text.length <= LONG_TEXT_CHARS && lines.length <= LONG_TEXT_LINES) return undefined;
    const head = lines.slice(0, LONG_TEXT_LINES).join("\n").slice(0, LONG_TEXT_CHARS);
    // Cut at a word boundary so the preview doesn't end mid-word.
    const lastSpace = head.search(/\s\S*$/);
    return (lastSpace > LONG_TEXT_CHARS / 2 ? head.slice(0, lastSpace) : head).trimEnd();
}
function formatDay(at) {
    const date = new Date(at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    if (today.getTime() - at < 7 * 86_400_000) return date.toLocaleDateString([], {
        weekday: "long"
    });
    return date.toLocaleDateString([], {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}
function linkify(text, own) {
    return text.split(/(https?:\/\/[^\s]+)/g).map((part, i)=>i % 2 === 1 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
            href: part,
            target: "_blank",
            rel: "noopener noreferrer",
            className: `underline underline-offset-2 ${own ? "text-white" : "text-ios-blue"}`,
            children: part
        }, i, false, {
            fileName: "[project]/apps/web/app/ui.tsx",
            lineNumber: 378,
            columnNumber: 7
        }, this) : part);
}
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
    "isAvailable",
    ()=>isAvailable,
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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$boolean$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-ssr] (ecmascript) <export * as z .boolean>");
;
const PROTOCOL_VERSION = 6;
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
const isAvailable = (attachment)=>attachment.status === "ready" || attachment.status === "live";
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
            size: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
            mimeType: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().max(255).default("application/octet-stream"),
            /** Streamed from the sender instead of uploaded; the only way to share a file over the upload cap. */ live: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$boolean$3e$__["z"].boolean().default(false)
        }).refine((a)=>a.live || a.size <= MAX_ATTACHMENT_BYTES, "Files over 500 MB are shared live from the sender")
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
        /** New on every page load. Live files belong to the tab that holds them, not to the device. */ tabId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().regex(/^[0-9a-f]{32}$/),
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
    attachmentPreview: (id)=>`${API_PREFIX}/messages/${id}/attachment/preview`,
    streamData: (requestId)=>`${API_PREFIX}/streams/${requestId}`
};
}),
];

//# sourceMappingURL=_1vswex7bneu9k._.js.map