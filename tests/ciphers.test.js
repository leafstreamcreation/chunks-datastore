require("dotenv/config");
const User = require("../src/models/User.model");
const UserData = require("../src/models/UserData.model");

const addCryptoFunctions = require("../src/routes/middleware/ciphers");
const { ERRORMSG } = require("../src/errors");

const SEPARATOR = process.env.CRED_SEPARATOR;

const crypto = require('node:crypto').webcrypto;

const req = { body: { 
    iv: crypto.getRandomValues(new Uint8Array(process.env.AES_IV_BYTES)), 
    salt: crypto.getRandomValues(new Uint8Array(process.env.PBKDF2_SALT_BYTES)), 
}};
const next = () => {};
addCryptoFunctions(req, null, next);

async function cipherTestKey(credentials, salt) {
    const encodedCreds = new TextEncoder().encode(credentials);
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

async function cipherTestEncrypt(credentials, iv, salt, plaintext) {
  const derivedKey = await cipherTestKey(credentials, salt);
  const encodedPlaintext = new TextEncoder().encode(plaintext);
  return await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: process.env.AES_TAG_LENGTH },
    derivedKey,
    encodedPlaintext,
  );
}

async function cipherTestDecrypt(credentials, iv, salt, ciphertext) {
  const derivedKey = await cipherTestKey(credentials, salt);
  const decryptedContent = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, tagLength: process.env.AES_TAG_LENGTH },
    derivedKey,
    ciphertext,
  );
  return new TextDecoder().decode(decryptedContent);
}

