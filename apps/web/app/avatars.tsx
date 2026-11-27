/**
 * The avatars a person can pick: twenty flat, friendly animals drawn on a 64×64 square. The same
 * markup is shown in the app and turned into the picture other devices see, so they always match.
 * A device that hasn't picked one gets one of these from its id, so nobody is left with just initials.
 */

const INK = "#27272a";

const bg = (colour: string) => `<rect width="64" height="64" fill="${colour}"/>`;
const head = (colour: string, cy = 37, r = 18) => `<circle cx="32" cy="${cy}" r="${r}" fill="${colour}"/>`;
const eyes = (y = 36, gap = 8.5) =>
  `<circle cx="${32 - gap}" cy="${y}" r="2.7" fill="${INK}"/><circle cx="${32 + gap}" cy="${y}" r="2.7" fill="${INK}"/>` +
  `<circle cx="${32 - gap + 0.9}" cy="${y - 0.9}" r="0.9" fill="#fff"/><circle cx="${32 + gap + 0.9}" cy="${y - 0.9}" r="0.9" fill="#fff"/>`;
const blush = (y = 42, gap = 13.5, colour = "#fb7185") =>
  `<circle cx="${32 - gap}" cy="${y}" r="3" fill="${colour}" opacity=".35"/><circle cx="${32 + gap}" cy="${y}" r="3" fill="${colour}" opacity=".35"/>`;
