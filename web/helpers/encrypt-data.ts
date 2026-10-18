/**
 * Obfuscation for localStorage-persisted auth state, not cryptographic security (the key is
 * necessarily client-side). It keeps tokens out of plain sight in devtools and storage dumps; the
 * real boundary is the short access-token TTL and single-use refresh rotation.
 */

const APP_KEY = "tranche-web-v1";

function xor(input: string, key: string): string {
  let out = "";
  for (let i = 0; i < input.length; i++) {
    out += String.fromCharCode(input.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return out;
}

export function encryptData<T>(value: T): string {
  const json = JSON.stringify(value);
  const obfuscated = xor(json, APP_KEY);
  return typeof window === "undefined" ? "" : window.btoa(unescape(encodeURIComponent(obfuscated)));
}

export function decryptData<T>(raw: string | null): T | null {
  if (!raw || typeof window === "undefined") return null;
  try {
    const obfuscated = decodeURIComponent(escape(window.atob(raw)));
    const json = xor(obfuscated, APP_KEY);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
