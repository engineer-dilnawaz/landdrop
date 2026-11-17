import { DatabaseSync } from "node:sqlite";

export const REPORT_KINDS = ["problem", "idea", "other"] as const;
export const MAX_SCREENSHOTS = 3;
const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;
const SCREENSHOT_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/heic"];

export interface Screenshot {
  name: string;
  type: string;
  data: Uint8Array;
}

export interface Report {
  kind: (typeof REPORT_KINDS)[number];
  summary: string;
  details: string;
  /** Where to reply, if the person wants a reply. */
  contact: string;
  screenshots: Screenshot[];
}

/** What the form sends, checked here because it arrives from a web page. */
export function parseReport(input: unknown): Report | undefined {
  if (!input || typeof input !== "object") return undefined;
  const { kind, summary, details, contact, screenshots = [] } = input as Record<string, unknown>;
  const text = (value: unknown, max: number) => (typeof value === "string" && value.trim().length <= max ? value.trim() : undefined);
  const report = {
    kind: REPORT_KINDS.find((k) => k === kind),
    summary: text(summary, 200),
    details: text(details, 5000),
    contact: text(contact, 200),
  };
  if (!report.kind || !report.summary || report.details === undefined || report.contact === undefined) return undefined;
  if (!Array.isArray(screenshots) || screenshots.length > MAX_SCREENSHOTS) return undefined;
  const images = screenshots.map(parseScreenshot);
  if (images.some((image) => !image)) return undefined;
  return { ...report, screenshots: images } as Report;
}

function parseScreenshot(input: unknown): Screenshot | undefined {
  if (!input || typeof input !== "object") return undefined;
  const { name, type, data } = input as Record<string, unknown>;
  if (typeof name !== "string" || name.length > 255 || typeof type !== "string" || !SCREENSHOT_TYPES.includes(type)) return undefined;
  if (!(data instanceof Uint8Array) || data.byteLength === 0 || data.byteLength > MAX_SCREENSHOT_BYTES) return undefined;
  return { name, type, data };
}

/**
 * Keeps reported problems and ideas on this Mac, for now, until they have somewhere to be sent.
 * Each one records the app and macOS versions it came from, and keeps its screenshots with it.
 */
export function saveReport(dbPath: string, report: Report, about: { appVersion: string; osVersion: string }): void {
  const db = new DatabaseSync(dbPath);
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY,
      created_at INTEGER NOT NULL,
      kind TEXT NOT NULL,
      summary TEXT NOT NULL,
      details TEXT NOT NULL,
      contact TEXT NOT NULL,
      app_version TEXT NOT NULL,
      os_version TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS report_screenshots (
      report_id INTEGER NOT NULL REFERENCES reports (id),
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      data BLOB NOT NULL
    )`);
    db.exec("BEGIN");
    try {
      const { lastInsertRowid } = db
        .prepare("INSERT INTO reports (created_at, kind, summary, details, contact, app_version, os_version) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(Date.now(), report.kind, report.summary, report.details, report.contact, about.appVersion, about.osVersion);
      const addScreenshot = db.prepare("INSERT INTO report_screenshots (report_id, name, type, data) VALUES (?, ?, ?, ?)");
      for (const shot of report.screenshots) addScreenshot.run(lastInsertRowid, shot.name, shot.type, shot.data);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  } finally {
    db.close();
  }
}
