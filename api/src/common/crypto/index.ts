import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { Config } from "@/config";

/**
 * AES-256-GCM for secrets at rest (Paystack authorization codes). Output is
 * `v1:<iv>:<tag>:<ciphertext>` in base64, so the key can be rotated by bumping the version.
 * Without ENCRYPTION_KEY (local dev) a key is derived from the service name; production
 * refuses to start without one (see main.ts).
 */
const resolveKey = (): Buffer => {
  const raw = Config.encryption.key;
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, "hex");
  return createHash("sha256")
    .update(raw || `${Config.service.name}-dev-only-key`)
    .digest();
};

let cachedKey: Buffer | null = null;
const key = () => (cachedKey ??= resolveKey());

export const encryptSecret = (plain: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
};

export const decryptSecret = (payload: string): string => {
  const [version, iv, tag, data] = payload.split(":");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Unrecognised secret format");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
};

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Unambiguous uppercase code (no 0/O/1/I), e.g. `8K2Q4M`. */
export const randomCode = (length: number): string => {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
};

export const createReference = (prefix: string): string => `${prefix}_${Date.now().toString(36)}${randomCode(6)}`;
