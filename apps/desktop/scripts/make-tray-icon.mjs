// Draws the menu bar icon: a drop, black on transparent. macOS recolours "Template" images to suit
// light and dark menu bars. Run once; the PNGs are kept in assets/.
import { writeFileSync } from "node:fs";
import { crc32, deflateSync } from "node:zlib";

function inDrop(x, y) {
  const cx = 0.5, cy = 0.62, r = 0.3, tipY = 0.06;
  if (Math.hypot(x - cx, y - cy) <= r) return true;
  // Sides run straight from the tip to where they meet the circle.
  const t = (y - tipY) / (cy - tipY);
  return t >= 0 && t <= 1 && Math.abs(x - cx) <= t * r;
}

function png(size) {
  const rows = [];
  const samples = 4; // supersampling, for smooth edges
  for (let py = 0; py < size; py++) {
    const row = [0]; // filter: none
    for (let px = 0; px < size; px++) {
      let hits = 0;
      for (let sy = 0; sy < samples; sy++)
        for (let sx = 0; sx < samples; sx++)
          if (inDrop((px + (sx + 0.5) / samples) / size, (py + (sy + 0.5) / samples) / size)) hits++;
      row.push(0, 0, 0, Math.round((255 * hits) / samples ** 2));
    }
    rows.push(Buffer.from(row));
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), data])));
    return Buffer.concat([len, Buffer.from(type), data, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync(new URL("../assets/trayTemplate.png", import.meta.url), png(18));
writeFileSync(new URL("../assets/trayTemplate@2x.png", import.meta.url), png(36));
