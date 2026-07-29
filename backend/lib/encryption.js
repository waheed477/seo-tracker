/**
 * Simple AES-256-CBC encryption/decryption for sensitive data
 * (GSC refresh tokens). Uses the SITE_ENCRYPTION_KEY env var
 * as the 32-byte key.
 *
 * Node.js crypto module is built-in — no extra dependency needed.
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';

/**
 * Get the encryption key from env, padded/truncated to 32 bytes.
 * SITE_ENCRYPTION_KEY must be set in environment.
 */
function getKey() {
  const raw = process.env.SITE_ENCRYPTION_KEY;
  if (!raw) throw new Error('SITE_ENCRYPTION_KEY is not set');
  // Ensure exactly 32 bytes
  return crypto.createHash('sha256').update(raw).digest();
}

/**
 * Encrypt a plaintext string. Returns a base64 string containing
 * IV + ciphertext (IV is prepended for portability).
 */
function encrypt(plaintext) {
  if (!plaintext) return '';
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  // Prepend IV so we can decrypt without storing it separately
  return iv.toString('base64') + ':' + encrypted;
}

/**
 * Decrypt a string encrypted by encrypt(). Returns the original plaintext.
 */
function decrypt(ciphertext) {
  if (!ciphertext) return '';
  const key = getKey();
  const parts = ciphertext.split(':');
  if (parts.length !== 2) throw new Error('Invalid ciphertext format');
  const iv = Buffer.from(parts[0], 'base64');
  const enc = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(enc, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encrypt, decrypt };
