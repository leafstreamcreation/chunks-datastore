const bcrypt = require("bcryptjs");
const { ERRORMSG } = require("../../errors");

const crypto = require('node:crypto').webcrypto;

async function cipherKey(creds, salt) {
  const encodedCreds = new TextEncoder().encode(creds);
    const baseKey = await crypto.subtle.importKey(
        "raw",
        encodedCreds,
        { name: "PBKDF2" },
        false,
        ["deriveKey"],
    );
    return await crypto.subtle.deriveKey(
    {
        name: "PBKDF2",
        salt,
        iterations: process.env.PBKDF2_ITERATIONS,
        hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
    );
}

async function encrypt(iv, key, text) {
  const plaintext = new TextEncoder().encode(text);
 return await crypto.subtle.encrypt(
  {
    name: "AES-GCM",
    iv,
    tagLength: process.env.AES_TAG_LENGTH,
  },
  key,
  plaintext,
);
}

async function decrypt(iv, key, ciphertext) {
  const decryptedContent = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, tagLength: process.env.AES_TAG_LENGTH },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(decryptedContent);
}

module.exports = (req, res, next) => {
  if (!req.body || !req.body.iv || !req.body.salt) return res.status(400).json({ message: ERRORMSG.UNSECUREREQUEST });

  const credentials = async (creds) => {
    const salt = await bcrypt.genSalt(process.env.BCRYPT_SALT_ROUNDS);
    return bcrypt.hash(creds, salt);
  };
  
  const compare = (pass, hash) => {
    return bcrypt.compare(pass, hash);
  };
  
  const revealInbound = async (field, keyType) => {
    const key = await cipherKey(keyType + process.env.TRANSMISSION_KEY, req.body.salt);
    return await decrypt(req.body.iv, key, field);
  };

  const generateEntropy = () => {
    return { 
      iv: crypto.getRandomValues(new Uint8Array(process.env.AES_IV_BYTES)), 
      salt: crypto.getRandomValues(new Uint8Array(process.env.PBKDF2_SALT_BYTES)), 
    };
  };
  
  const obscureUserData = async (creds, entropy, userData) => {
    const key = await cipherKey(creds + process.env.DATA_KEY + process.env.STORAGE_KEY, entropy.salt);
    return await encrypt(entropy.iv, key, userData);
  };

  const obscureUpdateKey = async (creds, entropy, updateKey) => {
    const key = await cipherKey(creds + process.env.UPDATE_KEY + process.env.STORAGE_KEY, entropy.salt);
    return await encrypt(entropy.iv, key, updateKey);
  };
  
  const revealUpdateKey = async (credentials, user) => {

  };

  const revealUserData = async (credentials, user, data) => {
    //replace with webcrypto

    // const key = `${name}${process.env.APP_SIGNATURE}${user.updateArg}`;
    // const decData = CryptoJS.enc.Base64.parse(user.data).toString(CryptoJS.enc.Utf8);
    // const bytes = CryptoJS.AES.decrypt(decData, key).toString(CryptoJS.enc.Utf8);
    // return (!bytes || bytes === "") ? "" : JSON.parse(bytes);
  };

  const exportUserData = async (updateKey, data) => {
    const exported = generateEntropy();
    const keyForUpdate = await cipherKey(process.env.UPDATE_KEY + process.env.TRANSMISSION_KEY, exported.salt);
    exported.updateKey = await encrypt(exported.iv, keyForUpdate, updateKey);
    if (!data) return exported;
    const keyForData = await cipherKey(process.env.DATA_KEY + process.env.TRANSMISSION_KEY, exported.salt);
    exported.userData = await encrypt(exported.iv, keyForData, data);
    return exported;
  };

  const exportMessage = async (message, details) => {
    const exported = generateEntropy();
    const key = await cipherKey(process.env.MESSAGE_KEY + process.env.TRANSMISSION_KEY, exported.salt);
    const plaintextMessage = details ? message + ': ' + details : message;
    exported.message = await encrypt(exported.iv, key, plaintextMessage);
    return exported
  };

  req.ciphers = { 
    generateEntropy,
    obscureUserData,
    obscureUpdateKey,
    exportUserData,
    exportMessage,
    revealUserData,
    revealUpdateKey,
    revealInbound, 
    credentials, 
    compare,
   };
  next();
};