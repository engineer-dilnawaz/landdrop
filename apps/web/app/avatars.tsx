/**
 * The avatars a person can pick. Each is a small flat illustration drawn on a 64×64 square; the same
 * markup is shown in the app and turned into the picture other devices see, so they always match.
 * A device that hasn't picked one gets one of these from its id, so nobody is left with just initials.
 */
export const AVATARS = [
  {
    id: "cat",
    label: "Cat",
    markup: `<rect width="64" height="64" fill="#34d399"/><path d="M14 31 12 10l16 10Zm36 0 2-21-16 10Z" fill="#fde68a"/><circle cx="32" cy="37" r="19" fill="#fde68a"/><circle cx="25" cy="35" r="2.6" fill="#1f2937"/><circle cx="39" cy="35" r="2.6" fill="#1f2937"/><path d="M30.4 40h3.2L32 41.9Z" fill="#f472b6"/><path d="M28.5 43.5q3.5 3 7 0" stroke="#1f2937" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  },
  {
    id: "bear",
    label: "Bear",
    markup: `<rect width="64" height="64" fill="#60a5fa"/><circle cx="16" cy="18" r="8" fill="#c08457"/><circle cx="48" cy="18" r="8" fill="#c08457"/><circle cx="32" cy="36" r="20" fill="#c08457"/><ellipse cx="32" cy="42" rx="9" ry="7" fill="#f3dcc0"/><circle cx="25" cy="32" r="2.6" fill="#1f2937"/><circle cx="39" cy="32" r="2.6" fill="#1f2937"/><ellipse cx="32" cy="39.5" rx="3" ry="2.2" fill="#1f2937"/><path d="M32 41.5v2.5" stroke="#1f2937" stroke-width="2" stroke-linecap="round"/>`,
  },
  {
    id: "robot",
    label: "Robot",
    markup: `<rect width="64" height="64" fill="#a78bfa"/><path d="M32 12v8" stroke="#e5e7eb" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="11" r="3.5" fill="#fbbf24"/><rect x="13" y="20" width="38" height="32" rx="10" fill="#e5e7eb"/><rect x="20" y="30" width="8" height="8" rx="2" fill="#4f46e5"/><rect x="36" y="30" width="8" height="8" rx="2" fill="#4f46e5"/><rect x="24" y="43" width="16" height="3.5" rx="1.75" fill="#6b7280"/>`,
  },
  {
    id: "ghost",
    label: "Ghost",
    markup: `<rect width="64" height="64" fill="#fbbf24"/><path d="M15 52V30a17 17 0 0 1 34 0v22l-5.7-5-5.6 5-5.7-5-5.6 5-5.7-5Z" fill="#ffffff"/><circle cx="26" cy="30" r="3" fill="#1f2937"/><circle cx="38" cy="30" r="3" fill="#1f2937"/><ellipse cx="32" cy="38" rx="3" ry="3.6" fill="#1f2937"/><circle cx="21" cy="36" r="2.6" fill="#fda4af" opacity=".8"/><circle cx="43" cy="36" r="2.6" fill="#fda4af" opacity=".8"/>`,
  },
  {
    id: "alien",
    label: "Alien",
    markup: `<rect width="64" height="64" fill="#fb7185"/><path d="M32 10c13 0 19 11 17 22-1.6 9-8 17-17 17s-15.4-8-17-17c-2-11 4-22 17-22Z" fill="#86efac"/><ellipse cx="24" cy="31" rx="5.5" ry="8" transform="rotate(20 24 31)" fill="#1f2937"/><ellipse cx="40" cy="31" rx="5.5" ry="8" transform="rotate(-20 40 31)" fill="#1f2937"/><circle cx="22.5" cy="28.5" r="1.6" fill="#ffffff"/><circle cx="41.5" cy="28.5" r="1.6" fill="#ffffff"/><path d="M28.5 42q3.5 2 7 0" stroke="#1f2937" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  },
  {
    id: "cool",
    label: "Cool",
    markup: `<rect width="64" height="64" fill="#94a3b8"/><circle cx="32" cy="36" r="19" fill="#fcd9b6"/><path d="M13 33c0-12 8-18 19-18s19 6 19 18c-5-7-11-9-19-9s-14 2-19 9Z" fill="#374151"/><rect x="17" y="32" width="14" height="9" rx="4" fill="#111827"/><rect x="33" y="32" width="14" height="9" rx="4" fill="#111827"/><path d="M31 36h2" stroke="#111827" stroke-width="2"/><path d="M26 47q6 5 12 0" stroke="#9a3412" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
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
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = PICTURE_SIZE;
    canvas.getContext("2d")!.drawImage(image, 0, 0, PICTURE_SIZE, PICTURE_SIZE);
    return await new Promise((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't make the picture"))), "image/jpeg", 0.92),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
