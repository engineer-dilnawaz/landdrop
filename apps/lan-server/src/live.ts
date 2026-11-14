import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";
import type { ServerEvent } from "@landrop/protocol";
import { HttpError } from "./chat.js";

/** Identifies one open page: live files live in its memory, so they go when it goes. */
export type TabKey = string;

interface PendingRequest {
  tab: TabKey;
  length: number;
  resolve: (piece: Buffer) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

/** How long the sender's tab has to send a requested piece. */
const RESPONSE_TIMEOUT_MS = 15_000;

/**
 * Live files are never stored on the host. Each piece a viewer needs is requested from the
 * sender's tab, which PUTs exactly those bytes. The piece is taken in full at once rather than
 * at the viewer's pace: a browser allows a page only ~6 connections to one server, and a paused
 * video holding the sender's uploads open would soon leave it unable to answer anyone.
 * A tab that disconnects has `graceMs` to come back (a Wi-Fi blip, not a reload) before its
 * live files are removed from the chat.
 */
export class LiveFiles {
  private readonly owners = new Map<string, TabKey>();
  private readonly pending = new Map<string, PendingRequest>();
  private readonly departures = new Map<TabKey, NodeJS.Timeout>();

  constructor(
    private readonly sendToTab: (tab: TabKey, event: ServerEvent) => boolean,
    private readonly removeLive: (messageId: string) => void,
    private readonly graceMs: number,
  ) {}

  own(messageId: string, tab: TabKey): void {
    this.owners.set(messageId, tab);
  }

  /** Asks the owning tab for bytes [start, end]; resolves with exactly those bytes. Keep pieces small. */
  request(messageId: string, start: number, end: number): Promise<Buffer> {
    const tab = this.owners.get(messageId);
    if (!tab) throw new HttpError(410, "The sender went offline");
    const requestId = randomUUID();
    if (!this.sendToTab(tab, { type: "stream:request", requestId, messageId, start, end })) {
      throw new HttpError(503, "The sender is reconnecting. Try again in a moment.");
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new HttpError(504, "The sender didn't respond"));
      }, RESPONSE_TIMEOUT_MS);
      this.pending.set(requestId, { tab, length: end - start + 1, resolve, reject, timer });
    });
  }

  /** The sender's PUT for a request: reads the piece and hands it to the waiting viewer. */
  async deliver(requestId: string, tab: TabKey, body: Readable, contentLength: number): Promise<void> {
    const request = this.pending.get(requestId);
    if (!request || request.tab !== tab) throw new HttpError(404, "No such stream request");
    if (contentLength !== request.length) throw new HttpError(400, "Body length doesn't match the requested range");
    this.pending.delete(requestId);
    const chunks: Buffer[] = [];
    let received = 0;
    try {
      for await (const chunk of body as AsyncIterable<Buffer>) {
        received += chunk.length;
        if (received > request.length) throw new HttpError(400, "Body exceeds the requested range");
        chunks.push(chunk);
      }
      if (received !== request.length) throw new HttpError(400, "Body ended before the requested range");
    } catch (err) {
      request.reject(new HttpError(503, "The sender stopped sending"));
      throw err instanceof HttpError ? err : new HttpError(400, "Upload interrupted");
    } finally {
      clearTimeout(request.timer);
    }
    request.resolve(Buffer.concat(chunks, received));
  }

  tabConnected(tab: TabKey): void {
    clearTimeout(this.departures.get(tab));
    this.departures.delete(tab);
  }

  tabDisconnected(tab: TabKey): void {
    for (const [id, request] of this.pending) {
      if (request.tab !== tab) continue;
      clearTimeout(request.timer);
      this.pending.delete(id);
      request.reject(new HttpError(503, "The sender disconnected"));
    }
    if (![...this.owners.values()].includes(tab)) return;
    clearTimeout(this.departures.get(tab));
    this.departures.set(
      tab,
      setTimeout(() => {
        this.departures.delete(tab);
        for (const [messageId, owner] of this.owners) {
          if (owner !== tab) continue;
          this.owners.delete(messageId);
          this.removeLive(messageId);
        }
      }, this.graceMs),
    );
  }

  close(): void {
    for (const timer of this.departures.values()) clearTimeout(timer);
    for (const request of this.pending.values()) clearTimeout(request.timer);
  }
}
