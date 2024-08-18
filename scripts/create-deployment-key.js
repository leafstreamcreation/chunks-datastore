const { subtle } = globalThis.crypto;

async function generateAesKey(length = 256) {
  const key = await subtle.generateKey({
    name: 'AES-GCM',
    length,
  }, true, ['encrypt', 'decrypt']);

  return key;
}

generateAesKey().then(async (cryptoKey) => {
  const keyBytes = await subtle.exportKey("raw", cryptoKey);
  console.log(keyBytes);
});