describe("Spec for crypto functions", () => {

    test("inbound request without iv and salt returns unsecure request message", () => {
        const unsecureReq = {};
        const standardRes = { 
            status: jest.fn((s) => standardRes),
            json: jest.fn((j) => standardRes),
        }
        addCryptoFunctions(unsecureReq, standardRes, next);
        expect(standardRes.status).toHaveBeenCalledWith(400);
        expect(standardRes.json).toHaveBeenCalledWith({ message: ERRORMSG.UNSECUREREQUEST });
    });
    
    test("generateEntropy provides an IV and salt", () => {
        const entropy = req.ciphers.generateEntropy();
        expect(entropy).toHaveProperty('iv');
        expect(entropy).toHaveProperty('salt');
        expect(entropy.iv).toBeDefined();
        expect(entropy.salt).toBeDefined();
    });

    test("obscureUserData uses AES GCM", async () => {
        const password = "foo";
        const name = "user2";
        const credentials = name + SEPARATOR + password;

        const userData = ["{}", [], []];
        const plaintext = JSON.stringify(userData);
        
        const entropy = req.ciphers.generateEntropy();
        
        const encrypted = await req.ciphers.obscureUserData(credentials, entropy, plaintext);
        const cipherUInt8 = new Uint8Array(encrypted.buffer);
        
        const decrypted = await cipherTestDecrypt(credentials + process.env.DATA_KEY + process.env.STORAGE_KEY, entropy.iv, entropy.salt, cipherUInt8);

        expect(decrypted).toEqual(plaintext);
    });

    test("obscureUpdateKey uses AES GCM", async () => {
        const password = "foo";
        const name = "user2";
        const credentials = name + SEPARATOR + password;

        const updateKey = 1;
        const plaintext = JSON.stringify(updateKey);
        
        const entropy = req.ciphers.generateEntropy();
        
        const encrypted = await req.ciphers.obscureUpdateKey(credentials, entropy, plaintext);
        const cipherUInt8 = new Uint8Array(encrypted.buffer);

        const decrypted = await cipherTestDecrypt(credentials + process.env.UPDATE_KEY + process.env.STORAGE_KEY, entropy.iv, entropy.salt, cipherUInt8);

        expect(decrypted).toEqual(plaintext);
    });

    test("exportUserData uses AES GCM", async () => {
        const updateKeyPlaintext = "1";
        const userData = ["{}", [], []];
        const userDataPlaintext = JSON.stringify(userData);
        
        const exported = await req.ciphers.exportUserData(updateKeyPlaintext, userDataPlaintext);

        expect(exported).toHaveProperty('iv');
        expect(exported).toHaveProperty('salt');
        expect(exported).toHaveProperty('updateKey');
        expect(exported).toHaveProperty('userData');
        const plaintextUpdateKey = await cipherTestDecrypt(process.env.UPDATE_KEY + process.env.TRANSMISSION_KEY, exported.iv, exported.salt, exported.updateKey);
        expect(plaintextUpdateKey).toEqual(updateKeyPlaintext);
        const plaintextUserData = await cipherTestDecrypt(process.env.DATA_KEY + process.env.TRANSMISSION_KEY, exported.iv, exported.salt, exported.userData);
        expect(plaintextUserData).toEqual(userDataPlaintext);


        const updateKey2Plaintext = "2";
        
        const exported2 = await req.ciphers.exportUserData(updateKey2Plaintext);

        expect(exported).toHaveProperty('iv');
        expect(exported).toHaveProperty('salt');
        expect(exported).toHaveProperty('updateKey');
        expect(exported2).not.toHaveProperty('userData');
        const plaintextUpdateKey2 = await cipherTestDecrypt(process.env.UPDATE_KEY + process.env.TRANSMISSION_KEY, exported2.iv, exported2.salt, exported2.updateKey);
        expect(plaintextUpdateKey2).toEqual(updateKey2Plaintext);

    });

    test("exportMessage uses AES GCM", async () => {
        const message = "message";
        const details = "details";
        
        const exported = await req.ciphers.exportMessage(message, details);

        expect(exported).toHaveProperty('iv');
        expect(exported).toHaveProperty('salt');
        expect(exported).toHaveProperty('message');

        const plaintextMessage = await cipherTestDecrypt(process.env.MESSAGE_KEY + process.env.TRANSMISSION_KEY, exported.iv, exported.salt, exported.message);
        expect(plaintextMessage).toEqual(`${message}: ${details}`);
        
        const exported2 = await req.ciphers.exportMessage(message);

        expect(exported2).toHaveProperty('iv');
        expect(exported2).toHaveProperty('salt');
        expect(exported2).toHaveProperty('message');


        const plaintextMessage2 = await cipherTestDecrypt(process.env.MESSAGE_KEY + process.env.TRANSMISSION_KEY, exported2.iv, exported2.salt, exported2.message);
        expect(plaintextMessage2).toEqual(message);
    });

    test("revealInbound uses AES GCM", async () => {
        const inboundCredentials = "user2" + SEPARATOR + "foo";
        const encryptedInboundCredentials = await cipherTestEncrypt(process.env.CREDENTIAL_KEY + process.env.TRANSMISSION_KEY, req.body.iv, req.body.salt, inboundCredentials);
        
        const decryptedCredentials = await req.ciphers.revealInbound(encryptedInboundCredentials, process.env.CREDENTIAL_KEY);
        expect(decryptedCredentials).toEqual(inboundCredentials);
    });

    test("revealUpdateKey and obscureUpdateKey reverse each other", async () => {
        const password = "foo";
        const name = "user2";
        const credentials = name + SEPARATOR + password;
        const literal = '1';
        const { iv, salt } = req.ciphers.generateEntropy();
        const user = { iv: Buffer.from(iv.buffer), salt: Buffer.from(salt.buffer) };

        user.updateKey = await req.ciphers.obscureUpdateKey(credentials, { iv, salt }, literal);

        const decryptedUpdateKey = await req.ciphers.revealUpdateKey(credentials, user);
        expect(decryptedUpdateKey).toEqual(literal);
    });
    
    test("revealUserData and obscureUserData reverse each other", async () => {
        const x = await require("../src/db");

        const password = "foo";
        const user1Creds = "user1" + SEPARATOR + password;

        const entropy1 = req.ciphers.generateEntropy();
        const emptyDataString = JSON.stringify([]);
        const user1UpdateKey = await req.ciphers.obscureUpdateKey(user1Creds, entropy1, "1");

        const emptyData = await req.ciphers.obscureUserData(user1Creds, entropy1, emptyDataString);
        const newEmptyData = await UserData.create({ data: emptyData });
        const newUser = { credentials: user1Creds, data: newEmptyData._id, iv: Buffer.from(entropy1.iv.buffer), salt: Buffer.from(entropy1.salt.buffer), updateKey: user1UpdateKey };
        const emptyActsUser = await User.create(newUser);

        const later = await User.findById(emptyActsUser._id).exec();
        const emptyId = later.data;
        const { data:laterEmptyData } = await UserData.findById(emptyId).exec();
        await User.findByIdAndDelete(emptyActsUser._id).exec();
        await UserData.findByIdAndDelete(emptyId).exec();
        console.log("iv comp old->new: ", newUser.iv.compare(later.iv));
        console.log("salt comp old->new: ", newUser.salt.compare(later.salt));
        console.log("data comp old->new: ", emptyData.compare(laterEmptyData));
        
        console.log(later, laterEmptyData);

        const emptyActsResult = await req.ciphers.revealUserData(user1Creds, later, laterEmptyData);

        expect(emptyActsResult).toEqual(emptyDataString);
        
        
        const user2Creds = "user2" + SEPARATOR + password;
        const entropy2 = req.ciphers.generateEntropy();
        const startingData = JSON.stringify([ "foo", [], [
            { id: 1, name: "running", history: [{}], group: 0 },
            { id: 2, name: "biking", history: [{}], group: 0 }
        ]]);
        const user2UpdateKey = await req.ciphers.obscureUpdateKey(user2Creds, entropy2, "1");
        
        const data = req.ciphers.obscureUserData(user2Creds, entropy2, startingData);
        const newData = await UserData.create({ data });
        const newUser2 = { credentials: user2Creds, data:newData._id, iv: Buffer.from(entropy2.iv.buffer), salt: Buffer.from(entropy2.salt.buffer), updateKey: user2UpdateKey };
        const user = await User.create(newUser2);

        const after = await User.findById(user._id).exec();
        const id = after.data;
        const { data:afterData } = await UserData.findById(id).exec();
        
        await User.findByIdAndDelete(user._id).exec();
        await UserData.findByIdAndDelete(id).exec();
        x.connections[0].close();

        const result = req.ciphers.revealUserData(user2Creds, after, afterData);


        expect(result).toEqual(startingData);
    });
    
});