/** A small "w" mouth under the nose at (32, y). */
const mouth = (y: number) =>
  `<path d="M32 ${y - 2}v2M28.8 ${y}q3.2 3 3.2 0 0 3 3.2 0" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
const nose = (y: number, colour = INK, rx = 3.2, ry = 2.3) => `<ellipse cx="32" cy="${y}" rx="${rx}" ry="${ry}" fill="${colour}"/>`;
const circle = (cx: number, cy: number, r: number, fill: string) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;

export const AVATARS = [
  {
    id: "panda",
    label: "Panda",
    markup:
      bg("#d1fae5") + circle(17, 20, 7, INK) + circle(47, 20, 7, INK) + head("#ffffff", 37, 19) +
      `<ellipse cx="23" cy="35" rx="5.5" ry="7" fill="${INK}" transform="rotate(-20 23 35)"/><ellipse cx="41" cy="35" rx="5.5" ry="7" fill="${INK}" transform="rotate(20 41 35)"/>` +
      circle(23.5, 35, 2.4, "#fff") + circle(40.5, 35, 2.4, "#fff") + circle(24, 35.3, 1.2, INK) + circle(41, 35.3, 1.2, INK) +
      nose(43, INK, 3.4, 2.4) + `<path d="M28.8 46.5q3.2 3 6.4 0" fill="none" stroke="${INK}" stroke-width="1.7" stroke-linecap="round"/>` + blush(44.5, 15, "#fda4af"),
  },
  {
    id: "fox",
    label: "Fox",
    markup:
      bg("#fed7aa") + `<path d="M13 32 14 8l17 14Z" fill="#ea580c"/><path d="M51 32 50 8 33 22Z" fill="#ea580c"/><path d="M17 26l1-11 8 7Z" fill="#431407"/><path d="M47 26l-1-11-8 7Z" fill="#431407"/>` +
      `<path d="M12 36c0-12 9-18 20-18s20 6 20 18c0 10-9 19-20 19S12 46 12 36Z" fill="#f97316"/>` +
      `<path d="M12 38c6 2 12 8 20 8s14-6 20-8c-2 10-10 17-20 17S14 48 12 38Z" fill="#fff"/>` + eyes(34, 9) + nose(44.5, INK, 3, 2.2) + mouth(49),
  },
  {
    id: "cat",
    label: "Cat",
    markup:
      bg("#fde68a") + `<path d="M14 30 12 9l17 9Z" fill="#f59e0b"/><path d="M50 30 52 9 35 18Z" fill="#f59e0b"/><path d="M17 25 16 14l8 4Z" fill="#fda4af"/><path d="M47 25 48 14l-8 4Z" fill="#fda4af"/>` +
      head("#f59e0b") + `<path d="M32 19v5M26.5 20.5l1.2 4M37.5 20.5l-1.2 4" stroke="#b45309" stroke-width="1.8" stroke-linecap="round"/>` +
      `<ellipse cx="32" cy="43" rx="7.5" ry="5.5" fill="#fff7ed"/>` + eyes(36) + `<path d="M30 40.2h4l-2 2.4Z" fill="#f472b6"/>` +
      `<path d="M29.5 44.5q2.5 2.5 2.5 0 0 2.5 2.5 0" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>` +
      `<path d="M21 41h-6M21 44l-5 2M43 41h6M43 44l5 2" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>`,
  },
  {
    id: "deer",
    label: "Deer",
    markup:
      bg("#fef3c7") + `<path d="M23 20 19 7M19.5 11.5 14 9M22 15l-5-1M41 20l4-13M44.5 11.5 50 9M42 15l5-1" stroke="#a16207" stroke-width="2.6" stroke-linecap="round" fill="none"/>` +
      `<ellipse cx="13" cy="29" rx="7" ry="4.5" fill="#c2814b" transform="rotate(-25 13 29)"/><ellipse cx="51" cy="29" rx="7" ry="4.5" fill="#c2814b" transform="rotate(25 51 29)"/>` +
      `<ellipse cx="14" cy="29" rx="4" ry="2.2" fill="#fda4af" transform="rotate(-25 14 29)"/><ellipse cx="50" cy="29" rx="4" ry="2.2" fill="#fda4af" transform="rotate(25 50 29)"/>` +
      `<ellipse cx="32" cy="38" rx="17" ry="19" fill="#c2814b"/>` + circle(26, 26, 1.6, "#fff") + circle(32, 23.5, 1.6, "#fff") + circle(38, 26, 1.6, "#fff") +
      `<ellipse cx="32" cy="47" rx="8" ry="6" fill="#f5deb3"/>` + eyes(37) + nose(45, "#431407") + `<path d="M29 49q3 2.5 6 0" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>`,
  },
  {
    id: "dog",
    label: "Dog",
    markup:
      bg("#bae6fd") + `<ellipse cx="15" cy="34" rx="6.5" ry="12" fill="#a16207" transform="rotate(12 15 34)"/><ellipse cx="49" cy="34" rx="6.5" ry="12" fill="#a16207" transform="rotate(-12 49 34)"/>` +
      head("#e8b36f") + `<ellipse cx="39" cy="32" rx="6" ry="7" fill="#a16207" opacity=".85"/>` +
      `<ellipse cx="32" cy="43.5" rx="9" ry="6.5" fill="#fff7ed"/>` + eyes(35.5) + nose(40.5, INK, 3.6, 2.6) +
      `<path d="M32 43v2.5M27.5 45q4.5 4 4.5 0 0 4 4.5 0" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/><path d="M30 47.5h4v3a2 2 0 0 1-4 0Z" fill="#fb7185"/>`,
  },
  {
    id: "bear",
    label: "Bear",
    markup:
      bg("#bfdbfe") + circle(16, 20, 7.5, "#92400e") + circle(48, 20, 7.5, "#92400e") + circle(16, 20, 4, "#d6a37a") + circle(48, 20, 4, "#d6a37a") +
      head("#b45309") + `<ellipse cx="32" cy="43.5" rx="8.5" ry="6.5" fill="#f3d9b8"/>` + eyes(35.5) + nose(41) + mouth(46),
  },
  {
    id: "rabbit",
    label: "Rabbit",
    markup:
      bg("#fbcfe8") + `<ellipse cx="23" cy="16" rx="5.5" ry="13" fill="#fff" transform="rotate(-6 23 16)"/><ellipse cx="41" cy="16" rx="5.5" ry="13" fill="#fff" transform="rotate(6 41 16)"/>` +
      `<ellipse cx="23" cy="17" rx="2.6" ry="9" fill="#f9a8d4" transform="rotate(-6 23 17)"/><ellipse cx="41" cy="17" rx="2.6" ry="9" fill="#f9a8d4" transform="rotate(6 41 17)"/>` +
      head("#ffffff", 40, 17) + eyes(39, 8) + blush(45, 12.5, "#f9a8d4") + `<path d="M30 43.5h4l-2 2.2Z" fill="#f472b6"/>` + mouth(48.5),
  },
  {
    id: "koala",
    label: "Koala",
    markup:
      bg("#c7d2fe") + circle(14, 26, 10, "#9ca3af") + circle(50, 26, 10, "#9ca3af") + circle(14, 26, 6, "#f4f4f5") + circle(50, 26, 6, "#f4f4f5") +
      head("#a1a1aa", 38, 18) + eyes(35, 9) + `<ellipse cx="32" cy="41" rx="4.5" ry="6.5" fill="#3f3f46"/>` +
      `<path d="M28.5 49q3.5 3 7 0" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`,
  },
  {
    id: "tiger",
    label: "Tiger",
    markup:
      bg("#fde68a") + circle(17, 21, 6.5, "#f97316") + circle(47, 21, 6.5, "#f97316") + circle(17, 21, 3.2, "#fff7ed") + circle(47, 21, 3.2, "#fff7ed") +
      head("#fb923c") + `<path d="M32 19v6M26 20.5l2 5M38 20.5l-2 5M14.5 34l5 1.5M14 40l5 .5M49.5 34l-5 1.5M50 40l-5 .5" stroke="#1f2937" stroke-width="2" stroke-linecap="round"/>` +
      `<ellipse cx="32" cy="43.5" rx="8.5" ry="6" fill="#fff7ed"/>` + eyes(35) + `<path d="M29.5 40.5h5l-2.5 3Z" fill="#fb7185"/>` + mouth(48),
  },
  {
    id: "lion",
    label: "Lion",
    markup:
      bg("#fed7aa") + circle(32, 35, 25, "#b45309") + circle(17, 20, 5, "#fbbf24") + circle(47, 20, 5, "#fbbf24") + head("#fbbf24", 37, 16.5) +
      `<ellipse cx="32" cy="43.5" rx="8" ry="6" fill="#fef3c7"/>` + eyes(35, 7.5) + `<path d="M29.5 40h5l-2.5 3Z" fill="#78350f"/>` + mouth(47.5),
  },
  {
    id: "pig",
    label: "Pig",
    markup:
      bg("#fecdd3") + `<path d="M14 28 12 12l14 6Z" fill="#fb7185"/><path d="M50 28 52 12 38 18Z" fill="#fb7185"/>` + head("#fda4af") +
      `<ellipse cx="32" cy="43" rx="9" ry="6.5" fill="#fb7185"/><ellipse cx="28.5" cy="43" rx="1.6" ry="2.4" fill="#9f1239"/><ellipse cx="35.5" cy="43" rx="1.6" ry="2.4" fill="#9f1239"/>` +
      eyes(33.5, 9) + blush(40, 14.5, "#f43f5e"),
  },
  {
    id: "frog",
    label: "Frog",
    markup:
      bg("#bbf7d0") + `<ellipse cx="32" cy="40" rx="21" ry="17" fill="#4ade80"/>` + circle(21, 24, 8, "#4ade80") + circle(43, 24, 8, "#4ade80") +
      circle(21, 24, 5.5, "#fff") + circle(43, 24, 5.5, "#fff") + circle(21.8, 24.5, 2.8, INK) + circle(43.8, 24.5, 2.8, INK) +
      `<path d="M20 44q12 10 24 0" fill="none" stroke="#166534" stroke-width="2.2" stroke-linecap="round"/>` + circle(29, 37, 1, "#166534") + circle(35, 37, 1, "#166534") + blush(43, 17, "#f43f5e"),
  },
  {
    id: "monkey",
    label: "Monkey",
    markup:
      bg("#fde68a") + circle(13, 36, 7, "#92400e") + circle(51, 36, 7, "#92400e") + circle(13, 36, 4, "#fcd9b6") + circle(51, 36, 4, "#fcd9b6") +
      head("#92400e", 35, 19) + `<path d="M20 36c0-5 5-7 8-5 2 1.5 6 1.5 8 0 3-2 8 0 8 5 0 10-8 16-12 16s-12-6-12-16Z" fill="#fcd9b6"/>` +
      eyes(37, 6.5) + circle(30, 43, 0.9, "#92400e") + circle(34, 43, 0.9, "#92400e") +
      `<path d="M28.5 47q3.5 3 7 0" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`,
  },
  {
    id: "owl",
    label: "Owl",
    markup:
      bg("#ddd6fe") + `<path d="M15 24 13 8l14 8Z" fill="#92400e"/><path d="M49 24 51 8 37 16Z" fill="#92400e"/>` + head("#a16207", 37, 19) +
      circle(23, 34, 9.5, "#fde68a") + circle(41, 34, 9.5, "#fde68a") + circle(23, 34, 6, "#fff") + circle(41, 34, 6, "#fff") +
      circle(24, 34.5, 3.2, INK) + circle(40, 34.5, 3.2, INK) + circle(25, 33.5, 1, "#fff") + circle(41, 33.5, 1, "#fff") +
      `<path d="M29 40h6l-3 6Z" fill="#f97316"/>`,
  },
  {
    id: "penguin",
    label: "Penguin",
    markup:
      bg("#bae6fd") + head(INK, 37, 19) +
      `<path d="M16 38c0-8 6-12 10-12 3 0 4 2 6 2s3-2 6-2c4 0 10 4 10 12 0 9-8 15-16 15s-16-6-16-15Z" fill="#fff"/>` +
      eyes(36, 8) + `<path d="M28.5 41h7l-3.5 5Z" fill="#fb923c"/>` + blush(42.5, 14, "#fda4af"),
  },
  {
    id: "chick",
    label: "Chick",
    markup:
      bg("#fef9c3") + `<path d="M32 18q-3-6 1-8 0 4 4 4-2 2-5 4Z" fill="#facc15"/>` + head("#fde047", 38, 19) + eyes(36, 8) +
      `<path d="M28.5 40.5h7l-3.5 4.5Z" fill="#fb923c"/>` + blush(43, 14, "#fb923c"),
  },
  {
    id: "hamster",
    label: "Hamster",
    markup:
      bg("#fed7aa") + circle(17, 21, 6, "#d6a06a") + circle(47, 21, 6, "#d6a06a") + circle(17, 21, 3.3, "#fda4af") + circle(47, 21, 3.3, "#fda4af") +
      `<ellipse cx="32" cy="38" rx="21" ry="18" fill="#e8b97e"/>` +
      `<path d="M13 42c4-5 9-6 19-6s15 1 19 6c-3 9-10 12-19 12S16 51 13 42Z" fill="#fff7ed"/>` +
      `<path d="M32 20c6 0 10 4 10 8-4-3-6-2-10-2s-6-1-10 2c0-4 4-8 10-8Z" fill="#c98a4b"/>` +
      eyes(35, 8.5) + nose(41, "#f472b6", 2.2, 1.6) + `<path d="M28.8 44.5q3.2 3 6.4 0" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>` +
      `<rect x="30.4" y="46.5" width="3.2" height="3" rx=".8" fill="#fff"/>`,
  },
  {
    id: "elephant",
    label: "Elephant",
    markup:
      bg("#e0e7ff") + circle(13, 33, 11.5, "#a5b4c8") + circle(51, 33, 11.5, "#a5b4c8") + `<circle cx="13" cy="33" r="7" fill="#fda4af" opacity=".6"/><circle cx="51" cy="33" r="7" fill="#fda4af" opacity=".6"/>` +
      head("#b8c4d6", 35, 18) + `<path d="M26 42c0 11 2 15 8 15 3 0 4-3 2-4-3 0-4-2-4-11Z" fill="#b8c4d6"/>` +
      `<path d="M28 47h4M29 51h4" stroke="#8b9bb4" stroke-width="1.2" stroke-linecap="round"/>` + eyes(33, 9),
  },
  {
    id: "wolf",
    label: "Wolf",
    markup:
      bg("#cbd5e1") + `<path d="M14 32 13 8l17 12Z" fill="#64748b"/><path d="M50 32 51 8 34 20Z" fill="#64748b"/><path d="M18 26l-.5-11 8 7Z" fill="#f1f5f9"/><path d="M46 26l.5-11-8 7Z" fill="#f1f5f9"/>` +
      `<path d="M12 36c0-11 9-18 20-18s20 7 20 18c0 11-9 19-20 19S12 47 12 36Z" fill="#94a3b8"/>` +
      `<path d="M32 36c-6 0-12 3-12 9 0 5 5 8 12 8s12-3 12-8c0-6-6-9-12-9Z" fill="#f1f5f9"/>` + eyes(33, 9) + nose(42, INK, 3.4, 2.4) + mouth(47.5),
  },
  {
    id: "raccoon",
    label: "Raccoon",
    markup:
      bg("#e9d5ff") + circle(16, 21, 6.5, "#52525b") + circle(48, 21, 6.5, "#52525b") + circle(16, 21, 3, "#d4d4d8") + circle(48, 21, 3, "#d4d4d8") +
      head("#a1a1aa") + `<path d="M13 34c3-4 8-5 12-3l7 2 7-2c4-2 9-1 12 3-1 6-6 8-11 7l-8-2-8 2c-5 1-10-1-11-7Z" fill="#3f3f46"/>` +
      `<ellipse cx="32" cy="45" rx="8" ry="6" fill="#f4f4f5"/>` +
      circle(23, 35, 2.6, "#fff") + circle(41, 35, 2.6, "#fff") + circle(23.5, 35.2, 1.3, INK) + circle(41.5, 35.2, 1.3, INK) +
      nose(42.5, INK, 3, 2.1) + mouth(47.5),
  },
] as const;

export type AvatarId = (typeof AVATARS)[number]["id"];

/** A device's avatar when it hasn't chosen: one of the set, picked from its id so it stays the same everywhere. */
export function defaultAvatar(seed: string): AvatarId {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATARS[hash % AVATARS.length].id;
}

const markupOf = (id: AvatarId) => AVATARS.find((a) => a.id === id)!.markup;

/** An avatar's artwork, sized by its parent. */
export function AvatarArt({ id, className }: { id: AvatarId; className?: string }) {
  return <svg viewBox="0 0 64 64" aria-hidden className={className} dangerouslySetInnerHTML={{ __html: markupOf(id) }} />;
}

const PICTURE_SIZE = 256;

/** The picture other devices get for a chosen avatar: the artwork as a square JPEG, like any profile photo. */
export async function avatarPicture(id: AvatarId): Promise<Blob> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${PICTURE_SIZE}" height="${PICTURE_SIZE}">${markupOf(id)}</svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return await toJpeg(image, 0, 0, PICTURE_SIZE, PICTURE_SIZE);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** The middle square of a photo, 256px across as a JPEG: small enough to show everywhere instantly. */
/** The square of a photo starting at (sx, sy), `side` pixels wide, as an avatar picture. */
export async function cropPhoto(file: File, sx: number, sy: number, side: number): Promise<Blob> {
  const image = await createImageBitmap(file);
  try {
    return await toJpeg(image, sx, sy, side, side);
  } finally {
    image.close();
  }
}

async function toJpeg(source: CanvasImageSource, sx: number, sy: number, sw: number, sh: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = PICTURE_SIZE;
  const context = canvas.getContext("2d")!;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, sx, sy, sw, sh, 0, 0, PICTURE_SIZE, PICTURE_SIZE);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't make the picture"))), "image/jpeg", 0.9),
  );
}
