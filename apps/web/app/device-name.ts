/**
 * A best guess at what to call a device, from its browser's user agent. Browsers hide the model
 * on purpose (Android Chrome reports "K" instead of the phone, iOS never says which iPhone), so a
 * brand only appears where the browser gives it away. New devices are asked to confirm the name.
 * The browser stays in the name so Safari and Chrome on one Mac aren't mistaken for one device.
 */
export function guessDeviceName(ua: string, maxTouchPoints = 0): string {
  // iPadOS asks for desktop sites, so an iPad reports itself as a Mac with a touch screen.
  const iPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
  const samsungInternet = /SamsungBrowser/.test(ua);
  const brand =
    samsungInternet || /\bSM-[A-Z]\d/.test(ua)
      ? "Samsung Galaxy"
      : /MiuiBrowser|\b(Redmi|POCO|Xiaomi)\b/i.test(ua)
        ? "Xiaomi"
        : /HuaweiBrowser|HUAWEI/.test(ua)
          ? "Huawei"
          : /\bPixel\b/.test(ua)
            ? "Google Pixel"
            : undefined;
  const device = iPad
    ? "iPad"
    : /iPhone/.test(ua)
      ? "iPhone"
      : /Android/.test(ua)
        ? (brand ?? (/Mobile/.test(ua) ? "Android phone" : "Android tablet"))
        : /CrOS/.test(ua)
          ? "Chromebook"
          : /Mac OS X/.test(ua)
            ? "Mac"
            : /Windows/.test(ua)
              ? "Windows PC"
              : /Linux/.test(ua)
                ? "Linux PC"
                : "Device";
  // Samsung Internet's name already says it all; "Samsung Galaxy · Samsung Internet" adds nothing.
  if (samsungInternet) return device;
  // Order matters: Edge, Opera and Samsung Internet all also claim to be Chrome, and Chrome claims Safari.
  const browser = /Edg(e|A|iOS)?\//.test(ua)
    ? "Edge"
    : /OPR\/|OPT\//.test(ua)
      ? "Opera"
      : /Firefox\/|FxiOS/.test(ua)
        ? "Firefox"
        : /Chrome\/|CriOS/.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : undefined;
  return browser ? `${device} · ${browser}` : device;
}
