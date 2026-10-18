/**
 * Lightweight obfuscation for localStorage-persisted auth state, mirroring
 * the shared encrypt-data pattern. This is not cryptographic
 * security (the key is necessarily client-side) — it just keeps tokens out
 * of plain sight in devtools/localStorage dumps and casual XSS payloads
 * that grep for JSON shapes. The real security boundary is the access
 * token's short TTL and the refresh token's single-use rotation.
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
