/**
 * Generates an RS256 keypair for local development and prints the base64 values to paste
 * into .env as JWT_PRIVATE_KEY / JWT_PUBLIC_KEY. Writes nothing to disk.
 */
const { generateKeyPairSync } = require("crypto");

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const b64 = (pem) => Buffer.from(pem).toString("base64");
console.log(`JWT_PRIVATE_KEY=${b64(privateKey)}`);
console.log(`JWT_PUBLIC_KEY=${b64(publicKey)}`);
console.log(`ENCRYPTION_KEY=${require("crypto").randomBytes(32).toString("hex")}`);
