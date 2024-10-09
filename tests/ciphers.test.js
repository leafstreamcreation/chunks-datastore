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

        const decrypted = await cipherTestDecrypt(credentials + process.env.DATA_KEY + process.env.STORAGE_KEY, entropy.iv, entropy.salt, encrypted);

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

        const decrypted = await cipherTestDecrypt(credentials + process.env.UPDATE_KEY + process.env.STORAGE_KEY, entropy.iv, entropy.salt, encrypted);

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
        //make plaintext credentials
        const inboundCredentials = "user2" + SEPARATOR + "foo";
        //encrypt with test encrypt function
        const encryptedInboundCredentials = await cipherTestEncrypt(process.env.CREDENTIAL_KEY + process.env.TRANSMISSION_KEY, req.body.iv, req.body.salt, inboundCredentials);
        //decrypt with revealInbound
        const decryptedCredentials = await req.ciphers.revealInbound(encryptedInboundCredentials, process.env.CREDENTIAL_KEY);
        //verify that the decrypted credentials match the plaintext credentials
        expect(decryptedCredentials).toEqual(inboundCredentials);
    });
    
    // test("revealUserData and obscureUserData reverse each other", async () => {
    //     const x = await require("../src/db");

    //     const emptyData = req.ciphers.obscureUserData([], "Test1", 1);
    //     const newEmptyData = await UserData.create({ data: emptyData });
    //     const newUser = { token: "Test1", credentials: "TestPass1", data: newEmptyData._id, updateKey: 1 };
    //     const emptyActsUser = await User.create(newUser);
    //     const later = await User.findById(emptyActsUser._id).exec();
    //     const emptyId = later.data;
    //     const { data:laterEmptyData } = await UserData.findById(emptyId).exec();
    //     const popEmpty = { _id: later._id, credentials: later.credentials, token: later.token, data: laterEmptyData, updateArg: later.updateKey }
    //     const emptyActsResult = req.ciphers.revealUserData("Test1", popEmpty);
    //     await User.findByIdAndDelete(emptyActsUser._id).exec();
    //     await UserData.findByIdAndDelete(emptyId).exec();
    //     expect(emptyActsResult).toEqual([]);
        
        
    //     const startingData = [ "foo", [], [
    //         { id: 1, name: "running", history: [{}], group: 0 },
    //         { id: 2, name: "biking", history: [{}], group: 0 }
    //     ]];
    //     const data = req.ciphers.obscureUserData(startingData, "Test", 1);
    //     const newData = await UserData.create({ data });
    //     const newUser2 = { token: "Test", credentials: "TestPass", data:newData._id, updateKey: 1 };
    //     const user = await User.create(newUser2);
    //     const after = await User.findById(user._id).exec();
    //     const id = after.data;
    //     const { data:afterData } = await UserData.findById(id).exec();
    //     const pop = { _id: after._id, credentials: after.credentials, token: after.token, data: afterData, updateArg: after.updateKey }
    //     const result = req.ciphers.revealUserData("Test", pop);
    //     await User.findByIdAndDelete(user._id).exec();
    //     await UserData.findByIdAndDelete(id).exec();
    //     x.connections[0].close();

    //     expect(result).toEqual(startingData);
    // });
    
    // test("revealUpdateKey and obscureUpdateKey reverse each other", async () => {
    //     const x = await require("../src/db");

    //     const name = "Derek";
    //     const literal = 1;
    //     const { out } = req.ciphers.updateKeyGen(literal, name);
    //     const value = req.ciphers.revealKey(out, name);
    //     expect(value).toBe(1);
    // });
});