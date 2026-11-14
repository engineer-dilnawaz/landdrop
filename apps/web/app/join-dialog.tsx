"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { copyText } from "./ui";

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * A QR code other devices scan to join. A page opened by its network address shares that
 * address; one opened as "localhost" on the host asks the server for its network addresses,
 * since "localhost" means nothing to a phone.
 */
export function JoinDialog({
  networkAddresses,
  onClose,
}: {
  /** The host's addresses on its networks, e.g. ["http://192.168.0.102:4545"]. */
  networkAddresses: () => Promise<string[]>;
  onClose: () => void;
}) {
  const [urls, setUrls] = useState<string[]>();
  const [chosen, setChosen] = useState(0);
  const [qr, setQr] = useState<string>();
  const [copied, setCopied] = useState(false);
  const url = urls?.[chosen];

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<string[]> => {
      if (!LOOPBACK.has(location.hostname)) return [location.origin];
      // Keep this page's port, so `next dev` shares its own port rather than the server's.
      const hosts = (await networkAddresses()).map((u) => new URL(u).hostname);
      return hosts.map((host) => `${location.protocol}//${host}${location.port ? `:${location.port}` : ""}`);
    };
    load().then(
      (found) => !cancelled && setUrls(found),
      () => !cancelled && setUrls([]),
    );
    return () => {
      cancelled = true;
    };
  }, [networkAddresses]);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    QRCode.toDataURL(url, { margin: 1, width: 480, errorCorrectionLevel: "M" }).then((data) => !cancelled && setQr(data));
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-title"
        className="w-full max-w-[300px] overflow-hidden rounded-[14px] bg-bar/95 text-center backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center px-5 pb-4 pt-5">
          <h2 id="join-title" className="text-[17px] font-semibold">
            Join LANDrop
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">Scan with a phone camera. It must be on the same Wi-Fi.</p>
          {/* Always dark on white: cameras read QR codes best that way, in light or dark mode. */}
          <div className="mt-4 flex size-60 items-center justify-center rounded-xl bg-white p-2">
            {qr && url ? (
              // eslint-disable-next-line @next/next/no-img-element -- a generated data URL, nothing to optimise
              <img src={qr} alt={`QR code for ${url}`} className="size-full [image-rendering:pixelated]" />
            ) : (
              <p className="text-[13px] text-neutral-500">
                {urls?.length === 0 ? "This computer isn't on a network." : "Making code…"}
              </p>
            )}
          </div>
          {url && (
            <button
              onClick={() => {
                if (copyText(url)) setCopied(true);
              }}
              className="mt-3 rounded-full bg-bubble-other px-3 py-1 font-mono text-[13px]"
              aria-label={`Copy ${url}`}
            >
              {copied ? "Copied" : url.replace(/^https?:\/\//, "")}
            </button>
          )}
          {urls && urls.length > 1 && (
            // A host on several networks (Wi-Fi and Ethernet, say) can be reached by more than one address.
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {urls.map((u, i) => (
                <button
                  key={u}
                  onClick={() => {
                    setChosen(i);
                    setCopied(false);
                  }}
                  aria-pressed={i === chosen}
                  className={`rounded-full px-2.5 py-0.5 text-[12px] ${i === chosen ? "bg-ios-blue text-white" : "text-ios-blue"}`}
                >
                  {new URL(u).hostname}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={onClose} className="w-full border-t border-separator py-2.5 text-[17px] font-semibold text-ios-blue">
          Done
        </button>
      </div>
    </div>
  );
}
