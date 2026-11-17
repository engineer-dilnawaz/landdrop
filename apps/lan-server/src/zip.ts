/**
 * Streams a shared folder as an uncompressed ("stored") zip, built as it's downloaded. Each file's
 * CRC-32 is computed while its bytes stream past and written in a descriptor right after them, so
 * nothing has to be read ahead of time and the download starts at once. Sizes are known up front,
 * so the zip's exact length is too. Zip64 fields are used only where sizes or offsets need them.
 */
import { Readable } from "node:stream";
import { crc32 } from "node:zlib";
import type { FolderFile } from "@landrop/protocol";

const MAX_32 = 0xffffffff;
const MAX_16 = 0xffff;
/** 1 January 1980, the earliest date a zip can hold; folders carry no timestamps. */
const DOS_DATE = 0x0021;
/** UTF-8 names, with the CRC-32 and sizes in a descriptor after each file's data. */
const FLAGS = 0x0808;

/** A little-endian byte writer for headers. */
function bytes(size: number) {
  const buffer = Buffer.alloc(size);
  let at = 0;
  const w = {
    u16: (v: number) => ((at = buffer.writeUInt16LE(v, at)), w),
    u32: (v: number) => ((at = buffer.writeUInt32LE(v >>> 0, at)), w),
    u64: (v: number) => ((at = buffer.writeBigUInt64LE(BigInt(v), at)), w),
    raw: (b: Buffer) => ((at += b.copy(buffer, at)), w),
    done: () => buffer,
  };
  return w;
}

interface Entry {
  name: Buffer;
  size: number;
  offset: number;
  /** 4 GB or more: sizes need zip64 fields. */
  big: boolean;
}

const localLength = (e: Entry) => 30 + e.name.length + (e.big ? 20 : 0);
const descriptorLength = (e: Entry) => (e.big ? 24 : 16);
const centralExtraLength = (e: Entry) => {
  const fields = (e.big ? 16 : 0) + (e.offset >= MAX_32 ? 8 : 0);
  return fields ? 4 + fields : 0;
};

/**
 * The zip of `files`, whose bytes `open` streams back to back in one go: reading a folder of many
 * small files file by file would cost a round trip each. The zip fails if the bytes end early, so a
 * short download is never mistaken for a whole one.
 */
export function zipFolder(files: FolderFile[], open: () => Promise<AsyncIterable<Buffer>>): { size: number; stream: Readable } {
  const entries: Entry[] = [];
  let offset = 0;
  for (const file of files) {
    const entry = { name: Buffer.from(file.path, "utf8"), size: file.size, offset, big: file.size >= MAX_32 };
    entries.push(entry);
    offset += localLength(entry) + entry.size + descriptorLength(entry);
  }
  const centralStart = offset;
  const centralSize = entries.reduce((sum, e) => sum + 46 + e.name.length + centralExtraLength(e), 0);
  const zip64 = entries.length >= MAX_16 || centralStart >= MAX_32 || centralSize >= MAX_32;
  const size = centralStart + centralSize + (zip64 ? 76 : 0) + 22;

  async function* generate() {
    const source = (await open())[Symbol.asyncIterator]();
    let pending: Buffer = Buffer.alloc(0);
    /** The next `length` bytes of the source: one file's worth. */
    async function* take(length: number, path: string) {
      while (length > 0) {
        if (!pending.length) {
          const next = await source.next();
          if (next.done) throw new Error(`${path} ended early`);
          pending = next.value;
        }
        const piece = pending.subarray(0, length);
        pending = pending.subarray(piece.length);
        length -= piece.length;
        yield piece;
      }
    }

    const crcs: number[] = [];
    for (const [i, e] of entries.entries()) {
      const version = e.big || e.offset >= MAX_32 ? 45 : 20;
      const local = bytes(localLength(e))
        .u32(0x04034b50)
        .u16(version)
        .u16(FLAGS)
        .u16(0) // stored, no compression
        .u16(0)
        .u16(DOS_DATE)
        .u32(0) // CRC-32 and sizes follow the data
        .u32(e.big ? MAX_32 : 0)
        .u32(e.big ? MAX_32 : 0)
        .u16(e.name.length)
        .u16(e.big ? 20 : 0)
        .raw(e.name);
      if (e.big) local.u16(0x0001).u16(16).u64(0).u64(0);
      yield local.done();

      let crc = 0;
      for await (const chunk of take(e.size, files[i].path)) {
        crc = crc32(chunk, crc);
        yield chunk;
      }
      crcs.push(crc);
      const descriptor = bytes(descriptorLength(e)).u32(0x08074b50).u32(crc);
      yield (e.big ? descriptor.u64(e.size).u64(e.size) : descriptor.u32(e.size).u32(e.size)).done();
    }

    for (const [i, e] of entries.entries()) {
      const bigOffset = e.offset >= MAX_32;
      const version = e.big || bigOffset ? 45 : 20;
      const central = bytes(46 + e.name.length + centralExtraLength(e))
        .u32(0x02014b50)
        .u16(version)
        .u16(version)
        .u16(FLAGS)
        .u16(0)
        .u16(0)
        .u16(DOS_DATE)
        .u32(crcs[i])
        .u32(e.big ? MAX_32 : e.size)
        .u32(e.big ? MAX_32 : e.size)
        .u16(e.name.length)
        .u16(centralExtraLength(e))
        .u16(0) // comment
        .u16(0) // disk
        .u16(0) // internal attributes
        .u32(0) // external attributes
        .u32(bigOffset ? MAX_32 : e.offset)
        .raw(e.name);
      // Zip64 values appear in a fixed order, only for the fields that overflowed.
      if (centralExtraLength(e)) central.u16(0x0001).u16(centralExtraLength(e) - 4);
      if (e.big) central.u64(e.size).u64(e.size);
      if (bigOffset) central.u64(e.offset);
      yield central.done();
    }

    if (zip64) {
      yield bytes(56)
        .u32(0x06064b50)
        .u64(44)
        .u16(45)
        .u16(45)
        .u32(0)
        .u32(0)
        .u64(entries.length)
        .u64(entries.length)
        .u64(centralSize)
        .u64(centralStart)
        .done();
      yield bytes(20).u32(0x07064b50).u32(0).u64(centralStart + centralSize).u32(1).done();
    }
    yield bytes(22)
      .u32(0x06054b50)
      .u16(0)
      .u16(0)
      .u16(zip64 ? MAX_16 : entries.length)
      .u16(zip64 ? MAX_16 : entries.length)
      .u32(zip64 ? MAX_32 : centralSize)
      .u32(zip64 ? MAX_32 : centralStart)
      .u16(0)
      .done();
  }

  return { size, stream: Readable.from(generate(), { objectMode: false }) };
}
