import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const [operation, sourcePath, destinationPath] = process.argv.slice(2);
const keyHex = process.env.BACKUP_ENCRYPTION_KEY;
if (!['encrypt', 'decrypt'].includes(operation) || !sourcePath || !destinationPath) {
  throw new Error('Usage: node backup-crypto.mjs <encrypt|decrypt> <source> <destination>');
}
if (!keyHex || !/^[a-f0-9]{64}$/i.test(keyHex)) {
  throw new Error('BACKUP_ENCRYPTION_KEY must be configured as 64 hexadecimal characters.');
}

const key = Buffer.from(keyHex, 'hex');
const magic = Buffer.from('ITBK0001');
const input = await readFile(sourcePath);

if (operation === 'encrypt') {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(input), cipher.final()]);
  await writeFile(destinationPath, Buffer.concat([magic, iv, cipher.getAuthTag(), ciphertext]), { flag: 'wx' });
} else {
  if (input.length < magic.length + 12 + 16 || !input.subarray(0, magic.length).equals(magic)) {
    throw new Error('Backup is not an InternAtlas encrypted backup.');
  }
  const ivStart = magic.length;
  const tagStart = ivStart + 12;
  const ciphertextStart = tagStart + 16;
  const decipher = createDecipheriv('aes-256-gcm', key, input.subarray(ivStart, tagStart));
  decipher.setAuthTag(input.subarray(tagStart, ciphertextStart));
  const plaintext = Buffer.concat([
    decipher.update(input.subarray(ciphertextStart)),
    decipher.final(),
  ]);
  await writeFile(destinationPath, plaintext, { flag: 'wx' });
}
